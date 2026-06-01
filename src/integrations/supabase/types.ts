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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          default_drip_interval: number | null
          default_drip_interval_unit: string | null
          default_drip_qty_per_run: number | null
          engagement_type: string
          id: string
          is_base: boolean | null
          ratio_percent: number | null
          service_id: string | null
          sort_order: number | null
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          default_drip_interval?: number | null
          default_drip_interval_unit?: string | null
          default_drip_qty_per_run?: number | null
          engagement_type: string
          id?: string
          is_base?: boolean | null
          ratio_percent?: number | null
          service_id?: string | null
          sort_order?: number | null
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          default_drip_interval?: number | null
          default_drip_interval_unit?: string | null
          default_drip_qty_per_run?: number | null
          engagement_type?: string
          id?: string
          is_base?: boolean | null
          ratio_percent?: number | null
          service_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "engagement_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      category_pricing: {
        Row: {
          category: string
          created_at: string
          price_per_1k: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          price_per_1k?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          price_per_1k?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          payment_method: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      engagement_bundles: {
        Row: {
          ai_organic_enabled: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          platform: string
          provider_id: string | null
          sort_order: number | null
          updated_at: string | null
          use_custom_ratios: boolean | null
        }
        Insert: {
          ai_organic_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          platform: string
          provider_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          use_custom_ratios?: boolean | null
        }
        Update: {
          ai_organic_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string
          provider_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          use_custom_ratios?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_bundles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_bundles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_order_items: {
        Row: {
          created_at: string | null
          drip_interval: number | null
          drip_interval_unit: string | null
          drip_qty_per_run: number | null
          engagement_order_id: string
          engagement_type: string
          error_message: string | null
          id: string
          is_enabled: boolean | null
          price: number
          provider_order_id: string | null
          quantity: number
          service_id: string | null
          speed_preset: string | null
          status: string | null
          updated_at: string | null
          user_service_id: string | null
        }
        Insert: {
          created_at?: string | null
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_qty_per_run?: number | null
          engagement_order_id: string
          engagement_type: string
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          price: number
          provider_order_id?: string | null
          quantity: number
          service_id?: string | null
          speed_preset?: string | null
          status?: string | null
          updated_at?: string | null
          user_service_id?: string | null
        }
        Update: {
          created_at?: string | null
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_qty_per_run?: number | null
          engagement_order_id?: string
          engagement_type?: string
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          price?: number
          provider_order_id?: string | null
          quantity?: number
          service_id?: string | null
          speed_preset?: string | null
          status?: string | null
          updated_at?: string | null
          user_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_order_items_engagement_order_id_fkey"
            columns: ["engagement_order_id"]
            isOneToOne: false
            referencedRelation: "engagement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_order_items_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "user_services"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_orders: {
        Row: {
          base_quantity: number
          bundle_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_organic_mode: boolean | null
          link: string
          order_number: number
          peak_hours_enabled: boolean | null
          status: string | null
          total_price: number
          updated_at: string | null
          use_user_api: boolean | null
          user_bundle_id: string | null
          user_id: string
          user_provider_account_id: string | null
          variance_percent: number | null
        }
        Insert: {
          base_quantity: number
          bundle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_organic_mode?: boolean | null
          link: string
          order_number?: number
          peak_hours_enabled?: boolean | null
          status?: string | null
          total_price: number
          updated_at?: string | null
          use_user_api?: boolean | null
          user_bundle_id?: string | null
          user_id: string
          user_provider_account_id?: string | null
          variance_percent?: number | null
        }
        Update: {
          base_quantity?: number
          bundle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_organic_mode?: boolean | null
          link?: string
          order_number?: number
          peak_hours_enabled?: boolean | null
          status?: string | null
          total_price?: number
          updated_at?: string | null
          use_user_api?: boolean | null
          user_bundle_id?: string | null
          user_id?: string
          user_provider_account_id?: string | null
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_orders_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "engagement_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_orders_user_bundle_id_fkey"
            columns: ["user_bundle_id"]
            isOneToOne: false
            referencedRelation: "user_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_orders_user_provider_account_id_fkey"
            columns: ["user_provider_account_id"]
            isOneToOne: false
            referencedRelation: "user_provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          drip_interval: number | null
          drip_interval_unit: string | null
          drip_quantity_per_run: number | null
          drip_runs: number | null
          error_message: string | null
          id: string
          is_drip_feed: boolean | null
          is_organic_mode: boolean | null
          link: string
          order_number: number
          peak_hours_enabled: boolean | null
          price: number
          provider_order_id: string | null
          quantity: number
          remains: number | null
          service_id: string | null
          start_count: number | null
          status: string | null
          updated_at: string | null
          use_user_api: boolean | null
          user_id: string
          user_provider_account_id: string | null
          user_service_id: string | null
          variance_percent: number | null
        }
        Insert: {
          created_at?: string | null
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_quantity_per_run?: number | null
          drip_runs?: number | null
          error_message?: string | null
          id?: string
          is_drip_feed?: boolean | null
          is_organic_mode?: boolean | null
          link: string
          order_number?: number
          peak_hours_enabled?: boolean | null
          price: number
          provider_order_id?: string | null
          quantity: number
          remains?: number | null
          service_id?: string | null
          start_count?: number | null
          status?: string | null
          updated_at?: string | null
          use_user_api?: boolean | null
          user_id: string
          user_provider_account_id?: string | null
          user_service_id?: string | null
          variance_percent?: number | null
        }
        Update: {
          created_at?: string | null
          drip_interval?: number | null
          drip_interval_unit?: string | null
          drip_quantity_per_run?: number | null
          drip_runs?: number | null
          error_message?: string | null
          id?: string
          is_drip_feed?: boolean | null
          is_organic_mode?: boolean | null
          link?: string
          order_number?: number
          peak_hours_enabled?: boolean | null
          price?: number
          provider_order_id?: string | null
          quantity?: number
          remains?: number | null
          service_id?: string | null
          start_count?: number | null
          status?: string | null
          updated_at?: string | null
          use_user_api?: boolean | null
          user_id?: string
          user_provider_account_id?: string | null
          user_service_id?: string | null
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_provider_account_id_fkey"
            columns: ["user_provider_account_id"]
            isOneToOne: false
            referencedRelation: "user_provider_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "user_services"
            referencedColumns: ["id"]
          },
        ]
      }
      organic_run_schedule: {
        Row: {
          base_quantity: number
          completed_at: string | null
          created_at: string | null
          engagement_order_item_id: string | null
          error_message: string | null
          id: string
          last_status_check: string | null
          order_id: string | null
          peak_multiplier: number | null
          provider_account_id: string | null
          provider_account_name: string | null
          provider_charge: number | null
          provider_order_id: string | null
          provider_remains: number | null
          provider_response: Json | null
          provider_start_count: number | null
          provider_status: string | null
          quantity_to_send: number
          retry_count: number | null
          run_number: number
          scheduled_at: string
          started_at: string | null
          status: string | null
          variance_applied: number | null
        }
        Insert: {
          base_quantity: number
          completed_at?: string | null
          created_at?: string | null
          engagement_order_item_id?: string | null
          error_message?: string | null
          id?: string
          last_status_check?: string | null
          order_id?: string | null
          peak_multiplier?: number | null
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_charge?: number | null
          provider_order_id?: string | null
          provider_remains?: number | null
          provider_response?: Json | null
          provider_start_count?: number | null
          provider_status?: string | null
          quantity_to_send: number
          retry_count?: number | null
          run_number: number
          scheduled_at: string
          started_at?: string | null
          status?: string | null
          variance_applied?: number | null
        }
        Update: {
          base_quantity?: number
          completed_at?: string | null
          created_at?: string | null
          engagement_order_item_id?: string | null
          error_message?: string | null
          id?: string
          last_status_check?: string | null
          order_id?: string | null
          peak_multiplier?: number | null
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_charge?: number | null
          provider_order_id?: string | null
          provider_remains?: number | null
          provider_response?: Json | null
          provider_start_count?: number | null
          provider_status?: string | null
          quantity_to_send?: number
          retry_count?: number | null
          run_number?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string | null
          variance_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organic_run_schedule_engagement_order_item_id_fkey"
            columns: ["engagement_order_item_id"]
            isOneToOne: false
            referencedRelation: "engagement_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organic_run_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          global_markup_percent: number | null
          id: string
          maintenance_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          global_markup_percent?: number | null
          id?: string
          maintenance_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          global_markup_percent?: number | null
          id?: string
          maintenance_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          created_at: string | null
          currency: string | null
          email: string
          full_name: string | null
          id: string
          is_organic_mode_default: boolean | null
          organic_peak_hours_enabled: boolean | null
          organic_ratios: Json | null
          organic_variance_percent: number | null
          telegram_chat_id: string | null
          telegram_id: string | null
          telegram_notifications_enabled: boolean | null
          telegram_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_organic_mode_default?: boolean | null
          organic_peak_hours_enabled?: boolean | null
          organic_ratios?: Json | null
          organic_variance_percent?: number | null
          telegram_chat_id?: string | null
          telegram_id?: string | null
          telegram_notifications_enabled?: boolean | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_organic_mode_default?: boolean | null
          organic_peak_hours_enabled?: boolean | null
          organic_ratios?: Json | null
          organic_variance_percent?: number | null
          telegram_chat_id?: string | null
          telegram_id?: string | null
          telegram_notifications_enabled?: boolean | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      provider_accounts: {
        Row: {
          api_key: string
          api_url: string
          balance: number | null
          balance_checked_at: string | null
          balance_currency: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_balance_error: string | null
          last_low_balance_alert_at: string | null
          last_used_at: string | null
          low_balance_threshold: number
          name: string
          priority: number | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_url: string
          balance?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_balance_error?: string | null
          last_low_balance_alert_at?: string | null
          last_used_at?: string | null
          low_balance_threshold?: number
          name: string
          priority?: number | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          balance?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_balance_error?: string | null
          last_low_balance_alert_at?: string | null
          last_used_at?: string | null
          low_balance_threshold?: number
          name?: string
          priority?: number | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          api_key: string
          api_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_provider_mapping: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          provider_account_id: string | null
          provider_service_id: string
          service_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_account_id?: string | null
          provider_service_id: string
          service_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_account_id?: string | null
          provider_service_id?: string
          service_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_mapping_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_provider_mapping_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          cancel_allowed: string | null
          category: string
          created_at: string | null
          description: string | null
          drip_feed_enabled: boolean | null
          drop_type: string | null
          id: string
          is_active: boolean | null
          max_quantity: number
          min_quantity: number
          name: string
          price: number
          provider_id: string | null
          provider_service_id: string
          quality: string | null
          refill: string | null
          speed: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_allowed?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          drip_feed_enabled?: boolean | null
          drop_type?: string | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number
          min_quantity?: number
          name: string
          price?: number
          provider_id?: string | null
          provider_service_id: string
          quality?: string | null
          refill?: string | null
          speed?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_allowed?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          drip_feed_enabled?: boolean | null
          drop_type?: string | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number
          min_quantity?: number
          name?: string
          price?: number
          provider_id?: string | null
          provider_service_id?: string
          quality?: string | null
          refill?: string | null
          speed?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          plan_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          plan_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          plan_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bundle_item_providers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          priority: number
          provider_service_id: string
          updated_at: string
          user_bundle_item_id: string
          user_id: string
          user_provider_account_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          provider_service_id: string
          updated_at?: string
          user_bundle_item_id: string
          user_id: string
          user_provider_account_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          provider_service_id?: string
          updated_at?: string
          user_bundle_item_id?: string
          user_id?: string
          user_provider_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bundle_item_providers_user_bundle_item_id_fkey"
            columns: ["user_bundle_item_id"]
            isOneToOne: false
            referencedRelation: "user_bundle_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bundle_item_providers_user_provider_account_id_fkey"
            columns: ["user_provider_account_id"]
            isOneToOne: false
            referencedRelation: "user_provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bundle_items: {
        Row: {
          created_at: string
          default_drip_interval: number | null
          default_drip_interval_unit: string | null
          default_drip_qty_per_run: number | null
          engagement_type: string
          id: string
          is_base: boolean | null
          max_qty: number | null
          min_qty: number | null
          provider_service_id: string | null
          rate: number | null
          ratio_percent: number | null
          service_name: string | null
          sort_order: number | null
          user_bundle_id: string
          user_provider_account_id: string | null
          user_service_id: string | null
        }
        Insert: {
          created_at?: string
          default_drip_interval?: number | null
          default_drip_interval_unit?: string | null
          default_drip_qty_per_run?: number | null
          engagement_type: string
          id?: string
          is_base?: boolean | null
          max_qty?: number | null
          min_qty?: number | null
          provider_service_id?: string | null
          rate?: number | null
          ratio_percent?: number | null
          service_name?: string | null
          sort_order?: number | null
          user_bundle_id: string
          user_provider_account_id?: string | null
          user_service_id?: string | null
        }
        Update: {
          created_at?: string
          default_drip_interval?: number | null
          default_drip_interval_unit?: string | null
          default_drip_qty_per_run?: number | null
          engagement_type?: string
          id?: string
          is_base?: boolean | null
          max_qty?: number | null
          min_qty?: number | null
          provider_service_id?: string | null
          rate?: number | null
          ratio_percent?: number | null
          service_name?: string | null
          sort_order?: number | null
          user_bundle_id?: string
          user_provider_account_id?: string | null
          user_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_bundle_items_user_bundle_id_fkey"
            columns: ["user_bundle_id"]
            isOneToOne: false
            referencedRelation: "user_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bundle_items_user_provider_account_id_fkey"
            columns: ["user_provider_account_id"]
            isOneToOne: false
            referencedRelation: "user_provider_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bundle_items_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "user_services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bundles: {
        Row: {
          ai_organic_enabled: boolean | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          platform: string
          sort_order: number | null
          updated_at: string
          use_custom_ratios: boolean | null
          user_id: string
        }
        Insert: {
          ai_organic_enabled?: boolean | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          platform: string
          sort_order?: number | null
          updated_at?: string
          use_custom_ratios?: boolean | null
          user_id: string
        }
        Update: {
          ai_organic_enabled?: boolean | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string
          sort_order?: number | null
          updated_at?: string
          use_custom_ratios?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_provider_accounts: {
        Row: {
          api_key: string
          api_url: string
          balance: number | null
          balance_checked_at: string | null
          balance_currency: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_balance_error: string | null
          name: string
          priority: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_url: string
          balance?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_balance_error?: string | null
          name: string
          priority?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_url?: string
          balance?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_balance_error?: string | null
          name?: string
          priority?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_services: {
        Row: {
          cancel_allowed: string | null
          category: string
          created_at: string
          description: string | null
          drip_feed_enabled: boolean | null
          id: string
          is_active: boolean | null
          markup_percent: number | null
          max_quantity: number
          min_quantity: number
          name: string
          price: number
          provider_service_id: string
          refill: string | null
          type: string | null
          updated_at: string
          user_id: string
          user_provider_account_id: string
        }
        Insert: {
          cancel_allowed?: string | null
          category: string
          created_at?: string
          description?: string | null
          drip_feed_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          markup_percent?: number | null
          max_quantity?: number
          min_quantity?: number
          name: string
          price?: number
          provider_service_id: string
          refill?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
          user_provider_account_id: string
        }
        Update: {
          cancel_allowed?: string | null
          category?: string
          created_at?: string
          description?: string | null
          drip_feed_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          markup_percent?: number | null
          max_quantity?: number
          min_quantity?: number
          name?: string
          price?: number
          provider_service_id?: string
          refill?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
          user_provider_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_services_user_provider_account_id_fkey"
            columns: ["user_provider_account_id"]
            isOneToOne: false
            referencedRelation: "user_provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          total_deposited: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      providers_public: {
        Row: {
          api_url: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          api_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          api_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_activate_subscription_by_email: {
        Args: { _admin_id?: string; _email: string; _plan_type: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      claim_user_api_run_provider: {
        Args: {
          _engagement_type: string
          _link: string
          _provider_account_id: string
          _provider_account_name: string
          _run_id: string
        }
        Returns: boolean
      }
      cleanup_old_completed_engagement_orders: { Args: never; Returns: Json }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_users_summary: { Args: never; Returns: Json }
      get_engagement_order_run_stats: {
        Args: { _order_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_maintenance_mode: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
