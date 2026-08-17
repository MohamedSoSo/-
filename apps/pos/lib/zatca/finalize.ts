import { buildInvoiceXml, type InvoiceLineInput } from "./xml";
import { getZatcaSigningAdapter } from "./signing-adapter";
import { encodeTlvQr } from "./tlv";
import type { ZatcaSignatureStatus } from "@bbq/types";

export interface FinalizeInvoiceInput {
  invoiceUuid: string;
  orderNumber: string;
  issuedAt: string;
  sellerName: string;
  sellerVatNumber: string;
  lines: InvoiceLineInput[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}

export interface FinalizeInvoiceResult {
  xml: string;
  qrPayload: string;
  signatureStatus: ZatcaSignatureStatus;
}

export async function finalizeZatcaInvoice(input: FinalizeInvoiceInput): Promise<FinalizeInvoiceResult> {
  const xml = buildInvoiceXml(input);
  const signing = await getZatcaSigningAdapter().sign(xml);

  const qrPayload = encodeTlvQr([
    { tag: 1, value: input.sellerName },
    { tag: 2, value: input.sellerVatNumber },
    { tag: 3, value: input.issuedAt },
    { tag: 4, value: input.grandTotal.toFixed(2) },
    { tag: 5, value: input.taxTotal.toFixed(2) },
    ...(signing.status === "signed"
      ? [
          { tag: 6, value: signing.xmlHashBase64, isBase64Value: true },
          { tag: 7, value: signing.signatureBase64, isBase64Value: true },
          { tag: 8, value: signing.publicKeyBase64, isBase64Value: true },
          { tag: 9, value: signing.certSignatureBase64, isBase64Value: true },
        ]
      : []),
    // signed_stub: tags 1-5 only — a QR with fabricated 6-9 would scan as
    // "valid" while being fraudulent, so we omit them entirely instead.
  ]);

  return { xml, qrPayload, signatureStatus: signing.status };
}
