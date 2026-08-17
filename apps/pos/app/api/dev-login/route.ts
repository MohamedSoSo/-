import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { devSeedAndSignIn, isDevRole } from "@bbq/supabase";

export const dynamic = "force-dynamic";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/floor";
  return raw;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const next = safeNextPath(searchParams.get("next"));

  if (!isDevRole(role)) {
    return NextResponse.json({ error: "Invalid or missing role" }, { status: 400 });
  }

  const cookieStore = cookies();
  try {
    await devSeedAndSignIn(
      {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
      role
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Dev login failed" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(next, request.url));
}
