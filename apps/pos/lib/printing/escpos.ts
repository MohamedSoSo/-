/**
 * ESC/POS command builders for thermal receipt printers. Targets the
 * common Epson-compatible command set most USB/serial thermal printers
 * (Epson TM series, Star, and generic clones) implement.
 */

const ESC = 0x1b;
const GS = 0x1d;

function bytes(...vals: number[]): Uint8Array {
  return new Uint8Array(vals);
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function init(): Uint8Array {
  return bytes(ESC, 0x40); // ESC @
}

export function align(mode: "left" | "center" | "right"): Uint8Array {
  const n = mode === "left" ? 0 : mode === "center" ? 1 : 2;
  return bytes(ESC, 0x61, n); // ESC a n
}

export function bold(on: boolean): Uint8Array {
  return bytes(ESC, 0x45, on ? 1 : 0); // ESC E n
}

export function doubleSize(on: boolean): Uint8Array {
  return bytes(GS, 0x21, on ? 0x11 : 0x00); // GS ! n
}

export function line(text = ""): Uint8Array {
  return concat(textBytes(text), bytes(0x0a));
}

export function feed(lines = 1): Uint8Array {
  return bytes(ESC, 0x64, lines); // ESC d n
}

export function cut(): Uint8Array {
  return bytes(GS, 0x56, 0x00); // GS V 0 — full cut
}

/**
 * GS ( k "store + print" QR sequence — the printer's own firmware encodes
 * and renders the QR from the raw data string, so no client-side QR
 * encoding library is needed on this path. This is what actually gets used
 * on a real deployment; the browser-print fallback (adapter.ts) can't do
 * this and prints the raw payload as text instead.
 */
export function qrCode(data: string, moduleSize = 6): Uint8Array {
  const payload = textBytes(data);
  const storeLen = payload.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;

  return concat(
    bytes(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00), // model 2
    bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize), // module size
    bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31), // error correction level M
    bytes(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30), // store data
    payload,
    bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30) // print
  );
}

/** DLE EOT 4 — printer status (bit 5 of the response commonly signals paper-out on Epson-compatible firmware). */
export function paperStatusQuery(): Uint8Array {
  return bytes(0x10, 0x04, 0x04);
}

export function isPaperOut(statusByte: number): boolean {
  return (statusByte & 0x60) !== 0;
}

export function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
