/**
 * Re-engagement trigger without a WhatsApp Business API integration (that
 * needs Twilio/Meta credentials — same class of external dependency as the
 * phone-OTP WhatsApp channel in apps/customer). A wa.me deep link opens
 * WhatsApp with the message pre-filled; staff still taps send per contact.
 * True bulk automated sending needs the Business API — this is the honest,
 * zero-credential middle ground that actually works today.
 */
export function buildWhatsAppLink(phone: string | null, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const SEGMENT_MESSAGE_TEMPLATES: Record<string, string> = {
  champion: "We miss having you in! As one of our regulars, here's 15% off your next order this week 🔥",
  at_risk: "It's been a couple of weeks — come back for fresh-off-the-grill BBQ. We've got something new on the menu.",
  churned: "We'd love to see you again. Here's 20% off to welcome you back to Smart BBQ.",
};
