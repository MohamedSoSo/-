import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@bbq/types";

export interface ActiveOperator {
  profileId: string;
  displayName: string;
  role: Role;
}

interface PosSessionState {
  operator: ActiveOperator | null;
  activeShiftId: string | null;
  setOperator: (op: ActiveOperator | null) => void;
  setActiveShiftId: (id: string | null) => void;
}

// Operator identity is resolved directly from the authenticated Supabase Auth
// session's own profile (see components/PinGate.tsx) — RLS gates on that same
// session (lib/supabase/middleware.ts). This store just holds the resolved
// identity for receipts and audit attribution UX.
export const usePosSession = create<PosSessionState>()(
  persist(
    (set) => ({
      operator: null,
      activeShiftId: null,
      setOperator: (operator) => set({ operator }),
      setActiveShiftId: (activeShiftId) => set({ activeShiftId }),
    }),
    { name: "bbq-pos-session" }
  )
);
