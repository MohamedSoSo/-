import { enqueueAction } from "./queue";
import { createClient } from "@/lib/supabase/client";
import type { PendingActionType } from "./db";

export interface SubmitResult<T> {
  queued: boolean;
  data: T | null;
}

function looksLikeNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = e instanceof Error ? e.message : String(e);
  return /failed to fetch|network|fetch failed|load failed/i.test(message);
}

/**
 * Attempts the RPC immediately; if the browser is offline (or the call
 * fails in a way that looks like a network drop rather than a real server
 * rejection), it's queued in IndexedDB instead and retried automatically
 * on reconnect (see useOfflineSync). Business-logic errors (bad PIN, sold
 * out, etc.) are NOT queued — they surface to the caller immediately.
 */
export async function submitOrQueue<T = unknown>(
  type: PendingActionType,
  rpcName: string,
  args: Record<string, unknown>
): Promise<SubmitResult<T>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueAction(type, args);
    return { queued: true, data: null };
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase.rpc(rpcName as never, args as never);
    if (error) {
      if (looksLikeNetworkError(error)) {
        await enqueueAction(type, args);
        return { queued: true, data: null };
      }
      throw error;
    }
    return { queued: false, data: data as T };
  } catch (e) {
    if (looksLikeNetworkError(e)) {
      await enqueueAction(type, args);
      return { queued: true, data: null };
    }
    throw e;
  }
}
