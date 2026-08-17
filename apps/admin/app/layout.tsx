import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart BBQ — Admin",
  description: "Owner & Developer control center.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
