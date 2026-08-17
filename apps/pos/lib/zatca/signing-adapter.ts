/**
 * ZATCA cryptographic signing seam. A real Phase 2 simplified tax invoice
 * needs: (1) a SHA256 hash of the canonical XML (computable, no cert
 * needed — done below with Web Crypto), and (2) an ECDSA signature over
 * that hash, the signer's public key, and ZATCA's own signature over that
 * public key (the "Compliance CSID") — none of which can be produced
 * without your business's actual ZATCA-issued certificate from the Fatoora
 * onboarding portal (https://fatoora.zatca.gov.sa).
 *
 * `stubSigningAdapter` returns a real hash and clearly-marked placeholder
 * values for the rest, with status 'signed_stub' — this is intentional:
 * QR tags 1-5 (seller/VAT/timestamp/totals) are legally meaningful even
 * unsigned, but a fabricated signature would look valid to a scanner while
 * being fraudulent. Swap this adapter for a real one before accepting this
 * as ZATCA-compliant in production.
 */

export interface SigningResult {
  xmlHashBase64: string;
  signatureBase64: string;
  publicKeyBase64: string;
  certSignatureBase64: string;
  status: "signed_stub" | "signed";
}

export interface ZatcaSigningAdapter {
  sign(xml: string): Promise<SigningResult>;
}

async function sha256Base64(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  let binary = "";
  for (const b of new Uint8Array(digest)) binary += String.fromCharCode(b);
  return btoa(binary);
}

const PLACEHOLDER = "UNSIGNED_NO_ZATCA_CSID_CONFIGURED";

export const stubSigningAdapter: ZatcaSigningAdapter = {
  async sign(xml) {
    return {
      xmlHashBase64: await sha256Base64(xml), // real hash — no cert required for this part
      signatureBase64: btoa(PLACEHOLDER),
      publicKeyBase64: btoa(PLACEHOLDER),
      certSignatureBase64: btoa(PLACEHOLDER),
      status: "signed_stub",
    };
  },
};

export function getZatcaSigningAdapter(): ZatcaSigningAdapter {
  // TODO(production): return a real adapter here once ZATCA_CERTIFICATE /
  // ZATCA_PRIVATE_KEY (see .env.example) hold your actual Compliance CSID.
  return stubSigningAdapter;
}
