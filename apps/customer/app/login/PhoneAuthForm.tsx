"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";
import { GCC_COUNTRY_CODES, toE164 } from "@/lib/phone";

type Channel = "sms" | "whatsapp";
type Step = "phone" | "otp";

export function PhoneAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phone = toE164(countryCode, localNumber);
    if (!phone) {
      setError("Enter a valid phone number.");
      return;
    }
    setIsSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone,
      options: { channel },
    });
    setIsSubmitting(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setPhoneE164(phone);
    setStep("otp");
    setResendCooldown(60);
  }

  async function resend() {
    if (!phoneE164 || resendCooldown > 0) return;
    setIsSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: phoneE164,
      options: { channel },
    });
    setIsSubmitting(false);
    if (otpError) setError(otpError.message);
    else setResendCooldown(60);
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
    router.push(searchParams.get("next") ?? "/account");
    router.refresh();
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-sm text-charcoal-100">
          Enter the code sent to <span className="text-ember-400">{phoneE164}</span> via{" "}
          {channel === "whatsapp" ? "WhatsApp" : "SMS"}.
        </p>
        <input
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="w-full text-center text-2xl tracking-[0.5em] rounded-xl2 bg-charcoal-800 border border-white/10 py-3 text-white focus:border-ember-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || code.length < 4}>
          {isSubmitting ? "Verifying…" : "Verify & continue"}
        </Button>
        <button
          type="button"
          onClick={resend}
          disabled={resendCooldown > 0 || isSubmitting}
          className="w-full text-sm text-smoke-400 disabled:opacity-50"
        >
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div className="flex gap-2">
        <select
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
        <input
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value)}
          placeholder="5X XXX XXXX"
          className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-4 py-3 text-white focus:border-ember-500 focus:outline-none"
        />
      </div>

      <div className="flex rounded-xl2 border border-white/10 p-1 bg-charcoal-800">
        {(["sms", "whatsapp"] as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`flex-1 rounded-xl py-2 text-sm capitalize transition-colors ${
              channel === c ? "bg-ember-500 text-charcoal-900 font-medium" : "text-smoke-400"
            }`}
          >
            {c === "sms" ? "SMS" : "WhatsApp"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || !localNumber}>
        {isSubmitting ? "Sending…" : `Send code via ${channel === "whatsapp" ? "WhatsApp" : "SMS"}`}
      </Button>
    </form>
  );
}
