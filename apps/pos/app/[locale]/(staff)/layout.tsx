import { PinGate } from "@/components/PinGate";
import { StaffHeader } from "@/components/StaffHeader";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PinGate>
      <StaffHeader />
      {children}
    </PinGate>
  );
}
