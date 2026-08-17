# Smart BBQ Restaurant Platform

Turborepo monorepo for four integrated apps: **Customer** ordering, **POS/KDS**
staff operations, **Owner BI** analytics, and the **Developer Portal**
(`/admin/developer`) control center.

## Stack

- Next.js 14 (App Router) + TypeScript, per app
- Tailwind CSS + Shadcn-style primitives (`@bbq/ui`)
- Supabase (Postgres + Auth + Storage + Realtime), RLS-enforced
- pnpm workspaces + Turborepo

## Layout

```
apps/
  customer/   localhost:3000  — public ordering app
  pos/        localhost:3001  — staff POS / KDS
  bi/         localhost:3002  — owner analytics
  admin/      localhost:3003  — owner + developer portal (/admin/developer)
packages/
  ui/         shared components, assets.config.ts, <AppImage />
  types/      Zod schemas + inferred types, shared across apps
  supabase/   typed browser/server Supabase clients
  config/     shared tsconfig + Tailwind preset (BBQ theme tokens)
supabase/
  migrations/ schema, RLS policies, audit-log triggers
  seed.sql    sample menu + tables + feature flags for local dev
```

## First-time setup

Requires Docker Desktop running (Supabase CLI uses it for the local stack).

```bash
pnpm install
pnpm db:start          # starts local Supabase — prints your local anon/service keys
cp .env.example apps/customer/.env.local   # repeat for pos, bi, admin
# paste the printed anon key into NEXT_PUBLIC_SUPABASE_ANON_KEY in each .env.local
pnpm db:reset           # applies migrations + seed.sql
pnpm dev                # runs all 4 apps concurrently via Turborepo
```

To become a `developer` (unlocks `/admin/developer`): sign up through any
app, then in Supabase Studio (http://127.0.0.1:54323) run:

```sql
update public.profiles set role = 'developer' where id = '<your-user-uuid>';
```

## Customer app auth: phone + WhatsApp/SMS OTP

`apps/customer` is phone-only (no email/password). By default, Supabase's
built-in phone provider only sends SMS. **WhatsApp delivery requires
configuring Twilio Verify** (the only provider that supports the `channel:
"whatsapp"` option `signInWithOtp` sends) under Supabase Studio → Authentication
→ Providers → Phone, with your own Twilio Account SID, Auth Token, and a
WhatsApp-enabled Verify Service SID. Until that's configured, the SMS channel
works out of the box against Twilio's trial/sandbox numbers; the WhatsApp
toggle in `/login` will fail at runtime with a provider error, not a bug in
this app's code.

## Notes on this pin

`packages: { "@bbq/*" }` reference `@supabase/ssr@^0.12.4` — do not downgrade
below `0.10.x`; earlier releases predate `@supabase/supabase-js@2.111+`'s
type changes and its `.select()`/`.update()` calls silently resolve to
`never`, which will look like nonsensical type errors on unrelated files
that merely import from `@bbq/ui` or `@bbq/supabase`.

## Known gaps before real production use

Everything below is a deliberate, documented boundary — not an oversight —
but all of it needs real credentials/hardware you'll supply, not more code:

- **Customer app payment is a stub.** `apps/customer/lib/payments/adapter.ts`
  simulates a successful charge. Wire a real gateway (Moyasar/HyperPay/Stripe
  are the common KSA choices) into that one file before this takes real
  money. POS doesn't need this — `record_payment()` just logs which tender
  a physical card terminal/cash drawer already handled, it never processes a
  charge itself.
- **ZATCA signing is a stub.** `place_order()`/POS checkout compute correct
  subtotal/VAT/QR-payload structure, but the cryptographic stamp (QR tags
  6-9, `zatca_signature_status = 'signed_stub'`) needs your real
  ZATCA-issued Compliance CSID from the Fatoora onboarding portal — see
  `apps/pos/lib/zatca/signing-adapter.ts`.
- **Phone/WhatsApp OTP needs a Twilio provider configured in Supabase** —
  under Supabase Studio → Authentication → Providers → Phone, with your
  Twilio Account SID, Auth Token, and a WhatsApp-enabled Verify Service SID.
  Until then, phone sign-in across all 4 apps surfaces a real "Unsupported
  phone provider" error (verified live by `e2e/tests/*.spec.ts`) rather than
  silently hanging.
- **Delivery map is a link, not an embed.** No `NEXT_PUBLIC_MAPS_API_KEY`
  was available, so checkout captures GPS via the browser's native
  Geolocation API and links out to Google Maps rather than embedding a JS
  map SDK.
- **Web Serial scale protocol is unverified against real hardware** — see
  the protocol note in `apps/pos/lib/scale/useScale.ts`.
- **E2E coverage stops at the auth boundary.** `e2e/tests/full-lifecycle.spec.ts`
  is the scripted full order→KDS→payment→BI loop, marked `test.fixme`
  pending a test phone number or service-role key to complete sign-in.

## Security headers & health checks (Phase 5)

- Every app sets a nonce-based CSP (`script-src 'strict-dynamic'`, no
  `unsafe-inline` for scripts), HSTS, X-Frame-Options, and friends in
  production — see `packages/config/csp.ts` and each app's
  `lib/supabase/middleware.ts`. CSP is skipped in `next dev` (Fast Refresh
  needs `unsafe-eval`, which a strict policy blocks).
- Each app exposes `/api/health` (DB + Storage + Realtime-reachability
  checks, unauthenticated by design — that's the point of a health probe).
- PIN brute-force protection (`verify_staff_pin`, `void_order_item`,
  `apply_discount`) is rate-limited **in Postgres**, not in Next.js
  middleware — the browser calls Supabase directly in this architecture, so
  our middleware never sees those requests to throttle. See migration
  `0027_pin_rate_limiting.sql`.
- Demo/seed data purge: Developer Portal → **Demo Data Purge** (developer
  role only, explicit date range + typed confirmation, no auto-detection of
  "which rows are fake").

## Commands

| Command | What |
|---|---|
| `pnpm dev` | run all 4 apps |
| `pnpm dev:admin` (etc.) | run a single app |
| `pnpm build` | production build, all apps |
| `pnpm typecheck` | `tsc --noEmit`, all packages |
| `pnpm db:gen-types` | regenerate `packages/supabase/src/database.types.ts` from the live local schema — run after every migration change |
| `pnpm db:reset` | drop, re-migrate, and reseed the local database |
| `pnpm test:e2e` | Playwright smoke tests against already-running dev servers — see `e2e/README.md` |
# -
