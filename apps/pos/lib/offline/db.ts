import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type PendingActionType = "place_order" | "record_payment";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  args: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
  /** 'failed' = gave up after MAX_ATTEMPTS or hit a non-network (business
   * logic) rejection — excluded from future drain passes so it can't block
   * items queued after it. Requires staff review, not an automatic retry. */
  status?: "pending" | "failed";
}

interface PosOfflineDB extends DBSchema {
  pending_actions: {
    key: string;
    value: PendingAction;
    indexes: { "by-createdAt": string };
  };
}

let dbPromise: Promise<IDBPDatabase<PosOfflineDB>> | null = null;

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<PosOfflineDB>("bbq-pos-offline", 1, {
      upgrade(db) {
        const store = db.createObjectStore("pending_actions", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
}
