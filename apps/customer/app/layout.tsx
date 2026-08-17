import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { getThemeOverrideCss } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Smart BBQ — Order",
  description: "Order grilled-to-perfection BBQ, track delivery, and pre-order ahead.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [themeCss, userResult, maintenanceFlag] = await Promise.all([
    getThemeOverrideCss("customer"),
    supabase.auth.getUser(),
    supabase.from("feature_flags").select("enabled").eq("key", "maintenance_mode").maybeSingle(),
  ]);
  const user = userResult.data.user;
  const isMaintenance = maintenanceFlag.data?.enabled ?? false;

  return (
    <html lang="en" className="dark">
      <head>{themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}</head>
      <body>
        {isMaintenance ? (
          <MaintenanceOverlay />
        ) : (
          <>
            <Header isAuthed={!!user} />
            {children}
            <CartDrawer />
          </>
        )}
      </body>
    </html>
  );
}
