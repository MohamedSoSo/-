"use client";

import { useEffect } from "react";
import { usePosSession } from "@/lib/pos-session";
import { createClient } from "@/lib/supabase/client";

// PIN entry is fully removed (demo requirement — see chat history for the
// prior PIN-set-up-incomplete issue this replaces). Every staff route already
// requires a real Supabase Auth session (enforced in lib/supabase/middleware.ts),
// so that authenticated session's own profile IS the operator identity used
// for attribution/audit — no PIN step, no PIN modal, no blocking screen.
// children render immediately; resolution happens in the background and
// just fills in the operator name/role once it lands.
export function PinGate({ children }: { children: React.ReactNode }) {
  const operator = usePosSession((s) => s.operator);
  const setOperator = usePosSession((s) => s.setOperator);

  useEffect(() => {
    if (operator) return;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("id, display_name, role").eq("id", user.id).single();
      if (profile) {
        setOperator({ profileId: profile.id, displayName: profile.display_name, role: profile.role });
      }
    })();
  }, [operator, setOperator]);

  return <>{children}</>;
}
