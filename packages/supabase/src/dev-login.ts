import { createClient as createServerClientForCookies, createServiceRoleClient, type CookieAdapter } from "./server-client";

/**
 * DEV-ONLY auth bypass for local testing. Every entry point that calls this
 * MUST check `process.env.NODE_ENV === "development"` itself, server-side,
 * before calling it — this module does the same check again internally as
 * a second independent gate, but does not replace the caller's own check.
 *
 * Why this can't be a fake/client-only "pretend logged in": every table in
 * this project is RLS-protected on `auth.uid()`. A client-side-only stub
 * session would just make every real query return empty/denied — broken,
 * not a shortcut. So this mints a REAL Supabase Auth session (email+password,
 * since phone auth has no admin-API session-minting equivalent and no
 * phone provider is configured in this project anyway) via the Admin API,
 * which requires SUPABASE_SERVICE_ROLE_KEY. That key must never reach
 * client-side code — this file is imported only from Route Handlers.
 *
 * There is no 'manager' role in public.app_role (see supabase/migrations/
 * 0001_roles_and_profiles.sql) — void/discount approval in this schema is
 * gated to 'owner'/'developer' only. "Manager/Supervisor" maps to the
 * 'owner' DB role with a distinct display name, so it's still attributable
 * separately from "Restaurant Owner" in audit_logs even though the two
 * have identical permissions today.
 */

export type DevRole = "developer" | "owner" | "manager" | "grill_chef" | "cashier" | "customer";

export const DEV_ROLE_LIST: DevRole[] = ["developer", "owner", "manager", "grill_chef", "cashier", "customer"];

export function isDevRole(value: string | null): value is DevRole {
  return !!value && (DEV_ROLE_LIST as string[]).includes(value);
}

interface DevRoleConfig {
  email: string;
  displayName: string;
  dbRole: "developer" | "owner" | "grill_chef" | "cashier" | "customer";
}

const DEV_ROLE_CONFIG: Record<DevRole, DevRoleConfig> = {
  developer: { email: "dev-developer@smartbbq.local", displayName: "Dev: Super Developer", dbRole: "developer" },
  owner: { email: "dev-owner@smartbbq.local", displayName: "Dev: Restaurant Owner", dbRole: "owner" },
  manager: { email: "dev-manager@smartbbq.local", displayName: "Dev: Manager/Supervisor", dbRole: "owner" },
  grill_chef: { email: "dev-grillchef@smartbbq.local", displayName: "Dev: Grill Chef", dbRole: "grill_chef" },
  cashier: { email: "dev-cashier@smartbbq.local", displayName: "Dev: Cashier", dbRole: "cashier" },
  customer: { email: "dev-customer@smartbbq.local", displayName: "Dev: Customer", dbRole: "customer" },
};

// Fixed, non-secret: these accounts only ever exist when NODE_ENV=development
// and only ever hold throwaway seed data. Never used for anything real.
const DEV_PASSWORD = "dev-local-only-9f2a-not-for-prod";

export interface DevSeedResult {
  displayName: string;
  dbRole: string;
}

export async function devSeedAndSignIn(cookieAdapter: CookieAdapter, role: DevRole): Promise<DevSeedResult> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dev quick-login is only available when NODE_ENV=development.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set in this app's .env.local — add it from your Supabase project's " +
        "Settings → API to use dev quick-login. It must never be committed or used client-side."
    );
  }

  const config = DEV_ROLE_CONFIG[role];
  const admin = createServiceRoleClient();

  const { data: userList, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(`Could not list existing dev users: ${listError.message}`);

  let userId = userList.users.find((u) => u.email === config.email)?.id;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: config.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { role: config.dbRole, display_name: config.displayName },
    });
    if (createError || !created.user) {
      throw new Error(`Could not create dev user: ${createError?.message ?? "unknown error"}`);
    }
    userId = created.user.id;
  } else {
    // keep the seeded profile in sync if the role mapping ever changes
    await admin.from("profiles").update({ role: config.dbRole, display_name: config.displayName }).eq("id", userId);
  }

  const signInClient = createServerClientForCookies(cookieAdapter);
  const { error: signInError } = await signInClient.auth.signInWithPassword({
    email: config.email,
    password: DEV_PASSWORD,
  });
  if (signInError) throw new Error(`Dev sign-in failed: ${signInError.message}`);

  return { displayName: config.displayName, dbRole: config.dbRole };
}
