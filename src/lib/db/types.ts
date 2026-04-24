export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: { key: string; updated_at: string; value: Json };
        Insert: { key: string; updated_at?: string; value: Json };
        Update: { key?: string; updated_at?: string; value?: Json };
        Relationships: [];
      };
      branches: {
        Row: {
          active: boolean;
          address: string | null;
          created_at: string;
          currency: string;
          id: string;
          name: string;
          organization_id: string;
          service_charge_pct: number;
          timezone: string;
          tip_suggestion_pct: number;
          updated_at: string;
          weekend_menu_pricing: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["branches"]["Row"]> & {
          name: string;
          organization_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Row"]>;
        Relationships: [];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      floors: {
        Row: {
          branch_id: string;
          created_at: string;
          height: number;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
          width: number;
        };
        Insert: Partial<Database["public"]["Tables"]["floors"]["Row"]> & {
          branch_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["floors"]["Row"]>;
        Relationships: [];
      };
      tables: {
        Row: {
          active: boolean;
          branch_id: string;
          capacity: number;
          created_at: string;
          floor_id: string;
          height: number;
          id: string;
          label: string | null;
          number: number;
          position_x: number;
          position_y: number;
          rotation: number;
          shape: Database["public"]["Enums"]["table_shape"];
          status: Database["public"]["Enums"]["table_status"];
          updated_at: string;
          width: number;
        };
        Insert: Partial<Database["public"]["Tables"]["tables"]["Row"]> & {
          branch_id: string;
          floor_id: string;
          number: number;
        };
        Update: Partial<Database["public"]["Tables"]["tables"]["Row"]>;
        Relationships: [];
      };
      staff: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          branch_id: string;
          color: string | null;
          created_at: string;
          full_name: string;
          id: string;
          nickname: string | null;
          pin_hash: string;
          pin_last_reset_at: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["staff"]["Row"]> & {
          branch_id: string;
          full_name: string;
          pin_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff"]["Row"]>;
        Relationships: [];
      };
      staff_sessions: {
        Row: {
          device_fingerprint: string | null;
          expires_at: string;
          id: string;
          ip: string | null;
          issued_at: string;
          last_seen_at: string;
          revoked_at: string | null;
          staff_id: string;
          user_agent: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["staff_sessions"]["Row"]> & {
          staff_id: string;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_sessions"]["Row"]>;
        Relationships: [];
      };
      stations: {
        Row: {
          active: boolean;
          branch_id: string;
          color: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["station_kind"];
          name: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stations"]["Row"]> & {
          branch_id: string;
          kind: Database["public"]["Enums"]["station_kind"];
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["stations"]["Row"]>;
        Relationships: [];
      };
      printers: {
        Row: {
          active: boolean;
          address: string | null;
          branch_id: string;
          connection: Database["public"]["Enums"]["printer_connection"];
          created_at: string;
          id: string;
          is_customer_receipt: boolean;
          name: string;
          paper_width_mm: number;
          station_id: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["printers"]["Row"]> & {
          branch_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["printers"]["Row"]>;
        Relationships: [];
      };
      print_jobs: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          payload: Json;
          printed_at: string | null;
          printer_id: string | null;
          status: Database["public"]["Enums"]["print_job_status"];
          tries: number;
        };
        Insert: Partial<Database["public"]["Tables"]["print_jobs"]["Row"]> & {
          branch_id: string;
          kind: string;
          payload: Json;
        };
        Update: Partial<Database["public"]["Tables"]["print_jobs"]["Row"]>;
        Relationships: [];
      };
      menu_categories: {
        Row: {
          active: boolean;
          branch_id: string;
          color: string | null;
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_categories"]["Row"]> & {
          branch_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_categories"]["Row"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          active: boolean;
          base_price: number;
          branch_id: string;
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          search_vector: unknown;
          sort_order: number;
          station: Database["public"]["Enums"]["item_station"];
          tags: string[];
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_items"]["Row"]> & {
          branch_id: string;
          category_id: string;
          name: string;
          base_price: number;
          station: Database["public"]["Enums"]["item_station"];
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
        Relationships: [];
      };
      menu_item_variants: {
        Row: {
          active: boolean;
          id: string;
          is_default: boolean;
          item_id: string;
          name: string;
          price_delta: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["menu_item_variants"]["Row"]> & {
          item_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_item_variants"]["Row"]>;
        Relationships: [];
      };
      modifier_groups: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          max_select: number;
          min_select: number;
          name: string;
          required: boolean;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["modifier_groups"]["Row"]> & {
          branch_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["modifier_groups"]["Row"]>;
        Relationships: [];
      };
      modifiers: {
        Row: {
          active: boolean;
          group_id: string;
          id: string;
          name: string;
          price_delta: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["modifiers"]["Row"]> & {
          group_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["modifiers"]["Row"]>;
        Relationships: [];
      };
      menu_item_modifier_groups: {
        Row: { group_id: string; item_id: string; sort_order: number };
        Insert: { group_id: string; item_id: string; sort_order?: number };
        Update: { group_id?: string; item_id?: string; sort_order?: number };
        Relationships: [];
      };
      combos: {
        Row: {
          active: boolean;
          available_from: string | null;
          available_to: string | null;
          branch_id: string;
          created_at: string;
          days_of_week: number[];
          description: string | null;
          id: string;
          includes_dessert_weekend: boolean;
          name: string;
          price_weekday: number;
          price_weekend: number | null;
          station: Database["public"]["Enums"]["item_station"];
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["combos"]["Row"]> & {
          branch_id: string;
          name: string;
          price_weekday: number;
        };
        Update: Partial<Database["public"]["Tables"]["combos"]["Row"]>;
        Relationships: [];
      };
      combo_slots: {
        Row: {
          combo_id: string;
          id: string;
          max_select: number;
          min_select: number;
          name: string;
          only_on_weekend: boolean;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["combo_slots"]["Row"]> & {
          combo_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["combo_slots"]["Row"]>;
        Relationships: [];
      };
      combo_slot_options: {
        Row: {
          custom_label: string | null;
          id: string;
          item_id: string | null;
          slot_id: string;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["combo_slot_options"]["Row"]> & {
          slot_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["combo_slot_options"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          branch_id: string;
          closed_at: string | null;
          created_at: string;
          guest_count: number;
          id: string;
          metadata: Json;
          notes: string | null;
          opened_at: string;
          service_charge: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          table_id: string;
          tip_amount: number;
          total: number;
          updated_at: string;
          waiter_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          branch_id: string;
          table_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          branch_id: string;
          cancelled_at: string | null;
          cancelled_reason: string | null;
          combo_id: string | null;
          course_no: number;
          created_at: string;
          id: string;
          line_total: number;
          menu_item_id: string | null;
          mods_total: number;
          name_snapshot: string;
          notes_free_text: string | null;
          order_id: string;
          qty: number;
          ready_at: string | null;
          sent_at: string | null;
          served_at: string | null;
          station: Database["public"]["Enums"]["item_station"] | null;
          status: Database["public"]["Enums"]["order_item_status"];
          unit_price: number;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & {
          branch_id: string;
          name_snapshot: string;
          order_id: string;
          unit_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Relationships: [];
      };
      order_item_modifiers: {
        Row: {
          id: string;
          modifier_id: string | null;
          name_snapshot: string;
          order_item_id: string;
          price_delta_snapshot: number;
        };
        Insert: Partial<Database["public"]["Tables"]["order_item_modifiers"]["Row"]> & {
          name_snapshot: string;
          order_item_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_item_modifiers"]["Row"]>;
        Relationships: [];
      };
      order_event_log: {
        Row: {
          actor_id: string | null;
          branch_id: string;
          created_at: string;
          event: Database["public"]["Enums"]["order_event"];
          id: number;
          order_id: string;
          order_item_id: string | null;
          payload: Json;
        };
        Insert: Partial<Database["public"]["Tables"]["order_event_log"]["Row"]> & {
          branch_id: string;
          event: Database["public"]["Enums"]["order_event"];
          order_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_event_log"]["Row"]>;
        Relationships: [];
      };
      order_transfers: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          moved_item_ids: string[];
          source_order_id: string;
          target_order_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["order_transfers"]["Row"]> & {
          kind: string;
          moved_item_ids: string[];
          source_order_id: string;
          target_order_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_transfers"]["Row"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          actor_id: string | null;
          amount: number;
          branch_id: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          order_id: string;
          received_at: string;
          tip: number;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          branch_id: string;
          amount: number;
          method: Database["public"]["Enums"]["payment_method"];
          order_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, { Args: never; Returns: unknown }>;
    Enums: {
      item_station: "kitchen" | "bar";
      order_event:
        | "opened"
        | "item_added"
        | "item_removed"
        | "item_updated"
        | "sent_to_station"
        | "marked_preparing"
        | "marked_ready"
        | "marked_served"
        | "item_cancelled"
        | "transferred"
        | "split"
        | "bill_requested"
        | "closed"
        | "reopened";
      order_item_status:
        | "draft"
        | "sent"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled";
      order_status: "open" | "sent" | "bill_requested" | "closed" | "cancelled";
      payment_method: "cash" | "card" | "qr" | "transfer" | "other";
      print_job_status: "queued" | "printing" | "printed" | "failed";
      printer_connection: "bluetooth" | "usb" | "lan" | "none";
      staff_role:
        | "admin"
        | "manager"
        | "waiter"
        | "kitchen"
        | "bar"
        | "cashier";
      station_kind: "kitchen" | "bar" | "dessert" | "grill";
      table_shape: "rect" | "circle" | "square";
      table_status: "free" | "occupied" | "bill" | "closed";
    };
    CompositeTypes: Record<string, never>;
  };
};
