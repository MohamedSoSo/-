import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DonenessLevel } from "@bbq/types";

export interface CartWeightTier {
  id: string;
  label: string;
  grams: number;
  price_multiplier: number;
}

export interface CartModifier {
  id: string;
  name_en: string;
  name_ar: string;
  price_delta: number;
}

export interface CartComboSelection {
  combo_component_id: string;
  slot_label: string;
  component_menu_item_id: string;
  component_name_en: string;
  upcharge: number;
}

export interface CartItem {
  cart_line_id: string;
  menu_item_id: string;
  name_en: string;
  name_ar: string;
  image_asset_key: string | null;
  quantity: number;
  base_unit_price: number;
  weight_tier: CartWeightTier | null;
  doneness: DonenessLevel | null;
  notes: string | null;
  modifiers: CartModifier[];
  combo_selections: CartComboSelection[];
}

export type OrderMode = "qr_table" | "delivery" | "pickup" | "pre_order";

interface CartState {
  items: CartItem[];
  orderMode: OrderMode;
  tableId: string | null;
  tableLabel: string | null;
  isDrawerOpen: boolean;
  addItem: (item: Omit<CartItem, "cart_line_id">) => void;
  removeItem: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clear: () => void;
  setOrderMode: (mode: OrderMode) => void;
  lockToTable: (tableId: string, tableLabel: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      orderMode: "pickup",
      tableId: null,
      tableLabel: null,
      isDrawerOpen: false,

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, cart_line_id: crypto.randomUUID() }],
          isDrawerOpen: true,
        })),

      removeItem: (cartLineId) =>
        set((state) => ({ items: state.items.filter((i) => i.cart_line_id !== cartLineId) })),

      updateQuantity: (cartLineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.cart_line_id !== cartLineId)
              : state.items.map((i) => (i.cart_line_id === cartLineId ? { ...i, quantity } : i)),
        })),

      clear: () => set({ items: [] }),

      setOrderMode: (mode) => set({ orderMode: mode, tableId: null, tableLabel: null }),

      lockToTable: (tableId, tableLabel) => set({ orderMode: "qr_table", tableId, tableLabel }),

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    {
      name: "bbq-cart",
      partialize: (state) => ({
        items: state.items,
        orderMode: state.orderMode,
        tableId: state.tableId,
        tableLabel: state.tableLabel,
      }),
    }
  )
);
