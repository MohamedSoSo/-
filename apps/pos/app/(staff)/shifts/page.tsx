"use client";

import { useEffect, useState } from "react";
import { DoorOpen, Wallet, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";
import { usePosSession } from "@/lib/pos-session";
import type { WasteReason } from "@bbq/types";

interface Shift {
  id: string;
  opening_balance: number;
  opened_at: string;
  status: string;
}

export default function ShiftsPage() {
  const operator = usePosSession((s) => s.operator);
  const activeShiftId = usePosSession((s) => s.activeShiftId);
  const setActiveShiftId = usePosSession((s) => s.setActiveShiftId);

  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [pettyCash, setPettyCash] = useState({ amount: "", reason: "" });
  const [wasteDraft, setWasteDraft] = useState({ itemId: "", weight: "", qty: "1", reason: "other" as WasteReason });
  const [menuItems, setMenuItems] = useState<{ id: string; name_en: string }[]>([]);
  const [closeResult, setCloseResult] = useState<{ expected_cash: number; variance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operator) return;
    const supabase = createClient();
    supabase
      .from("shifts")
      .select("id, opening_balance, opened_at, status")
      .eq("cashier_id", operator.profileId)
      .eq("status", "open")
      .maybeSingle()
      .then(({ data }) => {
        setShift(data);
        if (data) setActiveShiftId(data.id);
        setLoading(false);
      });

    supabase
      .from("menu_items")
      .select("id, name_en")
      .eq("is_active", true)
      .then(({ data }) => setMenuItems(data ?? []));
  }, [operator, setActiveShiftId]);

  async function openShift() {
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("open_shift", { p_opening_balance: parseFloat(openingBalance) || 0 });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setShift({ id: data as string, opening_balance: parseFloat(openingBalance) || 0, opened_at: new Date().toISOString(), status: "open" });
    setActiveShiftId(data as string);
  }

  async function closeShift() {
    if (!shift) return;
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("close_shift", {
      p_shift_id: shift.id,
      p_counted_cash: parseFloat(countedCash) || 0,
      p_notes: null,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setCloseResult(data?.[0] ?? null);
    setShift(null);
    setActiveShiftId(null);
  }

  async function recordPettyCash() {
    if (!shift || !pettyCash.amount || !pettyCash.reason) return;
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_petty_cash", {
      p_shift_id: shift.id,
      p_amount: parseFloat(pettyCash.amount),
      p_reason: pettyCash.reason,
    });
    if (rpcError) setError(rpcError.message);
    else setPettyCash({ amount: "", reason: "" });
  }

  async function logNoSale() {
    const supabase = createClient();
    await supabase.rpc("log_drawer_event", { p_shift_id: shift?.id ?? null, p_reason: "No-sale drawer open" });
  }

  async function logWaste() {
    if (!wasteDraft.itemId) return;
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("log_manual_waste", {
      p_menu_item_id: wasteDraft.itemId,
      p_weight_grams: wasteDraft.weight ? parseInt(wasteDraft.weight, 10) : null,
      p_quantity: parseInt(wasteDraft.qty, 10) || 1,
      p_reason: wasteDraft.reason,
      p_notes: null,
    });
    if (rpcError) setError(rpcError.message);
    else setWasteDraft({ itemId: "", weight: "", qty: "1", reason: "other" });
  }

  if (loading) return <main className="p-6 text-smoke-400">Loading…</main>;

  return (
    <main className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-white">Shift</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {closeResult && (
        <div className="glass-panel p-4">
          <h2 className="text-sm font-medium text-charcoal-100 mb-2">Z-Report</h2>
          <div className="flex justify-between text-sm text-charcoal-100">
            <span>Expected cash</span>
            <span>{closeResult.expected_cash.toFixed(2)} SAR</span>
          </div>
          <div className={`flex justify-between text-sm font-medium ${closeResult.variance === 0 ? "text-emerald-400" : "text-red-400"}`}>
            <span>Variance</span>
            <span>{closeResult.variance >= 0 ? "+" : ""}{closeResult.variance.toFixed(2)} SAR</span>
          </div>
        </div>
      )}

      {!shift ? (
        <div className="glass-panel p-4">
          <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
            <DoorOpen size={16} /> Open shift
          </h2>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Opening cash balance"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
            />
            <Button variant="primary" size="sm" onClick={openShift}>
              Open
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-panel p-4">
            <h2 className="text-sm font-medium text-charcoal-100 mb-1">Shift open</h2>
            <p className="text-xs text-smoke-400">Since {new Date(shift.opened_at).toLocaleTimeString()} · Opening: {shift.opening_balance.toFixed(2)} SAR</p>
          </div>

          <div className="glass-panel p-4">
            <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
              <Wallet size={16} /> Petty cash
            </h2>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Amount"
                value={pettyCash.amount}
                onChange={(e) => setPettyCash((p) => ({ ...p, amount: e.target.value }))}
                className="w-24 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Reason"
                value={pettyCash.reason}
                onChange={(e) => setPettyCash((p) => ({ ...p, reason: e.target.value }))}
                className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <Button variant="glass" size="sm" onClick={recordPettyCash}>
                Log
              </Button>
            </div>
          </div>

          <div className="glass-panel p-4">
            <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
              <Trash2 size={16} /> Log waste
            </h2>
            <div className="space-y-2">
              <select
                value={wasteDraft.itemId}
                onChange={(e) => setWasteDraft((w) => ({ ...w, itemId: e.target.value }))}
                className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
              >
                <option value="">Select item…</option>
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name_en}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Weight (g, optional)"
                  value={wasteDraft.weight}
                  onChange={(e) => setWasteDraft((w) => ({ ...w, weight: e.target.value }))}
                  className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={wasteDraft.qty}
                  onChange={(e) => setWasteDraft((w) => ({ ...w, qty: e.target.value }))}
                  className="w-16 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <select
                value={wasteDraft.reason}
                onChange={(e) => setWasteDraft((w) => ({ ...w, reason: e.target.value as WasteReason }))}
                className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
              >
                <option value="dropped">Dropped</option>
                <option value="quality_reject">Quality reject</option>
                <option value="expired">Expired</option>
                <option value="other">Other</option>
              </select>
              <Button variant="glass" size="sm" className="w-full" onClick={logWaste}>
                Log waste
              </Button>
            </div>
          </div>

          <button onClick={logNoSale} className="w-full flex items-center justify-center gap-2 text-sm text-yellow-400 border border-yellow-500/30 rounded-xl2 py-2">
            <AlertTriangle size={14} /> No-sale drawer open
          </button>

          <div className="glass-panel p-4">
            <h2 className="text-sm font-medium text-charcoal-100 mb-3">Close shift</h2>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Counted cash"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <Button variant="destructive" size="sm" onClick={closeShift}>
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
