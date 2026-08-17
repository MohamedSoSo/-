import type { Metadata } from "next";
import "./globals.css";
import { getThemeOverrideCss } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Smart BBQ — Owner BI",
  description: "Strategic management and analytics hub.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const themeCss = await getThemeOverrideCss("bi");

  return (
    <html lang="en" className="dark">
      <head>{themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}</head>
      <body>{children}</body>
    </html>
  );
}
