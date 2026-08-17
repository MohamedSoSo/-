/**
 * Nonce-based CSP shared by all 4 apps' middleware. script-src uses a
 * per-request nonce (Next.js auto-applies it to its own injected
 * hydration/streaming scripts once it sees the nonce in the CSP response
 * header — no code changes needed elsewhere). style-src keeps
 * 'unsafe-inline': our only inline styles are server-generated theme-token
 * CSS built from DB hex values we control (see lib/theme.ts in each app),
 * not user input — threading nonces through those too wasn't worth the
 * complexity for that risk profile. Tighten it if that ever changes.
 */
export function buildCsp(nonce: string, supabaseUrl: string): string {
  const wsUrl = supabaseUrl.replace(/^https/, "wss");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseUrl],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabaseUrl, wsUrl],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export const SECURITY_HEADERS: [string, string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(self), serial=(self)"],
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
];
