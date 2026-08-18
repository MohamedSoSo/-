import { redirect } from "@/i18n/navigation";

export default function StaffHome({ params: { locale } }: { params: { locale: string } }) {
  redirect({ href: "/floor", locale });
}
