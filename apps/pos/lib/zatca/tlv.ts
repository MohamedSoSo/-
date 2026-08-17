/** ZATCA QR is a base64-encoded TLV (Tag-Length-Value) byte sequence. */

export interface TlvField {
  tag: number;
  value: string; // UTF-8 text or base64 text (caller decides which per tag)
  isBase64Value?: boolean; // tags 6-9 carry base64-decoded binary, not raw UTF-8
}

export function encodeTlvQr(fields: TlvField[]): string {
  const chunks: Uint8Array[] = [];

  for (const field of fields) {
    const valueBytes = field.isBase64Value ? base64ToBytes(field.value) : new TextEncoder().encode(field.value);

    if (valueBytes.length > 255) {
      throw new Error(`ZATCA TLV tag ${field.tag} value exceeds 255 bytes`);
    }

    const chunk = new Uint8Array(2 + valueBytes.length);
    chunk[0] = field.tag;
    chunk[1] = valueBytes.length;
    chunk.set(valueBytes, 2);
    chunks.push(chunk);
  }

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }

  return bytesToBase64(out);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
