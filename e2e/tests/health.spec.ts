import { test, expect } from "@playwright/test";

const APPS = [
  { name: "customer", url: "http://localhost:3000/api/health" },
  { name: "pos", url: "http://localhost:3001/api/health" },
  { name: "bi", url: "http://localhost:3002/api/health" },
  { name: "admin", url: "http://localhost:3003/api/health" },
];

for (const app of APPS) {
  test(`${app.name}: /api/health reports database, storage, and realtime checks`, async ({ request }) => {
    const res = await request.get(app.url);
    expect([200, 503]).toContain(res.status()); // 503 = degraded, still a valid documented response
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks.database.ok");
    expect(body).toHaveProperty("checks.storage.ok");
    expect(body).toHaveProperty("checks.realtime.ok");
    // the DB and storage checks should be genuinely healthy against the real project
    expect(body.checks.database.ok).toBe(true);
    expect(body.checks.storage.ok).toBe(true);
  });
}
