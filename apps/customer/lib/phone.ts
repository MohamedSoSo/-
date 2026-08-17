export const GCC_COUNTRY_CODES = [
  { code: "+966", label: "🇸🇦 KSA" },
  { code: "+971", label: "🇦🇪 UAE" },
  { code: "+965", label: "🇰🇼 Kuwait" },
  { code: "+973", label: "🇧🇭 Bahrain" },
  { code: "+974", label: "🇶🇦 Qatar" },
  { code: "+968", label: "🇴🇲 Oman" },
] as const;

// E.164: country code + 8-14 digits, no spaces/dashes.
const E164_LOCAL_RE = /^[0-9]{8,14}$/;

export function toE164(countryCode: string, localNumber: string): string | null {
  const digits = localNumber.replace(/\D/g, "").replace(/^0+/, "");
  if (!E164_LOCAL_RE.test(digits)) return null;
  return `${countryCode}${digits}`;
}
