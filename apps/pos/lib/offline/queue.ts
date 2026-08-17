import { getOfflineDB, type PendingAction, type PendingActionType } from "./db";
import { createClient } from "@/lib/supabase/client";

/**
 * Known caveat: this queues on a simple "were we online when the button was
 * pressed" check, not a server-side idempotency key. If connectivity drops
 * mid-request (request sent, response lost) rather than being down before
 * the request started, a retry could double-submit. Fixing that fully
 * needs an idempotency token + dedup check in place_order()/record_payment()
 * — worth doing before this handles real payment volume.
 */

const MAX_ATTEMPTS = 5;

const HANDLERS: Record<PendingActionType, (args: Record<string, unknown>) => Promise<unknown>> = {
  place_order: async (args) => {
    const supabase = createClient();
    const { error } = await supabase.rpc("place_order", args as never);
    if (error) throw error;
  },
  record_payment: async (args) => {
    const supabase = createClient();
    const { error } = await supabase.rpc("record_payment", args as never);
    if (error) throw error;
  },
};

function looksLikeNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = e instanceof Error ? e.message : String(e);
  return /failed to fetch|network|fetch failed|load failed/i.test(message);
}

export async function enqueueAction(type: PendingActionType, args: Record<string, unknown>): Promise<void> {
  const db = await getOfflineDB();
  const action: PendingAction = {
    id: crypto.randomUUID(),
    type,
    args,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "pending",
  };
  await db.add("pending_actions", action);
}

export async function getPendingCount(): Promise<number> {
  const db = await getOfflineDB();
  const all = await db.getAll("pending_actions");
  return all.filter((a) => a.status !== "failed").length;
}

export async function getFailedCount(): Promise<number> {
  const db = await getOfflineDB();
  const all = await db.getAll("pending_actions");
  return all.filter((a) => a.status === "failed").length;
}

export async function getFailedActions(): Promise<PendingAction[]> {
  const db = await getOfflineDB();
  const all = await db.getAll("pending_actions");
  return all.filter((a) => a.status === "failed");
}

/** Puts a failed action back in the pending queue for another attempt. */
export async function retryFailedAction(id: string): Promise<void> {
  const db = await getOfflineDB();
  const action = await db.get("pending_actions", id);
  if (!action) return;
  await db.put("pending_actions", { ...action, status: "pending", attempts: 0 });
}

export async function discardFailedAction(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("pending_actions", id);
}

/**
 * Drains in order, but a single item's failure no longer wedges everything
 * behind it forever: a network-looking failure stops the pass (genuine
 * outage — preserve ordering, try again next tick); a business-logic
 * rejection or an item that's failed MAX_ATTEMPTS times is marked 'failed'
 * and skipped so later, unrelated items still get their chance.
 */
export async function drainQueue(onProgress?: (remaining: number) => void): Promise<void> {
  const db = await getOfflineDB();
  const actions = (await db.getAllFromIndex("pending_actions", "by-createdAt")).filter((a) => a.status !== "failed");

  for (const action of actions) {
    try {
      await HANDLERS[action.type](action.args);
      await db.delete("pending_actions", action.id);
    } catch (e) {
      const nextAttempts = action.attempts + 1;
      const isNetworkIssue = looksLikeNetworkError(e);
      const giveUp = !isNetworkIssue || nextAttempts >= MAX_ATTEMPTS;

      await db.put("pending_actions", {
        ...action,
        attempts: nextAttempts,
        lastError: e instanceof Error ? e.message : String(e),
        status: giveUp ? "failed" : "pending",
      });

      if (!giveUp) break; // genuine outage — stop and preserve order for next pass
      // otherwise: this item is parked as 'failed', keep going with the rest
    }
    onProgress?.(await getPendingCount());
  }
}
