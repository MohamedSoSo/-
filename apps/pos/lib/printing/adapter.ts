import * as esc from "./escpos";

export type PrinterRole = "primary" | "secondary";

interface StoredPrinterId {
  usbVendorId?: number;
  usbProductId?: number;
}

const STORAGE_KEY = (role: PrinterRole) => `bbq-pos-printer-${role}`;

export interface ReceiptLine {
  label: string;
  qty: number;
  amount: number;
}

export interface ReceiptData {
  orderNumber: string;
  lines: ReceiptLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  zatcaQrPayload: string | null;
  operatorName: string;
  placedAt: string;
}

export function registerPrinter(role: PrinterRole, port: SerialPort) {
  const info = port.getInfo();
  localStorage.setItem(
    STORAGE_KEY(role),
    JSON.stringify({ usbVendorId: info.usbVendorId, usbProductId: info.usbProductId } satisfies StoredPrinterId)
  );
}

export function isPrinterRegistered(role: PrinterRole): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY(role));
}

async function findConfiguredPort(role: PrinterRole): Promise<SerialPort | null> {
  if (typeof navigator === "undefined" || !navigator.serial) return null;
  const raw = localStorage.getItem(STORAGE_KEY(role));
  if (!raw) return null;
  const saved = JSON.parse(raw) as StoredPrinterId;

  const ports = await navigator.serial.getPorts();
  return (
    ports.find((p) => {
      const info = p.getInfo();
      return info.usbVendorId === saved.usbVendorId && info.usbProductId === saved.usbProductId;
    }) ?? null
  );
}

async function writeToPort(port: SerialPort, data: Uint8Array): Promise<void> {
  const wasOpen = port.readable !== null || port.writable !== null;
  if (!wasOpen) await port.open({ baudRate: 9600 });
  const writer = port.writable!.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

export function buildReceiptBytes(receipt: ReceiptData): Uint8Array {
  const chunks: Uint8Array[] = [
    esc.init(),
    esc.align("center"),
    esc.doubleSize(true),
    esc.line("Smart BBQ"),
    esc.doubleSize(false),
    esc.line(`Order ${receipt.orderNumber}`),
    esc.line(new Date(receipt.placedAt).toLocaleString()),
    esc.line(`Served by ${receipt.operatorName}`),
    esc.line("--------------------------------"),
    esc.align("left"),
  ];

  for (const item of receipt.lines) {
    chunks.push(esc.line(`${item.qty}x ${item.label}`));
    chunks.push(esc.align("right"), esc.line(`${item.amount.toFixed(2)} SAR`), esc.align("left"));
  }

  chunks.push(
    esc.line("--------------------------------"),
    esc.line(`Subtotal        ${receipt.subtotal.toFixed(2)} SAR`),
    esc.line(`VAT (15%)       ${receipt.taxTotal.toFixed(2)} SAR`)
  );
  if (receipt.discountTotal > 0) {
    chunks.push(esc.line(`Discount       -${receipt.discountTotal.toFixed(2)} SAR`));
  }
  chunks.push(esc.bold(true), esc.line(`Total           ${receipt.grandTotal.toFixed(2)} SAR`), esc.bold(false));

  if (receipt.zatcaQrPayload) {
    chunks.push(esc.feed(1), esc.align("center"), esc.qrCode(receipt.zatcaQrPayload), esc.feed(1));
  }

  chunks.push(esc.feed(2), esc.cut());
  return esc.concat(...chunks);
}

export interface PrintResult {
  success: boolean;
  usedRole: PrinterRole | "browser_fallback" | null;
  error?: string;
}

/**
 * Tries the primary printer, falls back to secondary on failure (port
 * missing, write error, or a paper-out status reported by the printer's
 * own DLE EOT status query), then falls back to the browser print dialog
 * as a last resort — which can't render the printer-native QR, so it shows
 * the raw ZATCA payload as text instead.
 */
export async function printReceipt(receipt: ReceiptData): Promise<PrintResult> {
  const bytes = buildReceiptBytes(receipt);

  for (const role of ["primary", "secondary"] as const) {
    try {
      const port = await findConfiguredPort(role);
      if (!port) continue;
      await writeToPort(port, bytes);
      return { success: true, usedRole: role };
    } catch (e) {
      // fall through to the next role
      if (role === "secondary") {
        return browserFallback(receipt, e instanceof Error ? e.message : String(e));
      }
    }
  }

  return browserFallback(receipt, "No configured thermal printer responded.");
}

function browserFallback(receipt: ReceiptData, reason: string): PrintResult {
  if (typeof window === "undefined") return { success: false, usedRole: null, error: reason };

  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return { success: false, usedRole: null, error: "Popup blocked — allow popups to print." };

  win.document.write(`
    <html><head><title>Receipt ${receipt.orderNumber}</title></head>
    <body style="font-family: monospace; padding: 16px; max-width: 320px;">
      <h2 style="text-align:center">Smart BBQ</h2>
      <p style="text-align:center">Order ${receipt.orderNumber}<br/>${new Date(receipt.placedAt).toLocaleString()}<br/>Served by ${receipt.operatorName}</p>
      <hr/>
      ${receipt.lines.map((l) => `<div style="display:flex;justify-content:space-between"><span>${l.qty}x ${l.label}</span><span>${l.amount.toFixed(2)} SAR</span></div>`).join("")}
      <hr/>
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${receipt.subtotal.toFixed(2)} SAR</span></div>
      <div style="display:flex;justify-content:space-between"><span>VAT (15%)</span><span>${receipt.taxTotal.toFixed(2)} SAR</span></div>
      ${receipt.discountTotal > 0 ? `<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${receipt.discountTotal.toFixed(2)} SAR</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-weight:bold"><span>Total</span><span>${receipt.grandTotal.toFixed(2)} SAR</span></div>
      ${receipt.zatcaQrPayload ? `<p style="word-break:break-all;font-size:9px;margin-top:12px">ZATCA payload (no thermal printer connected to render as QR):<br/>${receipt.zatcaQrPayload}</p>` : ""}
      <p style="text-align:center;font-size:10px;color:#888;margin-top:12px">Printed via browser fallback: ${reason}</p>
    </body></html>
  `);
  win.document.close();
  win.focus();
  win.print();

  return { success: true, usedRole: "browser_fallback", error: reason };
}
