export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          health_score: number | null
          id: string
          last_activity_at: string | null
          last_activity_type: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          preferred_currency: string | null
          "s.customer_id": number
          stripe_customer_id: string | null
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          health_score?: number | null
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          preferred_currency?: string | null
          "s.customer_id"?: number
          stripe_customer_id?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          health_score?: number | null
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          preferred_currency?: string | null
          "s.customer_id"?: number
          stripe_customer_id?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          is_active: boolean | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          is_active?: boolean | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          is_active?: boolean | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communication_log: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
          related_id: string | null
        }
        Insert: {
          activity_type: string
          client_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
          related_id?: string | null
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          related_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_settings: {
        Row: {
          allow_auto_charge: boolean | null
          auto_reminders: boolean | null
          auto_send_invoice: boolean | null
          client_id: string
          created_at: string
          default_due_days: number | null
          id: string
          reminder_frequency: string | null
          updated_at: string
        }
        Insert: {
          allow_auto_charge?: boolean | null
          auto_reminders?: boolean | null
          auto_send_invoice?: boolean | null
          client_id: string
          created_at?: string
          default_due_days?: number | null
          id?: string
          reminder_frequency?: string | null
          updated_at?: string
        }
        Update: {
          allow_auto_charge?: boolean | null
          auto_reminders?: boolean | null
          auto_send_invoice?: boolean | null
          client_id?: string
          created_at?: string
          default_due_days?: number | null
          id?: string
          reminder_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          plan: Database["public"]["Enums"]["user_plan_tier"]
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          plan?: Database["public"]["Enums"]["user_plan_tier"]
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["user_plan_tier"]
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      "public.stripe_customers": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      "public.user_plan_tier": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      recurring_invoice_items: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          id: string
          position: number
          quantity: number
          recurring_invoice_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          id?: string
          position?: number
          quantity?: number
          recurring_invoice_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          id?: string
          position?: number
          quantity?: number
          recurring_invoice_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recurring_invoice_items_recurring_invoice"
            columns: ["recurring_invoice_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          client_id: string
          created_at: string
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          is_active: boolean
          last_generated_date: string | null
          last_state_change_at: string | null
          next_due_date: string
          notes: string | null
          rules: Json | null
          state: Database["public"]["Enums"]["recurring_state"] | null
          subtotal: number
          tax: number
          template_number: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          last_state_change_at?: string | null
          next_due_date: string
          notes?: string | null
          rules?: Json | null
          state?: Database["public"]["Enums"]["recurring_state"] | null
          subtotal?: number
          tax?: number
          template_number: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          last_state_change_at?: string | null
          next_due_date?: string
          notes?: string | null
          rules?: Json | null
          state?: Database["public"]["Enums"]["recurring_state"] | null
          subtotal?: number
          tax?: number
          template_number?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recurring_invoices_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          created_at: string | null
          id: string
          is_verified: boolean | null
          stripe_account_id: string
          stripe_publishable_key: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          stripe_account_id: string
          stripe_publishable_key?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          stripe_account_id?: string
          stripe_publishable_key?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          stripe_customer_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          stripe_customer_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          stripe_customer_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_orders: {
        Row: {
          amount_subtotal: number | null
          amount_total: number | null
          checkout_session_id: string
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: number
          payment_intent_id: string | null
          payment_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_subtotal?: number | null
          amount_total?: number | null
          checkout_session_id: string
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: number
          payment_intent_id?: string | null
          payment_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_subtotal?: number | null
          amount_total?: number | null
          checkout_session_id?: string
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: number
          payment_intent_id?: string | null
          payment_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["stripe_subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["stripe_subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["stripe_subscription_status"]
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_stripe_customer_id_fkey"
            columns: ["stripe_customer_id"]
            isOneToOne: false
            referencedRelation: "stripe_customers"
            referencedColumns: ["stripe_customer_id"]
          },
        ]
      }
      stripe_user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          features: Json | null
          id: string
          interval_type: string
          is_active: boolean
          name: string
          price: number
          stripe_price_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          interval_type?: string
          is_active?: boolean
          name: string
          price: number
          stripe_price_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          interval_type?: string
          is_active?: boolean
          name?: string
          price?: number
          stripe_price_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string | null
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          currency: string
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          extracted_data: Json | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          status: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          extracted_data?: Json | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          status?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          status?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_extractions: {
        Row: {
          created_at: string
          extracted_fields: Json | null
          extracted_text: string | null
          file_id: string
          id: string
        }
        Insert: {
          created_at?: string
          extracted_fields?: Json | null
          extracted_text?: string | null
          file_id: string
          id?: string
        }
        Update: {
          created_at?: string
          extracted_fields?: Json | null
          extracted_text?: string | null
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          account_id: string
          amount: number
          balance: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          matched_invoice_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          balance?: number | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          matched_invoice_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          matched_invoice_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          rate: number
          region: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          rate: number
          region?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rate?: number
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_invoice_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_state: Database["public"]["Enums"]["recurring_state"] | null
          old_state: Database["public"]["Enums"]["recurring_state"] | null
          recurring_invoice_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_state?: Database["public"]["Enums"]["recurring_state"] | null
          old_state?: Database["public"]["Enums"]["recurring_state"] | null
          recurring_invoice_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_state?: Database["public"]["Enums"]["recurring_state"] | null
          old_state?: Database["public"]["Enums"]["recurring_state"] | null
          recurring_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_history_recurring_invoice_id_fkey"
            columns: ["recurring_invoice_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_from_stripe_customer: {
        Args: { stripe_customer_id: string }
        Returns: string
      }
      get_user_orders: {
        Args: { p_user_id: string }
        Returns: {
          amount_subtotal: number
          amount_total: number
          created_at: string
          currency: string
          id: number
          payment_status: string
          status: string
          updated_at: string
        }[]
      }
      get_user_plan: {
        Args: { user_uuid: string }
        Returns: string
      }
      has_active_subscription: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_pro_user: {
        Args: { uid: string }
        Returns: boolean
      }
      link_stripe_order_to_user: {
        Args: { p_checkout_session_id: string; p_user_id: string }
        Returns: boolean
      }
      save_stripe_customer: {
        Args: { p_email: string; p_stripe_customer_id: string }
        Returns: {
          created_at: string
          email: string | null
          id: string
          stripe_customer_id: string
          user_id: string | null
        }
      }
      save_stripe_subscription: {
        Args: {
          p_cancel_at_period_end?: boolean
          p_canceled_at?: string
          p_current_period_end?: string
          p_current_period_start?: string
          p_price_id?: string
          p_product_id?: string
          p_status: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
        }
        Returns: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["stripe_subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
        }
      }
      verify_stripe_subscriptions_table: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void"
      recurring_frequency: "weekly" | "monthly" | "quarterly" | "annually"
      recurring_state: "draft" | "active" | "paused" | "canceled"
      stripe_subscription_status:
        | "not_started"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
      user_plan_tier: "free" | "pro" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      invoice_status: ["draft", "sent", "paid", "overdue", "void"],
      recurring_frequency: ["weekly", "monthly", "quarterly", "annually"],
      recurring_state: ["draft", "active", "paused", "canceled"],
      stripe_subscription_status: [
        "not_started",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      user_plan_tier: ["free", "pro", "enterprise"],
    },
  },
} as const
