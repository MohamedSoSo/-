/**
 * Simplified tax invoice XML, structured after ZATCA's UBL 2.1 profile
 * (seller/buyer parties, line items, tax subtotals). This captures the
 * legally-relevant fields but has NOT been validated against ZATCA's
 * official XSD/schematron rules — do that before treating it as
 * submission-ready. The signing block (ds:Signature) is populated by
 * whatever SigningResult signing-adapter.ts returns, stub or real.
 */

export interface InvoiceLineInput {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceXmlInput {
  invoiceUuid: string;
  orderNumber: string;
  issuedAt: string; // ISO 8601
  sellerName: string;
  sellerVatNumber: string;
  lines: InvoiceLineInput[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildInvoiceXml(input: InvoiceXmlInput): string {
  const lineItems = input.lines
    .map(
      (line, i) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity>${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${line.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${escapeXml(line.name)}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${escapeXml(input.orderNumber)}</cbc:ID>
  <cbc:UUID>${input.invoiceUuid}</cbc:UUID>
  <cbc:IssueDate>${input.issuedAt.slice(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${input.issuedAt.slice(11, 19)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(input.sellerVatNumber)}</cbc:CompanyID>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(input.sellerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${input.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">${input.discountTotal.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${input.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${input.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${input.taxTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
${lineItems}
</Invoice>`;
}
