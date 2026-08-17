import { Suspense } from "react";
import { DevQuickLogin } from "@bbq/ui";
import { PhoneAuthForm } from "./PhoneAuthForm";

export const metadata = { title: "Terminal login — Smart BBQ POS" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel px-8 py-10 max-w-sm w-full">
        <h1 className="text-2xl font-semibold text-center" style={{ color: "var(--brand-accent)" }}>
          Terminal login
        </h1>
        <p className="text-center text-sm text-smoke-400 mt-1 mb-6">
          Sign in once per shift/device. Staff switch with a PIN after this.
        </p>
        <Suspense>
          <PhoneAuthForm />
        </Suspense>
      </div>
      <DevQuickLogin />
    </main>
  );
}
