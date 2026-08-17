// Hand-authored to match supabase/migrations/*.sql for Phase 1.
// Once `supabase start` has run locally, regenerate the authoritative version with:
//   pnpm db:gen-types
// which overwrites this file from the live schema — keep it in sync after
// every migration change rather than hand-editing long-term.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          display_name: string;
          phone: string | null;
          is_active: boolean;
          pin_set_at: string | null; // pin_hash itself is never selectable (column REVOKEd, see 0014)
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; display_name: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          sort_order: number;
          expected_shrinkage_pct: number | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & { name_en: string; name_ar: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          description_en: string | null;
          description_ar: string | null;
          category_id: string;
          base_price: number;
          is_weight_based: boolean;
          default_weight_unit: "g" | "kg";
          supports_doneness: boolean;
          available_doneness_levels: DonenessLevel[];
          cogs: number;
          image_asset_key: string | null;
          is_active: boolean;
          item_type: MenuItemType;
          default_station: Station;
          stock_quantity: number | null;
          stock_version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_items"]["Row"]> & {
          name_en: string;
          name_ar: string;
          category_id: string;
          base_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      weight_tiers: {
        Row: {
          id: string;
          menu_item_id: string;
          label: string;
          grams: number;
          price_multiplier: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["weight_tiers"]["Row"]> & {
          menu_item_id: string;
          label: string;
          grams: number;
        };
        Update: Partial<Database["public"]["Tables"]["weight_tiers"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "weight_tiers_menu_item_id_fkey";
            columns: ["menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_tables: {
        Row: {
          id: string;
          label: string;
          qr_code_token: string;
          seats: number;
          is_active: boolean;
          status: TableStatus;
          position_x: number;
          position_y: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["restaurant_tables"]["Row"]> & { label: string };
        Update: Partial<Database["public"]["Tables"]["restaurant_tables"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          channel: OrderChannel;
          status: OrderStatus;
          table_id: string | null;
          customer_id: string | null;
          driver_id: string | null;
          subtotal: number;
          discount_total: number;
          tax_total: number;
          grand_total: number;
          zatca_invoice_uuid: string | null;
          zatca_qr_payload: string | null;
          zatca_xml: string | null;
          zatca_signature_status: ZatcaSignatureStatus;
          zatca_signed_at: string | null;
          scheduled_for: string | null;
          delivery_address_line: string | null;
          delivery_lat: number | null;
          delivery_lng: number | null;
          delivery_notes: string | null;
          placed_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & { channel: OrderChannel };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_driver_id_fkey";
            columns: ["driver_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          station: Station;
          quantity: number;
          weight_grams_ordered: number | null;
          weight_grams_actual: number | null;
          doneness: DonenessLevel | null;
          unit_price: number;
          line_total: number;
          notes: string | null;
          status: OrderStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & {
          order_id: string;
          menu_item_id: string;
          station: Station;
          quantity: number;
          unit_price: number;
          line_total: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: AppRole | null;
          action: AuditAction;
          target_table: string;
          target_id: string;
          before: Json | null;
          after: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: never; // append-only via SECURITY DEFINER triggers — no client inserts
        Update: never;
        Relationships: [];
      };
      feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          description: string | null;
          rollout_percentage: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]> & { key: string; enabled: boolean };
        Update: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]>;
        Relationships: [];
      };
      brand_assets: {
        Row: {
          key: string;
          storage_path: string;
          alt_text: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["brand_assets"]["Row"]> & { key: string; storage_path: string };
        Update: Partial<Database["public"]["Tables"]["brand_assets"]["Row"]>;
        Relationships: [];
      };
      theme_tokens: {
        Row: {
          key: string;
          tokens: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["theme_tokens"]["Row"]> & { key: string; tokens: Json };
        Update: Partial<Database["public"]["Tables"]["theme_tokens"]["Row"]>;
        Relationships: [];
      };
      modifier_groups: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          selection_type: ModifierSelectionType;
          is_required: boolean;
          min_select: number;
          max_select: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["modifier_groups"]["Row"]> & { name_en: string; name_ar: string };
        Update: Partial<Database["public"]["Tables"]["modifier_groups"]["Row"]>;
        Relationships: [];
      };
      modifiers: {
        Row: {
          id: string;
          group_id: string;
          name_en: string;
          name_ar: string;
          price_delta: number;
          is_active: boolean;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["modifiers"]["Row"]> & {
          group_id: string;
          name_en: string;
          name_ar: string;
        };
        Update: Partial<Database["public"]["Tables"]["modifiers"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "modifiers_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "modifier_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_item_modifier_groups: {
        Row: {
          menu_item_id: string;
          modifier_group_id: string;
          sort_order: number;
        };
        Insert: Database["public"]["Tables"]["menu_item_modifier_groups"]["Row"];
        Update: Partial<Database["public"]["Tables"]["menu_item_modifier_groups"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "menu_item_modifier_groups_menu_item_id_fkey";
            columns: ["menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_item_modifier_groups_modifier_group_id_fkey";
            columns: ["modifier_group_id"];
            referencedRelation: "modifier_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_modifiers: {
        Row: {
          id: string;
          order_item_id: string;
          modifier_id: string | null;
          name_snapshot: string;
          price_delta_snapshot: number;
          quantity: number;
        };
        Insert: never; // written exclusively by place_order()
        Update: never;
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_order_item_id_fkey";
            columns: ["order_item_id"];
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      combo_components: {
        Row: {
          id: string;
          combo_menu_item_id: string;
          slot_label: string;
          category_id: string;
          quantity: number;
          upcharge: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["combo_components"]["Row"]> & {
          combo_menu_item_id: string;
          slot_label: string;
          category_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["combo_components"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "combo_components_combo_menu_item_id_fkey";
            columns: ["combo_menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "combo_components_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_components: {
        Row: {
          id: string;
          order_item_id: string;
          combo_component_id: string | null;
          slot_label: string;
          component_menu_item_id: string;
          quantity: number;
          upcharge_snapshot: number;
        };
        Insert: never; // written exclusively by place_order()
        Update: never;
        Relationships: [
          {
            foreignKeyName: "order_item_components_order_item_id_fkey";
            columns: ["order_item_id"];
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          id: string;
          cashier_id: string;
          status: ShiftStatus;
          opening_balance: number;
          closing_balance_expected: number | null;
          closing_balance_counted: number | null;
          cash_variance: number | null;
          notes: string | null;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: never; // written exclusively by open_shift()/close_shift()
        Update: never;
        Relationships: [];
      };
      petty_cash_entries: {
        Row: {
          id: string;
          shift_id: string;
          amount: number;
          reason: string;
          recorded_by: string;
          created_at: string;
        };
        Insert: never; // written exclusively by record_petty_cash()
        Update: never;
        Relationships: [
          {
            foreignKeyName: "petty_cash_entries_shift_id_fkey";
            columns: ["shift_id"];
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          method: PaymentMethod;
          amount: number;
          is_refund: boolean;
          tendered_by: string | null;
          shift_id: string | null;
          reference: string | null;
          created_at: string;
        };
        Insert: never; // written exclusively by record_payment()
        Update: never;
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_waste: {
        Row: {
          id: string;
          menu_item_id: string;
          order_item_id: string | null;
          weight_grams: number | null;
          quantity: number;
          reason: WasteReason;
          notes: string | null;
          staff_id: string;
          created_at: string;
        };
        Insert: never; // written exclusively by void_order_item()/log_manual_waste()
        Update: never;
        Relationships: [
          {
            foreignKeyName: "inventory_waste_menu_item_id_fkey";
            columns: ["menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          unit_cost_per_kg: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ingredients"]["Row"]> & {
          name_en: string;
          name_ar: string;
          unit_cost_per_kg: number;
        };
        Update: Partial<Database["public"]["Tables"]["ingredients"]["Row"]>;
        Relationships: [];
      };
      menu_item_ingredients: {
        Row: {
          menu_item_id: string;
          ingredient_id: string;
          kg_per_unit: number;
        };
        Insert: Database["public"]["Tables"]["menu_item_ingredients"]["Row"];
        Update: Partial<Database["public"]["Tables"]["menu_item_ingredients"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey";
            columns: ["menu_item_id"];
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_item_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_status_events: {
        Row: {
          id: string;
          order_item_id: string;
          from_status: OrderStatus | null;
          to_status: OrderStatus;
          staff_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["order_item_status_events"]["Row"]> & {
          order_item_id: string;
          to_status: OrderStatus;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "order_item_status_events_order_item_id_fkey";
            columns: ["order_item_id"];
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      place_order: {
        Args: {
          p_channel: OrderChannel;
          p_table_id: string | null;
          p_scheduled_for: string | null;
          p_delivery_address: string | null;
          p_delivery_lat: number | null;
          p_delivery_lng: number | null;
          p_delivery_notes: string | null;
          p_items: Json;
        };
        Returns: { order_id: string; order_number: string }[];
      };
      set_staff_pin: {
        Args: { p_pin: string; p_target_profile_id: string | null };
        Returns: undefined;
      };
      verify_staff_pin: {
        Args: { p_pin: string };
        Returns: { profile_id: string; display_name: string; role: AppRole }[];
      };
      open_shift: {
        Args: { p_opening_balance: number };
        Returns: string;
      };
      close_shift: {
        Args: { p_shift_id: string; p_counted_cash: number; p_notes: string | null };
        Returns: { expected_cash: number; variance: number }[];
      };
      record_petty_cash: {
        Args: { p_shift_id: string; p_amount: number; p_reason: string };
        Returns: string;
      };
      record_payment: {
        Args: {
          p_order_id: string;
          p_method: PaymentMethod;
          p_amount: number;
          p_shift_id: string | null;
          p_reference: string | null;
        };
        Returns: string;
      };
      transfer_table: {
        Args: { p_order_id: string; p_new_table_id: string };
        Returns: undefined;
      };
      merge_tables: {
        Args: { p_source_table_id: string; p_target_table_id: string };
        Returns: number;
      };
      void_order_item: {
        Args: { p_order_item_id: string; p_reason: string; p_supervisor_pin: string };
        Returns: undefined;
      };
      apply_discount: {
        Args: { p_order_id: string; p_discount_amount: number; p_reason: string; p_supervisor_pin: string };
        Returns: undefined;
      };
      log_manual_waste: {
        Args: {
          p_menu_item_id: string;
          p_weight_grams: number | null;
          p_quantity: number;
          p_reason: WasteReason;
          p_notes: string | null;
        };
        Returns: string;
      };
      log_drawer_event: {
        Args: { p_shift_id: string | null; p_reason: string };
        Returns: undefined;
      };
      purge_demo_data: {
        Args: { p_start_date: string; p_end_date: string; p_confirm: string };
        Returns: number;
      };
    };
    Enums: {
      app_role: AppRole;
      order_channel: OrderChannel;
      order_status: OrderStatus;
      station: Station;
      doneness_level: DonenessLevel;
      audit_action: AuditAction;
      modifier_selection_type: ModifierSelectionType;
      menu_item_type: MenuItemType;
      table_status: TableStatus;
      payment_method: PaymentMethod;
      shift_status: ShiftStatus;
      waste_reason: WasteReason;
      zatca_signature_status: ZatcaSignatureStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type AppRole =
  | "customer"
  | "cashier"
  | "grill_chef"
  | "kitchen_chef"
  | "waiter"
  | "driver"
  | "owner"
  | "developer";

export type OrderChannel = "qr_table" | "delivery" | "pickup" | "pre_order";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "grilling"
  | "kitchen_prep"
  | "plating"
  | "ready"
  | "served"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "voided";

export type Station = "grill" | "kitchen" | "bar" | "dessert";

export type ModifierSelectionType = "single" | "multiple";

export type MenuItemType = "single" | "combo";

export type DonenessLevel = "rare" | "medium_rare" | "medium" | "medium_well" | "well_done";

export type AuditAction =
  | "price_update"
  | "void_transaction"
  | "discount_applied"
  | "refund_issued"
  | "elevated_auth"
  | "menu_item_update"
  | "feature_flag_toggle"
  | "asset_update"
  | "user_role_change"
  | "table_transfer"
  | "order_merge"
  | "no_sale_drawer_open"
  | "shift_close"
  | "inventory_waste";

export type TableStatus = "free" | "occupied" | "reserved" | "needs_cleaning";

export type PaymentMethod = "card" | "apple_pay" | "cash" | "terminal";

export type ShiftStatus = "open" | "closed";

export type WasteReason = "voided_after_cook" | "dropped" | "quality_reject" | "expired" | "other";

export type ZatcaSignatureStatus = "unsigned" | "signed_stub" | "signed";
