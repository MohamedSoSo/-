"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import type { Locale } from "@bbq/i18n";
import { createClient } from "@/lib/supabase/client";
import { GCC_COUNTRY_CODES, toE164 } from "@/lib/phone";

type Channel = "sms" | "whatsapp";
type Step = "phone" | "otp";

export function PhoneAuthForm() {
  const locale = useLocale() as Locale;
  const t = useTranslations("phoneAuth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const countryCodeId = useId();
  const phoneNumberId = useId();
  const codeInputId = useId();
  const errorId = useId();

  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState<string>(GCC_COUNTRY_CODES[0].code);
  const [localNumber, setLocalNumber] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [code, setCode] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function requestOtp(phone: string): Promise<boolean> {
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, channel }),
    });
    if (response.ok) return true;
    const result: { error?: string } = await response.json().catch(() => ({}));
    setError(
      response.status === 429 || result.error?.includes("RATE_LIMITED")
        ? t("otpRateLimited")
        : (result.error ?? t("invalidPhone"))
    );
    return false;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phone = toE164(countryCode, localNumber);
    if (!phone) {
      setError(t("invalidPhone"));
      return;
    }
    setIsSubmitting(true);
    const ok = await requestOtp(phone);
    setIsSubmitting(false);
    if (!ok) return;
    setPhoneE164(phone);
    setStep("otp");
    setResendCooldown(60);
  }

  async function resend() {
    if (!phoneE164 || resendCooldown > 0) return;
    setIsSubmitting(true);
    const ok = await requestOtp(phoneE164);
    setIsSubmitting(false);
    if (ok) setResendCooldown(60);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneE164) return;
    setError(null);
    setIsSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: code,
      type: "sms",
    });
    setIsSubmitting(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.push(searchParams.get("next") ?? `/${locale}/account`);
    router.refresh();
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-sm text-charcoal-100">
          {t("otpSentTo", {
            phone: phoneE164 ?? "",
            channel: channel === "whatsapp" ? t("whatsapp") : t("sms"),
          })}
        </p>
        <div>
          <label htmlFor={codeInputId} className="sr-only">
            {t("verificationCodeLabel")}
          </label>
          <input
            id={codeInputId}
            inputMode="numeric"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="w-full text-center text-2xl tracking-[0.5em] rounded-xl2 bg-charcoal-800 border border-white/10 py-3 text-white focus:border-ember-500 focus:outline-none"
          />
        </div>
        {error && (
          <p id={errorId} role="alert" aria-live="polite" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || code.length < 4}>
          {isSubmitting ? t("verifying") : t("verifyContinue")}
        </Button>
        <button
          type="button"
          onClick={resend}
          disabled={resendCooldown > 0 || isSubmitting}
          className="w-full text-sm text-smoke-400 disabled:opacity-50"
        >
          {resendCooldown > 0 ? t("resendIn", { seconds: resendCooldown }) : t("resend")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div className="flex gap-2">
        <div>
          <label htmlFor={countryCodeId} className="sr-only">
            {t("countryCodeLabel")}
          </label>
          <select
            id={countryCodeId}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="rounded-xl2 bg-charcoal-800 border border-white/10 px-3 text-white focus:border-ember-500 focus:outline-none"
          >
            {GCC_COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} {c.code}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor={phoneNumberId} className="sr-only">
            {t("phoneNumberLabel")}
          </label>
          <input
            id={phoneNumberId}
            type="tel"
            inputMode="numeric"
            value={localNumber}
            onChange={(e) => setLocalNumber(e.target.value)}
            placeholder="5X XXX XXXX"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-4 py-3 text-white focus:border-ember-500 focus:outline-none"
          />
        </div>
      </div>

      <div role="radiogroup" aria-label={t("channelGroupLabel")} className="flex rounded-xl2 border border-white/10 p-1 bg-charcoal-800">
        {(["sms", "whatsapp"] as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={channel === c}
            onClick={() => setChannel(c)}
            className={`flex-1 rounded-xl py-2 text-sm transition-colors ${
              channel === c ? "bg-ember-500 text-charcoal-900 font-medium" : "text-smoke-400"
            }`}
          >
            {c === "sms" ? t("sms") : t("whatsapp")}
          </button>
        ))}
      </div>

      {error && (
        <p id={errorId} role="alert" aria-live="polite" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || !localNumber}>
        {isSubmitting ? t("sending") : t("sendCode", { channel: channel === "whatsapp" ? t("whatsapp") : t("sms") })}
      </Button>
    </form>
  );
}
