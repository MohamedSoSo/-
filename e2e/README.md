# E2E smoke tests

Runs against the real, already-running dev servers (`pnpm dev` from the repo
root) — not an isolated test instance. Covers what's verifiable without a
phone number that can receive real SMS/WhatsApp OTPs or a
`SUPABASE_SERVICE_ROLE_KEY` to mint sessions directly:

- Customer menu rendering, item customization (weight tiers, doneness,
  required-modifier validation), cart, QR-table token resolution
- Auth: phone OTP request reaches either the code-entry step or a real,
  visible provider error (never a silent hang) — customer/POS/BI
- Unauthenticated redirects: POS/BI/Admin never leak staff or financial UI
- `/api/health` on all 4 apps

`tests/full-lifecycle.spec.ts` is the scripted order→KDS→payment→ZATCA→BI
loop, marked `test.fixme` — it needs real auth credentials this environment
doesn't have. Wire in a test phone number (with Twilio Verify configured) or
a service-role key, then remove `.fixme`.

## Run it

```bash
# from repo root, with `pnpm dev` already running in another terminal
pnpm test:e2e

# or directly:
cd e2e
npm install
npx playwright install chromium   # first time only
npm test
```
