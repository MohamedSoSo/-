"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";

const COUNTRY_CODE = "+966";
type Step = "phone" | "otp";

export function PhoneAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [localNumber, setLocalNumber] = useState("");
  const [code, setCode] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorParam = searchParams.get("error");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const digits = localNumber.replace(/\D/g, "").replace(/^0+/, "");
    if (!/^[0-9]{8,12}$/.test(digits)) {
      setError("Enter a valid phone number.");
      return;
    }
    const phone = `${COUNTRY_CODE}${digits}`;
    setIsSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setIsSubmitting(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setPhoneE164(phone);
    setStep("otp");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneE164) return;
    setError(null);
    setIsSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: phoneE164, token: code, type: "sms" });
    setIsSubmitting(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.push(searchParams.get("next") ?? "/");
    router.refresh();
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-sm text-charcoal-100">
          Enter the code sent to <span className="text-ember-400">{phoneE164}</span>.
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
          {isSubmitting ? "Verifying…" : "Open dashboard"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      {errorParam === "not_management" && (
        <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded-xl2 px-3 py-2">
          That account isn't an owner/developer — Owner BI is restricted to management.
        </p>
      )}
      <div className="flex gap-2">
        <span className="flex items-center rounded-xl2 bg-charcoal-800 border border-white/10 px-3 text-white">
          {COUNTRY_CODE}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoFocus
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value)}
          placeholder="5X XXX XXXX"
          className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-4 py-3 text-white focus:border-ember-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || !localNumber}>
        {isSubmitting ? "Sending…" : "Send code"}
      </Button>
    </form>
  );
}
