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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          at: string
          by_agent_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          lead_id: string | null
          owner_id: string | null
          property_id: string | null
          summary: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          at?: string
          by_agent_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          property_id?: string | null
          summary: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          at?: string
          by_agent_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          property_id?: string | null
          summary?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_by_agent_id_fkey"
            columns: ["by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_hr: {
        Row: {
          agent_id: string
          commission_exempt: boolean
          created_at: string
          created_by: string | null
          date_joined: string | null
          deleted_at: string | null
          document_links: string | null
          notes: string | null
          personal_address: string | null
          personal_email: string | null
          personal_phone: string | null
          probation_end_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id: string
          commission_exempt?: boolean
          created_at?: string
          created_by?: string | null
          date_joined?: string | null
          deleted_at?: string | null
          document_links?: string | null
          notes?: string | null
          personal_address?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          probation_end_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string
          commission_exempt?: boolean
          created_at?: string
          created_by?: string | null
          date_joined?: string | null
          deleted_at?: string | null
          document_links?: string | null
          notes?: string | null
          personal_address?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          probation_end_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_hr_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_targets: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          metric: string
          period: string
          target_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          metric: string
          period: string
          target_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          metric?: string
          period?: string
          target_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_targets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          airtable_collaborator_email: string | null
          airtable_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          full_name: string
          id: string
          public_name: string | null
          public_whatsapp: string | null
          role: Database["public"]["Enums"]["agent_role"]
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          updated_by: string | null
          user_id: string | null
          weekly_day_off: Database["public"]["Enums"]["weekday"] | null
          work_email: string | null
        }
        Insert: {
          airtable_collaborator_email?: string | null
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name: string
          id?: string
          public_name?: string | null
          public_whatsapp?: string | null
          role?: Database["public"]["Enums"]["agent_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          weekly_day_off?: Database["public"]["Enums"]["weekday"] | null
          work_email?: string | null
        }
        Update: {
          airtable_collaborator_email?: string | null
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name?: string
          id?: string
          public_name?: string | null
          public_whatsapp?: string | null
          role?: Database["public"]["Enums"]["agent_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          weekly_day_off?: Database["public"]["Enums"]["weekday"] | null
          work_email?: string | null
        }
        Relationships: []
      }
      airtable_user_map: {
        Row: {
          agent_id: string | null
          airtable_email: string | null
          airtable_name: string | null
          airtable_user_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id?: string | null
          airtable_email?: string | null
          airtable_name?: string | null
          airtable_user_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string | null
          airtable_email?: string | null
          airtable_name?: string | null
          airtable_user_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airtable_user_map_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          after: Json | null
          before: Json | null
          changed_at: string
          changed_by: string | null
          id: number
          record_id: string
          source: Database["public"]["Enums"]["change_source"]
          table_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          id?: never
          record_id: string
          source?: Database["public"]["Enums"]["change_source"]
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          id?: never
          record_id?: string
          source?: Database["public"]["Enums"]["change_source"]
          table_name?: string
        }
        Relationships: []
      }
      closings: {
        Row: {
          agent_total: number | null
          airtable_id: string | null
          axe_total: number | null
          closing_agent_id: string | null
          closing_date: string
          closing_no: number
          co_broke_external_agent_id: string | null
          co_broke_split_pct: number | null
          commission_currency: Database["public"]["Enums"]["currency"] | null
          commission_schedule_id: string | null
          created_at: string
          created_by: string | null
          deal_currency: Database["public"]["Enums"]["currency"] | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          deleted_at: string | null
          gross_commission: number | null
          id: string
          lead_agent_exempt: boolean | null
          lead_agent_payout: number | null
          lead_agent_rate: number | null
          lead_agent_tenure: Database["public"]["Enums"]["agent_tenure"] | null
          lead_axe_payout: number | null
          lead_axe_rate: number | null
          lead_id: string | null
          lead_referrer_payout: number | null
          lead_referrer_rate: number | null
          lead_side_agent_id: string | null
          lead_side_paid_to_referrer: number | null
          lead_side_referral_partner_id: string | null
          lead_sourcing_model:
            | Database["public"]["Enums"]["sourcing_model"]
            | null
          lease_end_date: string | null
          lease_start_date: string | null
          listing_agent_exempt: boolean | null
          listing_agent_payout: number | null
          listing_agent_rate: number | null
          listing_agent_tenure:
            | Database["public"]["Enums"]["agent_tenure"]
            | null
          listing_axe_payout: number | null
          listing_axe_rate: number | null
          listing_referrer_payout: number | null
          listing_referrer_rate: number | null
          listing_side_agent_id: string | null
          listing_side_paid_to_referrer: number | null
          listing_side_referral_partner_id: string | null
          listing_sourcing_model:
            | Database["public"]["Enums"]["sourcing_model"]
            | null
          monthly_rent: number | null
          monthly_rent_usd: number | null
          notes: string | null
          our_commission: number | null
          payment_method_legacy:
            | Database["public"]["Enums"]["payment_method"]
            | null
          property_id: string | null
          referrer_total: number | null
          rent_advance_months: number | null
          rent_per_sqft_usd: number | null
          sale_price_per_sqft_usd: number | null
          security_deposit_months: number | null
          snap_beds: number | null
          snap_development_id: string | null
          snap_furnished: Database["public"]["Enums"]["furnishing"] | null
          snap_lead_source_channel_id: string | null
          snap_lead_source_type:
            | Database["public"]["Enums"]["source_type"]
            | null
          snap_location_id: string | null
          snap_property_source_channel_id: string | null
          snap_property_type:
            | Database["public"]["Enums"]["property_type"]
            | null
          snap_square_feet: number | null
          split_delta: number | null
          split_override_reason: string | null
          total_deal_value: number | null
          total_deal_value_usd: number | null
          updated_at: string
          updated_by: string | null
          usd_lkr_rate: number | null
        }
        Insert: {
          agent_total?: number | null
          airtable_id?: string | null
          axe_total?: number | null
          closing_agent_id?: string | null
          closing_date: string
          closing_no?: number
          co_broke_external_agent_id?: string | null
          co_broke_split_pct?: number | null
          commission_currency?: Database["public"]["Enums"]["currency"] | null
          commission_schedule_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_currency?: Database["public"]["Enums"]["currency"] | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          deleted_at?: string | null
          gross_commission?: number | null
          id?: string
          lead_agent_exempt?: boolean | null
          lead_agent_payout?: number | null
          lead_agent_rate?: number | null
          lead_agent_tenure?: Database["public"]["Enums"]["agent_tenure"] | null
          lead_axe_payout?: number | null
          lead_axe_rate?: number | null
          lead_id?: string | null
          lead_referrer_payout?: number | null
          lead_referrer_rate?: number | null
          lead_side_agent_id?: string | null
          lead_side_paid_to_referrer?: number | null
          lead_side_referral_partner_id?: string | null
          lead_sourcing_model?:
            | Database["public"]["Enums"]["sourcing_model"]
            | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          listing_agent_exempt?: boolean | null
          listing_agent_payout?: number | null
          listing_agent_rate?: number | null
          listing_agent_tenure?:
            | Database["public"]["Enums"]["agent_tenure"]
            | null
          listing_axe_payout?: number | null
          listing_axe_rate?: number | null
          listing_referrer_payout?: number | null
          listing_referrer_rate?: number | null
          listing_side_agent_id?: string | null
          listing_side_paid_to_referrer?: number | null
          listing_side_referral_partner_id?: string | null
          listing_sourcing_model?:
            | Database["public"]["Enums"]["sourcing_model"]
            | null
          monthly_rent?: number | null
          monthly_rent_usd?: number | null
          notes?: string | null
          our_commission?: number | null
          payment_method_legacy?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          property_id?: string | null
          referrer_total?: number | null
          rent_advance_months?: number | null
          rent_per_sqft_usd?: number | null
          sale_price_per_sqft_usd?: number | null
          security_deposit_months?: number | null
          snap_beds?: number | null
          snap_development_id?: string | null
          snap_furnished?: Database["public"]["Enums"]["furnishing"] | null
          snap_lead_source_channel_id?: string | null
          snap_lead_source_type?:
            | Database["public"]["Enums"]["source_type"]
            | null
          snap_location_id?: string | null
          snap_property_source_channel_id?: string | null
          snap_property_type?:
            | Database["public"]["Enums"]["property_type"]
            | null
          snap_square_feet?: number | null
          split_delta?: number | null
          split_override_reason?: string | null
          total_deal_value?: number | null
          total_deal_value_usd?: number | null
          updated_at?: string
          updated_by?: string | null
          usd_lkr_rate?: number | null
        }
        Update: {
          agent_total?: number | null
          airtable_id?: string | null
          axe_total?: number | null
          closing_agent_id?: string | null
          closing_date?: string
          closing_no?: number
          co_broke_external_agent_id?: string | null
          co_broke_split_pct?: number | null
          commission_currency?: Database["public"]["Enums"]["currency"] | null
          commission_schedule_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_currency?: Database["public"]["Enums"]["currency"] | null
          deal_type?: Database["public"]["Enums"]["deal_type"]
          deleted_at?: string | null
          gross_commission?: number | null
          id?: string
          lead_agent_exempt?: boolean | null
          lead_agent_payout?: number | null
          lead_agent_rate?: number | null
          lead_agent_tenure?: Database["public"]["Enums"]["agent_tenure"] | null
          lead_axe_payout?: number | null
          lead_axe_rate?: number | null
          lead_id?: string | null
          lead_referrer_payout?: number | null
          lead_referrer_rate?: number | null
          lead_side_agent_id?: string | null
          lead_side_paid_to_referrer?: number | null
          lead_side_referral_partner_id?: string | null
          lead_sourcing_model?:
            | Database["public"]["Enums"]["sourcing_model"]
            | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          listing_agent_exempt?: boolean | null
          listing_agent_payout?: number | null
          listing_agent_rate?: number | null
          listing_agent_tenure?:
            | Database["public"]["Enums"]["agent_tenure"]
            | null
          listing_axe_payout?: number | null
          listing_axe_rate?: number | null
          listing_referrer_payout?: number | null
          listing_referrer_rate?: number | null
          listing_side_agent_id?: string | null
          listing_side_paid_to_referrer?: number | null
          listing_side_referral_partner_id?: string | null
          listing_sourcing_model?:
            | Database["public"]["Enums"]["sourcing_model"]
            | null
          monthly_rent?: number | null
          monthly_rent_usd?: number | null
          notes?: string | null
          our_commission?: number | null
          payment_method_legacy?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          property_id?: string | null
          referrer_total?: number | null
          rent_advance_months?: number | null
          rent_per_sqft_usd?: number | null
          sale_price_per_sqft_usd?: number | null
          security_deposit_months?: number | null
          snap_beds?: number | null
          snap_development_id?: string | null
          snap_furnished?: Database["public"]["Enums"]["furnishing"] | null
          snap_lead_source_channel_id?: string | null
          snap_lead_source_type?:
            | Database["public"]["Enums"]["source_type"]
            | null
          snap_location_id?: string | null
          snap_property_source_channel_id?: string | null
          snap_property_type?:
            | Database["public"]["Enums"]["property_type"]
            | null
          snap_square_feet?: number | null
          split_delta?: number | null
          split_override_reason?: string | null
          total_deal_value?: number | null
          total_deal_value_usd?: number | null
          updated_at?: string
          updated_by?: string | null
          usd_lkr_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closings_closing_agent_id_fkey"
            columns: ["closing_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_co_broke_external_agent_id_fkey"
            columns: ["co_broke_external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_commission_schedule_id_fkey"
            columns: ["commission_schedule_id"]
            isOneToOne: false
            referencedRelation: "commission_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_lead_side_agent_id_fkey"
            columns: ["lead_side_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_lead_side_referral_partner_id_fkey"
            columns: ["lead_side_referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_listing_side_agent_id_fkey"
            columns: ["listing_side_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_listing_side_referral_partner_id_fkey"
            columns: ["listing_side_referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          amount: number
          closing_id: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          cycle: string | null
          deleted_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_on: string | null
          payee_agent_id: string | null
          payee_referral_partner_id: string | null
          payee_type: Database["public"]["Enums"]["payee_type"]
          side: Database["public"]["Enums"]["deal_side"]
          updated_at: string
          updated_by: string | null
          withholding_tax: number | null
        }
        Insert: {
          amount: number
          closing_id: string
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["currency"]
          cycle?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_on?: string | null
          payee_agent_id?: string | null
          payee_referral_partner_id?: string | null
          payee_type: Database["public"]["Enums"]["payee_type"]
          side: Database["public"]["Enums"]["deal_side"]
          updated_at?: string
          updated_by?: string | null
          withholding_tax?: number | null
        }
        Update: {
          amount?: number
          closing_id?: string
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          cycle?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_on?: string | null
          payee_agent_id?: string | null
          payee_referral_partner_id?: string | null
          payee_type?: Database["public"]["Enums"]["payee_type"]
          side?: Database["public"]["Enums"]["deal_side"]
          updated_at?: string
          updated_by?: string | null
          withholding_tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_payee_agent_id_fkey"
            columns: ["payee_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_payee_referral_partner_id_fkey"
            columns: ["payee_referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_receipts: {
        Row: {
          amount: number
          closing_id: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          deleted_at: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          received_by_agent_id: string | null
          received_into: string | null
          received_on: string
          reference: string | null
          updated_at: string
          updated_by: string | null
          usd_lkr_rate: number
        }
        Insert: {
          amount: number
          closing_id: string
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["currency"]
          deleted_at?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          received_by_agent_id?: string | null
          received_into?: string | null
          received_on: string
          reference?: string | null
          updated_at?: string
          updated_by?: string | null
          usd_lkr_rate: number
        }
        Update: {
          amount?: number
          closing_id?: string
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          deleted_at?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          received_by_agent_id?: string | null
          received_into?: string | null
          received_on?: string
          reference?: string | null
          updated_at?: string
          updated_by?: string | null
          usd_lkr_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_receipts_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_receipts_received_by_agent_id_fkey"
            columns: ["received_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_schedule_rates: {
        Row: {
          agent_rate: number
          axe_rate: number
          created_at: string
          referrer_rate: number
          schedule_id: string
          sourcing_model: Database["public"]["Enums"]["sourcing_model"]
          tenure: Database["public"]["Enums"]["agent_tenure"]
        }
        Insert: {
          agent_rate: number
          axe_rate: number
          created_at?: string
          referrer_rate: number
          schedule_id: string
          sourcing_model: Database["public"]["Enums"]["sourcing_model"]
          tenure: Database["public"]["Enums"]["agent_tenure"]
        }
        Update: {
          agent_rate?: number
          axe_rate?: number
          created_at?: string
          referrer_rate?: number
          schedule_id?: string
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"]
          tenure?: Database["public"]["Enums"]["agent_tenure"]
        }
        Relationships: [
          {
            foreignKeyName: "commission_schedule_rates_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "commission_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          name: string
          notes: string | null
          referrer_rate_pct: number
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          name: string
          notes?: string | null
          referrer_rate_pct?: number
          updated_at?: string
          updated_by?: string | null
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          name?: string
          notes?: string | null
          referrer_rate_pct?: number
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      company_targets: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          metric: string
          notes: string | null
          period: string
          target_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          metric?: string
          notes?: string | null
          period?: string
          target_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          metric?: string
          notes?: string | null
          period?: string
          target_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      development_facilities: {
        Row: {
          created_at: string
          development_id: string
          facility_id: string
        }
        Insert: {
          created_at?: string
          development_id: string
          facility_id: string
        }
        Update: {
          created_at?: string
          development_id?: string
          facility_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_facilities_development_id_fkey"
            columns: ["development_id"]
            isOneToOne: false
            referencedRelation: "developments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      development_towers: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          development_id: string
          id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          development_id: string
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          development_id?: string
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_towers_development_id_fkey"
            columns: ["development_id"]
            isOneToOne: false
            referencedRelation: "developments"
            referencedColumns: ["id"]
          },
        ]
      }
      developments: {
        Row: {
          airtable_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          developer_builder: string | null
          development_status:
            | Database["public"]["Enums"]["development_status"]
            | null
          hero_image_path: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          seo_body: string | null
          seo_faq: Json | null
          seo_intro: string | null
          seo_meta_description: string | null
          seo_title: string | null
          slug: string | null
          total_units: number | null
          towers_blocks: string | null
          updated_at: string
          updated_by: string | null
          website_image: Json | null
          year_completed: number | null
        }
        Insert: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developer_builder?: string | null
          development_status?:
            | Database["public"]["Enums"]["development_status"]
            | null
          hero_image_path?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          seo_body?: string | null
          seo_faq?: Json | null
          seo_intro?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string | null
          total_units?: number | null
          towers_blocks?: string | null
          updated_at?: string
          updated_by?: string | null
          website_image?: Json | null
          year_completed?: number | null
        }
        Update: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developer_builder?: string | null
          development_status?:
            | Database["public"]["Enums"]["development_status"]
            | null
          hero_image_path?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          seo_body?: string | null
          seo_faq?: Json | null
          seo_intro?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string | null
          total_units?: number | null
          towers_blocks?: string | null
          updated_at?: string
          updated_by?: string | null
          website_image?: Json | null
          year_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "developments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_agent_locations: {
        Row: {
          created_at: string
          external_agent_id: string
          location_id: string
        }
        Insert: {
          created_at?: string
          external_agent_id: string
          location_id: string
        }
        Update: {
          created_at?: string
          external_agent_id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_agent_locations_external_agent_id_fkey"
            columns: ["external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_agent_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_agents: {
        Row: {
          agent_name: string
          airtable_id: string | null
          areas_covered_text: string | null
          company: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          reliability: number | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          agent_name: string
          airtable_id?: string | null
          areas_covered_text?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          reliability?: number | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          agent_name?: string
          airtable_id?: string | null
          areas_covered_text?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          reliability?: number | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          created_by: string | null
          created_record_id: string | null
          created_record_table: string | null
          deleted_at: string | null
          form: string
          id: string
          ip_hash: string | null
          payload: Json
          processed_at: string | null
          processing_error: string | null
          updated_at: string
          updated_by: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_record_id?: string | null
          created_record_table?: string | null
          deleted_at?: string | null
          form: string
          id?: string
          ip_hash?: string | null
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_record_id?: string | null
          created_record_table?: string | null
          deleted_at?: string | null
          form?: string
          id?: string
          ip_hash?: string | null
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          note: string | null
          pinned_until: string | null
          provider: string | null
          rate_date: string
          source: Database["public"]["Enums"]["fx_source"]
          updated_at: string
          updated_by: string | null
          usd_lkr: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          pinned_until?: string | null
          provider?: string | null
          rate_date: string
          source: Database["public"]["Enums"]["fx_source"]
          updated_at?: string
          updated_by?: string | null
          usd_lkr: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          pinned_until?: string | null
          provider?: string | null
          rate_date?: string
          source?: Database["public"]["Enums"]["fx_source"]
          updated_at?: string
          updated_by?: string | null
          usd_lkr?: number
        }
        Relationships: []
      }
      gate_breach_attempts: {
        Row: {
          attempted_at: string
          attempted_by: string | null
          attempted_status: Database["public"]["Enums"]["pipeline_status"]
          id: string
          lead_id: string
          missing_items: string[]
        }
        Insert: {
          attempted_at?: string
          attempted_by?: string | null
          attempted_status: Database["public"]["Enums"]["pipeline_status"]
          id?: string
          lead_id: string
          missing_items: string[]
        }
        Update: {
          attempted_at?: string
          attempted_by?: string | null
          attempted_status?: Database["public"]["Enums"]["pipeline_status"]
          id?: string
          lead_id?: string
          missing_items?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "gate_breach_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_items: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          gate: number
          key: string
          label: string
          required_for: Database["public"]["Enums"]["pipeline_status"]
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          gate: number
          key: string
          label: string
          required_for: Database["public"]["Enums"]["pipeline_status"]
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          gate?: number
          key?: string
          label?: string
          required_for?: Database["public"]["Enums"]["pipeline_status"]
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_features_wanted: {
        Row: {
          created_at: string
          feature_id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          lead_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_features_wanted_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "property_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_features_wanted_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_gate_ticks: {
        Row: {
          created_at: string
          gate_item_key: string
          lead_id: string
          ticked_at: string
          ticked_by: string | null
        }
        Insert: {
          created_at?: string
          gate_item_key: string
          lead_id: string
          ticked_at?: string
          ticked_by?: string | null
        }
        Update: {
          created_at?: string
          gate_item_key?: string
          lead_id?: string
          ticked_at?: string
          ticked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_gate_ticks_gate_item_key_fkey"
            columns: ["gate_item_key"]
            isOneToOne: false
            referencedRelation: "gate_items"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "lead_gate_ticks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_preferred_developments: {
        Row: {
          created_at: string
          development_id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          development_id: string
          lead_id: string
        }
        Update: {
          created_at?: string
          development_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_preferred_developments_development_id_fkey"
            columns: ["development_id"]
            isOneToOne: false
            referencedRelation: "developments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_preferred_developments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_preferred_locations: {
        Row: {
          created_at: string
          lead_id: string
          location_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          location_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_preferred_locations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_preferred_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["pipeline_status"] | null
          id: string
          lead_id: string
          override_reason: string | null
          to_status: Database["public"]["Enums"]["pipeline_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["pipeline_status"] | null
          id?: string
          lead_id: string
          override_reason?: string | null
          to_status: Database["public"]["Enums"]["pipeline_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["pipeline_status"] | null
          id?: string
          lead_id?: string
          override_reason?: string | null
          to_status?: Database["public"]["Enums"]["pipeline_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_lead_summary: string | null
          airtable_id: string | null
          assigned_agent_id: string | null
          bedrooms: number | null
          budget_currency: Database["public"]["Enums"]["currency"] | null
          budget_max: number | null
          budget_min: number | null
          company: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          detailed_requirements: string | null
          email: string | null
          fbclid: string | null
          financing: Database["public"]["Enums"]["financing"] | null
          id: string
          internal_notes: string | null
          last_contacted: string | null
          lead_code: string | null
          lead_source_type: Database["public"]["Enums"]["source_type"] | null
          linked_owner_id: string | null
          looking_for: Database["public"]["Enums"]["looking_for"] | null
          lost_reason_id: string | null
          move_in_date: string | null
          name: string
          nationality_code: string | null
          occupants: number | null
          phone: string | null
          pipeline_status: Database["public"]["Enums"]["pipeline_status"]
          profile: Database["public"]["Enums"]["lead_profile"] | null
          property_types_wanted: Database["public"]["Enums"]["property_type"][]
          purchase_timeline:
            | Database["public"]["Enums"]["purchase_timeline"]
            | null
          referral_partner_id: string | null
          referring_external_agent_id: string | null
          seq_no: number | null
          source_channel_id: string | null
          sourcing_model: Database["public"]["Enums"]["sourcing_model"] | null
          updated_at: string
          updated_by: string | null
          urgency: Database["public"]["Enums"]["urgency"] | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ai_lead_summary?: string | null
          airtable_id?: string | null
          assigned_agent_id?: string | null
          bedrooms?: number | null
          budget_currency?: Database["public"]["Enums"]["currency"] | null
          budget_max?: number | null
          budget_min?: number | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          detailed_requirements?: string | null
          email?: string | null
          fbclid?: string | null
          financing?: Database["public"]["Enums"]["financing"] | null
          id?: string
          internal_notes?: string | null
          last_contacted?: string | null
          lead_code?: string | null
          lead_source_type?: Database["public"]["Enums"]["source_type"] | null
          linked_owner_id?: string | null
          looking_for?: Database["public"]["Enums"]["looking_for"] | null
          lost_reason_id?: string | null
          move_in_date?: string | null
          name: string
          nationality_code?: string | null
          occupants?: number | null
          phone?: string | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          profile?: Database["public"]["Enums"]["lead_profile"] | null
          property_types_wanted?: Database["public"]["Enums"]["property_type"][]
          purchase_timeline?:
            | Database["public"]["Enums"]["purchase_timeline"]
            | null
          referral_partner_id?: string | null
          referring_external_agent_id?: string | null
          seq_no?: number | null
          source_channel_id?: string | null
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"] | null
          updated_at?: string
          updated_by?: string | null
          urgency?: Database["public"]["Enums"]["urgency"] | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ai_lead_summary?: string | null
          airtable_id?: string | null
          assigned_agent_id?: string | null
          bedrooms?: number | null
          budget_currency?: Database["public"]["Enums"]["currency"] | null
          budget_max?: number | null
          budget_min?: number | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          detailed_requirements?: string | null
          email?: string | null
          fbclid?: string | null
          financing?: Database["public"]["Enums"]["financing"] | null
          id?: string
          internal_notes?: string | null
          last_contacted?: string | null
          lead_code?: string | null
          lead_source_type?: Database["public"]["Enums"]["source_type"] | null
          linked_owner_id?: string | null
          looking_for?: Database["public"]["Enums"]["looking_for"] | null
          lost_reason_id?: string | null
          move_in_date?: string | null
          name?: string
          nationality_code?: string | null
          occupants?: number | null
          phone?: string | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          profile?: Database["public"]["Enums"]["lead_profile"] | null
          property_types_wanted?: Database["public"]["Enums"]["property_type"][]
          purchase_timeline?:
            | Database["public"]["Enums"]["purchase_timeline"]
            | null
          referral_partner_id?: string | null
          referring_external_agent_id?: string | null
          seq_no?: number | null
          source_channel_id?: string | null
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"] | null
          updated_at?: string
          updated_by?: string | null
          urgency?: Database["public"]["Enums"]["urgency"] | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_linked_owner_id_fkey"
            columns: ["linked_owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lost_reason_id_fkey"
            columns: ["lost_reason_id"]
            isOneToOne: false
            referencedRelation: "lost_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_nationality_code_fkey"
            columns: ["nationality_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "leads_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referring_external_agent_id_fkey"
            columns: ["referring_external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_channel_id_fkey"
            columns: ["source_channel_id"]
            isOneToOne: false
            referencedRelation: "source_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          airtable_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          market_tier: Database["public"]["Enums"]["market_tier"] | null
          name: string
          notes: string | null
          postal_code: string | null
          province_id: string | null
          seo_body: string | null
          seo_faq: Json | null
          seo_intro: string | null
          seo_meta_description: string | null
          seo_title: string | null
          slug: string | null
          updated_at: string
          updated_by: string | null
          website_image: Json | null
        }
        Insert: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          market_tier?: Database["public"]["Enums"]["market_tier"] | null
          name: string
          notes?: string | null
          postal_code?: string | null
          province_id?: string | null
          seo_body?: string | null
          seo_faq?: Json | null
          seo_intro?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string | null
          updated_at?: string
          updated_by?: string | null
          website_image?: Json | null
        }
        Update: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          market_tier?: Database["public"]["Enums"]["market_tier"] | null
          name?: string
          notes?: string | null
          postal_code?: string | null
          province_id?: string | null
          seo_body?: string | null
          seo_faq?: Json | null
          seo_intro?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string | null
          updated_at?: string
          updated_by?: string | null
          website_image?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_reasons: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          airtable_id: string | null
          audience_type:
            | Database["public"]["Enums"]["marketing_audience"]
            | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          development_or_area: string | null
          email: string
          fbclid: string | null
          id: string
          marketing_opt_in: boolean
          name: string | null
          notes: string | null
          promoted_to_external_agent_id: string | null
          promoted_to_lead_id: string | null
          promoted_to_owner_id: string | null
          promoted_to_referral_partner_id: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["marketing_status"]
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string | null
        }
        Insert: {
          airtable_id?: string | null
          audience_type?:
            | Database["public"]["Enums"]["marketing_audience"]
            | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          development_or_area?: string | null
          email: string
          fbclid?: string | null
          id?: string
          marketing_opt_in?: boolean
          name?: string | null
          notes?: string | null
          promoted_to_external_agent_id?: string | null
          promoted_to_lead_id?: string | null
          promoted_to_owner_id?: string | null
          promoted_to_referral_partner_id?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Update: {
          airtable_id?: string | null
          audience_type?:
            | Database["public"]["Enums"]["marketing_audience"]
            | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          development_or_area?: string | null
          email?: string
          fbclid?: string | null
          id?: string
          marketing_opt_in?: boolean
          name?: string | null
          notes?: string | null
          promoted_to_external_agent_id?: string | null
          promoted_to_lead_id?: string | null
          promoted_to_owner_id?: string | null
          promoted_to_referral_partner_id?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_promoted_to_external_agent_id_fkey"
            columns: ["promoted_to_external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_promoted_to_lead_id_fkey"
            columns: ["promoted_to_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_promoted_to_owner_id_fkey"
            columns: ["promoted_to_owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_promoted_to_referral_partner_id_fkey"
            columns: ["promoted_to_referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "marketing_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sources: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      match_results: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          matched_id: string
          matched_table: string
          model: string | null
          rank: number
          reason: string | null
          run_id: string
          source_id: string
          source_table: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          matched_id: string
          matched_table: string
          model?: string | null
          rank: number
          reason?: string | null
          run_id: string
          source_id: string
          source_table: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          matched_id?: string
          matched_table?: string
          model?: string | null
          rank?: number
          reason?: string | null
          run_id?: string
          source_id?: string
          source_table?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email_sent_at: string | null
          email_status: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          recipient_agent_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          recipient_agent_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          recipient_agent_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_agent_id_fkey"
            columns: ["recipient_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          created_by: string | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          deleted_at: string | null
          id: string
          issued_on: string
          lead_id: string
          property_id: string | null
          ref: string
          sent_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          terms: Json
          updated_at: string
          updated_by: string | null
          valid_until: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          deleted_at?: string | null
          id?: string
          issued_on?: string
          lead_id: string
          property_id?: string | null
          ref?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: Json
          updated_at?: string
          updated_by?: string | null
          valid_until: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_type?: Database["public"]["Enums"]["deal_type"]
          deleted_at?: string | null
          id?: string
          issued_on?: string
          lead_id?: string
          property_id?: string | null
          ref?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: Json
          updated_at?: string
          updated_by?: string | null
          valid_until?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_buying_locations: {
        Row: {
          created_at: string
          location_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          location_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          location_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_buying_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_buying_locations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_source_external_agents: {
        Row: {
          created_at: string
          external_agent_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          external_agent_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          external_agent_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_source_external_agents_external_agent_id_fkey"
            columns: ["external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_source_external_agents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_sources: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      owners: {
        Row: {
          address: string | null
          ai_buyer_summary: string | null
          airtable_id: string | null
          buying_budget_currency: Database["public"]["Enums"]["currency"] | null
          buying_budget_max: number | null
          buying_budget_min: number | null
          buying_looking_for: Database["public"]["Enums"]["looking_for"] | null
          buying_notes: string | null
          buying_property_types: Database["public"]["Enums"]["property_type"][]
          contact_notes: string | null
          contact_protocol:
            | Database["public"]["Enums"]["contact_protocol"]
            | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          investor_type: Database["public"]["Enums"]["investor_type"] | null
          name: string
          notes: string | null
          open_to_buying: boolean
          owner_source_id: string | null
          mandate_status: Database["public"]["Enums"]["mandate_status"] | null
          mandate_updated_at: string | null
          owner_type: Database["public"]["Enums"]["owner_type"] | null
          primary_phone: string | null
          sourced_by_agent_id: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          ai_buyer_summary?: string | null
          airtable_id?: string | null
          buying_budget_currency?:
            | Database["public"]["Enums"]["currency"]
            | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          buying_looking_for?: Database["public"]["Enums"]["looking_for"] | null
          buying_notes?: string | null
          buying_property_types?: Database["public"]["Enums"]["property_type"][]
          contact_notes?: string | null
          contact_protocol?:
            | Database["public"]["Enums"]["contact_protocol"]
            | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          investor_type?: Database["public"]["Enums"]["investor_type"] | null
          name: string
          notes?: string | null
          open_to_buying?: boolean
          owner_source_id?: string | null
          mandate_status?: Database["public"]["Enums"]["mandate_status"] | null
          mandate_updated_at?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"] | null
          primary_phone?: string | null
          sourced_by_agent_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          ai_buyer_summary?: string | null
          airtable_id?: string | null
          buying_budget_currency?:
            | Database["public"]["Enums"]["currency"]
            | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          buying_looking_for?: Database["public"]["Enums"]["looking_for"] | null
          buying_notes?: string | null
          buying_property_types?: Database["public"]["Enums"]["property_type"][]
          contact_notes?: string | null
          contact_protocol?:
            | Database["public"]["Enums"]["contact_protocol"]
            | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          investor_type?: Database["public"]["Enums"]["investor_type"] | null
          name?: string
          notes?: string | null
          open_to_buying?: boolean
          owner_source_id?: string | null
          mandate_status?: Database["public"]["Enums"]["mandate_status"] | null
          mandate_updated_at?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"] | null
          primary_phone?: string | null
          sourced_by_agent_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owners_owner_source_id_fkey"
            columns: ["owner_source_id"]
            isOneToOne: false
            referencedRelation: "owner_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_sourced_by_agent_id_fkey"
            columns: ["sourced_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field: string
          id: string
          new_amount: number | null
          new_currency: Database["public"]["Enums"]["currency"] | null
          old_amount: number | null
          old_currency: Database["public"]["Enums"]["currency"] | null
          property_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field: string
          id?: string
          new_amount?: number | null
          new_currency?: Database["public"]["Enums"]["currency"] | null
          old_amount?: number | null
          old_currency?: Database["public"]["Enums"]["currency"] | null
          property_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field?: string
          id?: string
          new_amount?: number | null
          new_currency?: Database["public"]["Enums"]["currency"] | null
          old_amount?: number | null
          old_currency?: Database["public"]["Enums"]["currency"] | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          ai_summary: string | null
          air_conditioning:
            | Database["public"]["Enums"]["air_conditioning"]
            | null
          airtable_id: string | null
          asking_rent: number | null
          asking_sale_price: number | null
          available_from: string | null
          baths: number | null
          beach_access: boolean | null
          beach_distance_m: number | null
          beach_frontage_ft: number | null
          beachfront: boolean | null
          beds: number | null
          boundary_wall: boolean | null
          building_grade: Database["public"]["Enums"]["building_grade"] | null
          building_name: string | null
          built_up_area_sqft: number | null
          bulk_discount_pct: number | null
          bulk_lease_available: boolean | null
          bulk_minimum_units: number | null
          ceiling_height_ft: number | null
          cleaning_fee: number | null
          cold_storage: boolean | null
          commercial_sub_category:
            | Database["public"]["Enums"]["commercial_sub_category"]
            | null
          commission_structure: string | null
          condition: Database["public"]["Enums"]["property_condition"] | null
          conference_rooms: number | null
          created_at: string
          created_by: string | null
          customer_photo_link: string | null
          daily_rate: number | null
          daily_rate_currency: Database["public"]["Enums"]["currency"] | null
          deleted_at: string | null
          depth_ft: number | null
          development_id: string | null
          distance_to_sea_ft: number | null
          electricity_available: boolean | null
          expected_completion_date: string | null
          floor: string | null
          floors_available: string | null
          foot_traffic: Database["public"]["Enums"]["traffic_level"] | null
          frontage_ft: number | null
          furnished: Database["public"]["Enums"]["furnishing"] | null
          gallery_enabled: boolean
          gallery_token: string
          garden: boolean | null
          garden_size_perches: number | null
          generator: boolean | null
          google_indexed: boolean
          google_indexed_at: string | null
          id: string
          ikman_posted: boolean
          ikman_posted_at: string | null
          internal_notes: string | null
          is_bulk_import: boolean
          land_category: Database["public"]["Enums"]["land_category"] | null
          land_extent_perches: number | null
          land_shape: Database["public"]["Enums"]["land_shape"] | null
          lanka_property_web_posted: boolean
          lanka_property_web_posted_at: string | null
          last_made_available: string | null
          last_verified: string | null
          listing_agent_id: string | null
          listing_date: string | null
          listing_no: string | null
          listing_source_type: Database["public"]["Enums"]["source_type"] | null
          listing_types: Database["public"]["Enums"]["listing_type"][]
          loading_docks: number | null
          location_id: string | null
          maids_bath: boolean | null
          maids_room: boolean | null
          map_pin: string | null
          max_occupancy: number | null
          minimum_stay_nights: number | null
          monthly_rate_short_let: number | null
          next_available_date: string | null
          number_of_floors: number | null
          outdoor_dining: boolean | null
          owner_id: string | null
          parking: number | null
          photos_link: string | null
          pool: boolean | null
          pool_size: Database["public"]["Enums"]["pool_size"] | null
          price_on_request: boolean
          property_type: Database["public"]["Enums"]["property_type"]
          public_notes: string | null
          realtor_wa_groups_posted: boolean
          realtor_wa_groups_posted_at: string | null
          referral_partner_id: string | null
          rent_currency: Database["public"]["Enums"]["currency"] | null
          road_access_width_ft: number | null
          roof_type: string | null
          sale_currency: Database["public"]["Enums"]["currency"] | null
          sea_view: boolean | null
          seq_no: number | null
          servant_quarters: boolean | null
          server_it_room: boolean | null
          service_charge_lkr: number | null
          shared_or_dedicated:
            | Database["public"]["Enums"]["floor_sharing"]
            | null
          signage_rights: boolean | null
          source_channel_id: string | null
          sourcing_model: Database["public"]["Enums"]["sourcing_model"] | null
          square_feet: number | null
          status: Database["public"]["Enums"]["property_status"]
          storefront_type: Database["public"]["Enums"]["storefront_type"] | null
          subdivided: boolean | null
          telecom_available: boolean | null
          three_phase_power: boolean | null
          title_type: Database["public"]["Enums"]["title_type"] | null
          total_floor_area_sqft: number | null
          tower_id: string | null
          tower_name_legacy: string | null
          truck_container_access_40ft: boolean | null
          unit_number: string | null
          updated_at: string
          updated_by: string | null
          water_mains_available: boolean | null
          water_source: Database["public"]["Enums"]["water_source"] | null
          web_slug: string | null
          website_published: boolean
          website_published_at: string | null
          weekly_rate: number | null
          workstation_capacity: number | null
          year_built: number | null
        }
        Insert: {
          ai_summary?: string | null
          air_conditioning?:
            | Database["public"]["Enums"]["air_conditioning"]
            | null
          airtable_id?: string | null
          asking_rent?: number | null
          asking_sale_price?: number | null
          available_from?: string | null
          baths?: number | null
          beach_access?: boolean | null
          beach_distance_m?: number | null
          beach_frontage_ft?: number | null
          beachfront?: boolean | null
          beds?: number | null
          boundary_wall?: boolean | null
          building_grade?: Database["public"]["Enums"]["building_grade"] | null
          building_name?: string | null
          built_up_area_sqft?: number | null
          bulk_discount_pct?: number | null
          bulk_lease_available?: boolean | null
          bulk_minimum_units?: number | null
          ceiling_height_ft?: number | null
          cleaning_fee?: number | null
          cold_storage?: boolean | null
          commercial_sub_category?:
            | Database["public"]["Enums"]["commercial_sub_category"]
            | null
          commission_structure?: string | null
          condition?: Database["public"]["Enums"]["property_condition"] | null
          conference_rooms?: number | null
          created_at?: string
          created_by?: string | null
          customer_photo_link?: string | null
          daily_rate?: number | null
          daily_rate_currency?: Database["public"]["Enums"]["currency"] | null
          deleted_at?: string | null
          depth_ft?: number | null
          development_id?: string | null
          distance_to_sea_ft?: number | null
          electricity_available?: boolean | null
          expected_completion_date?: string | null
          floor?: string | null
          floors_available?: string | null
          foot_traffic?: Database["public"]["Enums"]["traffic_level"] | null
          frontage_ft?: number | null
          furnished?: Database["public"]["Enums"]["furnishing"] | null
          gallery_enabled?: boolean
          gallery_token?: string
          garden?: boolean | null
          garden_size_perches?: number | null
          generator?: boolean | null
          google_indexed?: boolean
          google_indexed_at?: string | null
          id?: string
          ikman_posted?: boolean
          ikman_posted_at?: string | null
          internal_notes?: string | null
          is_bulk_import?: boolean
          land_category?: Database["public"]["Enums"]["land_category"] | null
          land_extent_perches?: number | null
          land_shape?: Database["public"]["Enums"]["land_shape"] | null
          lanka_property_web_posted?: boolean
          lanka_property_web_posted_at?: string | null
          last_made_available?: string | null
          last_verified?: string | null
          listing_agent_id?: string | null
          listing_date?: string | null
          listing_no?: string | null
          listing_source_type?:
            | Database["public"]["Enums"]["source_type"]
            | null
          listing_types?: Database["public"]["Enums"]["listing_type"][]
          loading_docks?: number | null
          location_id?: string | null
          maids_bath?: boolean | null
          maids_room?: boolean | null
          map_pin?: string | null
          max_occupancy?: number | null
          minimum_stay_nights?: number | null
          monthly_rate_short_let?: number | null
          next_available_date?: string | null
          number_of_floors?: number | null
          outdoor_dining?: boolean | null
          owner_id?: string | null
          parking?: number | null
          photos_link?: string | null
          pool?: boolean | null
          pool_size?: Database["public"]["Enums"]["pool_size"] | null
          price_on_request?: boolean
          property_type: Database["public"]["Enums"]["property_type"]
          public_notes?: string | null
          realtor_wa_groups_posted?: boolean
          realtor_wa_groups_posted_at?: string | null
          referral_partner_id?: string | null
          rent_currency?: Database["public"]["Enums"]["currency"] | null
          road_access_width_ft?: number | null
          roof_type?: string | null
          sale_currency?: Database["public"]["Enums"]["currency"] | null
          sea_view?: boolean | null
          seq_no?: number | null
          servant_quarters?: boolean | null
          server_it_room?: boolean | null
          service_charge_lkr?: number | null
          shared_or_dedicated?:
            | Database["public"]["Enums"]["floor_sharing"]
            | null
          signage_rights?: boolean | null
          source_channel_id?: string | null
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"] | null
          square_feet?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          storefront_type?:
            | Database["public"]["Enums"]["storefront_type"]
            | null
          subdivided?: boolean | null
          telecom_available?: boolean | null
          three_phase_power?: boolean | null
          title_type?: Database["public"]["Enums"]["title_type"] | null
          total_floor_area_sqft?: number | null
          tower_id?: string | null
          tower_name_legacy?: string | null
          truck_container_access_40ft?: boolean | null
          unit_number?: string | null
          updated_at?: string
          updated_by?: string | null
          water_mains_available?: boolean | null
          water_source?: Database["public"]["Enums"]["water_source"] | null
          web_slug?: string | null
          website_published?: boolean
          website_published_at?: string | null
          weekly_rate?: number | null
          workstation_capacity?: number | null
          year_built?: number | null
        }
        Update: {
          ai_summary?: string | null
          air_conditioning?:
            | Database["public"]["Enums"]["air_conditioning"]
            | null
          airtable_id?: string | null
          asking_rent?: number | null
          asking_sale_price?: number | null
          available_from?: string | null
          baths?: number | null
          beach_access?: boolean | null
          beach_distance_m?: number | null
          beach_frontage_ft?: number | null
          beachfront?: boolean | null
          beds?: number | null
          boundary_wall?: boolean | null
          building_grade?: Database["public"]["Enums"]["building_grade"] | null
          building_name?: string | null
          built_up_area_sqft?: number | null
          bulk_discount_pct?: number | null
          bulk_lease_available?: boolean | null
          bulk_minimum_units?: number | null
          ceiling_height_ft?: number | null
          cleaning_fee?: number | null
          cold_storage?: boolean | null
          commercial_sub_category?:
            | Database["public"]["Enums"]["commercial_sub_category"]
            | null
          commission_structure?: string | null
          condition?: Database["public"]["Enums"]["property_condition"] | null
          conference_rooms?: number | null
          created_at?: string
          created_by?: string | null
          customer_photo_link?: string | null
          daily_rate?: number | null
          daily_rate_currency?: Database["public"]["Enums"]["currency"] | null
          deleted_at?: string | null
          depth_ft?: number | null
          development_id?: string | null
          distance_to_sea_ft?: number | null
          electricity_available?: boolean | null
          expected_completion_date?: string | null
          floor?: string | null
          floors_available?: string | null
          foot_traffic?: Database["public"]["Enums"]["traffic_level"] | null
          frontage_ft?: number | null
          furnished?: Database["public"]["Enums"]["furnishing"] | null
          gallery_enabled?: boolean
          gallery_token?: string
          garden?: boolean | null
          garden_size_perches?: number | null
          generator?: boolean | null
          google_indexed?: boolean
          google_indexed_at?: string | null
          id?: string
          ikman_posted?: boolean
          ikman_posted_at?: string | null
          internal_notes?: string | null
          is_bulk_import?: boolean
          land_category?: Database["public"]["Enums"]["land_category"] | null
          land_extent_perches?: number | null
          land_shape?: Database["public"]["Enums"]["land_shape"] | null
          lanka_property_web_posted?: boolean
          lanka_property_web_posted_at?: string | null
          last_made_available?: string | null
          last_verified?: string | null
          listing_agent_id?: string | null
          listing_date?: string | null
          listing_no?: string | null
          listing_source_type?:
            | Database["public"]["Enums"]["source_type"]
            | null
          listing_types?: Database["public"]["Enums"]["listing_type"][]
          loading_docks?: number | null
          location_id?: string | null
          maids_bath?: boolean | null
          maids_room?: boolean | null
          map_pin?: string | null
          max_occupancy?: number | null
          minimum_stay_nights?: number | null
          monthly_rate_short_let?: number | null
          next_available_date?: string | null
          number_of_floors?: number | null
          outdoor_dining?: boolean | null
          owner_id?: string | null
          parking?: number | null
          photos_link?: string | null
          pool?: boolean | null
          pool_size?: Database["public"]["Enums"]["pool_size"] | null
          price_on_request?: boolean
          property_type?: Database["public"]["Enums"]["property_type"]
          public_notes?: string | null
          realtor_wa_groups_posted?: boolean
          realtor_wa_groups_posted_at?: string | null
          referral_partner_id?: string | null
          rent_currency?: Database["public"]["Enums"]["currency"] | null
          road_access_width_ft?: number | null
          roof_type?: string | null
          sale_currency?: Database["public"]["Enums"]["currency"] | null
          sea_view?: boolean | null
          seq_no?: number | null
          servant_quarters?: boolean | null
          server_it_room?: boolean | null
          service_charge_lkr?: number | null
          shared_or_dedicated?:
            | Database["public"]["Enums"]["floor_sharing"]
            | null
          signage_rights?: boolean | null
          source_channel_id?: string | null
          sourcing_model?: Database["public"]["Enums"]["sourcing_model"] | null
          square_feet?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          storefront_type?:
            | Database["public"]["Enums"]["storefront_type"]
            | null
          subdivided?: boolean | null
          telecom_available?: boolean | null
          three_phase_power?: boolean | null
          title_type?: Database["public"]["Enums"]["title_type"] | null
          total_floor_area_sqft?: number | null
          tower_id?: string | null
          tower_name_legacy?: string | null
          truck_container_access_40ft?: boolean | null
          unit_number?: string | null
          updated_at?: string
          updated_by?: string | null
          water_mains_available?: boolean | null
          water_source?: Database["public"]["Enums"]["water_source"] | null
          web_slug?: string | null
          website_published?: boolean
          website_published_at?: string | null
          weekly_rate?: number | null
          workstation_capacity?: number | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_development_id_fkey"
            columns: ["development_id"]
            isOneToOne: false
            referencedRelation: "developments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_listing_agent_id_fkey"
            columns: ["listing_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_source_channel_id_fkey"
            columns: ["source_channel_id"]
            isOneToOne: false
            referencedRelation: "source_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_tower_id_fkey"
            columns: ["tower_id"]
            isOneToOne: false
            referencedRelation: "development_towers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_feature_links: {
        Row: {
          created_at: string
          feature_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_feature_links_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "property_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_feature_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_features: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          bytes: number | null
          caption: string | null
          content_hash: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          height: number | null
          id: string
          is_cover: boolean
          is_public: boolean
          original_filename: string | null
          property_id: string
          sort_order: number
          source: Database["public"]["Enums"]["photo_source"]
          source_ref: string | null
          storage_path: string
          updated_at: string
          updated_by: string | null
          variants: Json | null
          width: number | null
        }
        Insert: {
          bytes?: number | null
          caption?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          height?: number | null
          id?: string
          is_cover?: boolean
          is_public?: boolean
          original_filename?: string | null
          property_id: string
          sort_order?: number
          source?: Database["public"]["Enums"]["photo_source"]
          source_ref?: string | null
          storage_path: string
          updated_at?: string
          updated_by?: string | null
          variants?: Json | null
          width?: number | null
        }
        Update: {
          bytes?: number | null
          caption?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          height?: number | null
          id?: string
          is_cover?: boolean
          is_public?: boolean
          original_filename?: string | null
          property_id?: string
          sort_order?: number
          source?: Database["public"]["Enums"]["photo_source"]
          source_ref?: string | null
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
          variants?: Json | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_source_external_agents: {
        Row: {
          created_at: string
          external_agent_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          external_agent_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          external_agent_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_source_external_agents_external_agent_id_fkey"
            columns: ["external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_source_external_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      referral_partner_private: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          nic_number: string | null
          referral_partner_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          nic_number?: string | null
          referral_partner_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          nic_number?: string | null
          referral_partner_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_partner_private_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: true
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_partners: {
        Row: {
          address: string | null
          agreement_signed_on: string | null
          agreement_valid_until: string | null
          airtable_id: string | null
          attributed_to_agent_id: string | null
          attribution:
            | Database["public"]["Enums"]["referral_attribution"]
            | null
          company_organization: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          referral_rate_pct: number
          referrer_category_id: string | null
          registered_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          agreement_signed_on?: string | null
          agreement_valid_until?: string | null
          airtable_id?: string | null
          attributed_to_agent_id?: string | null
          attribution?:
            | Database["public"]["Enums"]["referral_attribution"]
            | null
          company_organization?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          referral_rate_pct?: number
          referrer_category_id?: string | null
          registered_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          agreement_signed_on?: string | null
          agreement_valid_until?: string | null
          airtable_id?: string | null
          attributed_to_agent_id?: string | null
          attribution?:
            | Database["public"]["Enums"]["referral_attribution"]
            | null
          company_organization?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          referral_rate_pct?: number
          referrer_category_id?: string | null
          registered_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_partners_attributed_to_agent_id_fkey"
            columns: ["attributed_to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_partners_referrer_category_id_fkey"
            columns: ["referrer_category_id"]
            isOneToOne: false
            referencedRelation: "referrer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      referrer_categories: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      report_editions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          band_values: Json | null
          created_at: string
          created_by: string | null
          data_window_end: string
          deleted_at: string | null
          id: string
          pdf_path: string | null
          published_at: string | null
          quarter: string
          sample_size: number | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          band_values?: Json | null
          created_at?: string
          created_by?: string | null
          data_window_end: string
          deleted_at?: string | null
          id?: string
          pdf_path?: string | null
          published_at?: string | null
          quarter: string
          sample_size?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          band_values?: Json | null
          created_at?: string
          created_by?: string | null
          data_window_end?: string
          deleted_at?: string | null
          id?: string
          pdf_path?: string | null
          published_at?: string | null
          quarter?: string
          sample_size?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_insert: boolean
          can_select: boolean
          can_update: boolean
          resource: string
          role: Database["public"]["Enums"]["agent_role"]
        }
        Insert: {
          can_delete?: boolean
          can_insert?: boolean
          can_select?: boolean
          can_update?: boolean
          resource: string
          role: Database["public"]["Enums"]["agent_role"]
        }
        Update: {
          can_delete?: boolean
          can_insert?: boolean
          can_select?: boolean
          can_update?: boolean
          resource?: string
          role?: Database["public"]["Enums"]["agent_role"]
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          h1: string | null
          intro: string | null
          kind: string
          meta_description: string | null
          path: string
          source_url: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          website_image: Json | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          h1?: string | null
          intro?: string | null
          kind: string
          meta_description?: string | null
          path: string
          source_url?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          website_image?: Json | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          h1?: string | null
          intro?: string | null
          kind?: string
          meta_description?: string | null
          path?: string
          source_url?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          website_image?: Json | null
        }
        Relationships: []
      }
      source_channels: {
        Row: {
          applies_to_leads: boolean
          applies_to_properties: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_to_leads?: boolean
          applies_to_properties?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_to_leads?: boolean
          applies_to_properties?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_agent_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          details: string | null
          due_on: string | null
          id: string
          lead_id: string | null
          owner_id: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          updated_by: string | null
          viewing_id: string | null
        }
        Insert: {
          assignee_agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          details?: string | null
          due_on?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          viewing_id?: string | null
        }
        Update: {
          assignee_agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          details?: string | null
          due_on?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
          viewing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_agent_id_fkey"
            columns: ["assignee_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_viewing_id_fkey"
            columns: ["viewing_id"]
            isOneToOne: false
            referencedRelation: "viewings"
            referencedColumns: ["id"]
          },
        ]
      }
      viewings: {
        Row: {
          airtable_id: string | null
          co_broke_external_agent_id: string | null
          conducted_by_agent_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          feedback_notes: string | null
          id: string
          landlord_present: boolean | null
          last_follow_up: string | null
          lead_id: string | null
          outcome: Database["public"]["Enums"]["viewing_outcome"]
          property_id: string | null
          time: string | null
          time_text_legacy: string | null
          updated_at: string
          updated_by: string | null
          viewing_model: Database["public"]["Enums"]["viewing_model"] | null
          viewing_no: number
        }
        Insert: {
          airtable_id?: string | null
          co_broke_external_agent_id?: string | null
          conducted_by_agent_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          deleted_at?: string | null
          feedback_notes?: string | null
          id?: string
          landlord_present?: boolean | null
          last_follow_up?: string | null
          lead_id?: string | null
          outcome?: Database["public"]["Enums"]["viewing_outcome"]
          property_id?: string | null
          time?: string | null
          time_text_legacy?: string | null
          updated_at?: string
          updated_by?: string | null
          viewing_model?: Database["public"]["Enums"]["viewing_model"] | null
          viewing_no?: number
        }
        Update: {
          airtable_id?: string | null
          co_broke_external_agent_id?: string | null
          conducted_by_agent_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          feedback_notes?: string | null
          id?: string
          landlord_present?: boolean | null
          last_follow_up?: string | null
          lead_id?: string | null
          outcome?: Database["public"]["Enums"]["viewing_outcome"]
          property_id?: string | null
          time?: string | null
          time_text_legacy?: string | null
          updated_at?: string
          updated_by?: string | null
          viewing_model?: Database["public"]["Enums"]["viewing_model"] | null
          viewing_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "viewings_co_broke_external_agent_id_fkey"
            columns: ["co_broke_external_agent_id"]
            isOneToOne: false
            referencedRelation: "external_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_conducted_by_agent_id_fkey"
            columns: ["conducted_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      web_developments: {
        Row: {
          developer_builder: string | null
          development_status:
            | Database["public"]["Enums"]["development_status"]
            | null
          hero_image_path: string | null
          image: Json | null
          listing_count: number | null
          location_name: string | null
          location_slug: string | null
          name: string | null
          seo_body: string | null
          seo_faq: Json | null
          seo_intro: string | null
          seo_meta_description: string | null
          seo_title: string | null
          slug: string | null
          year_completed: number | null
        }
        Relationships: []
      }
      web_fx: {
        Row: {
          rate_date: string | null
          usd_lkr: number | null
        }
        Relationships: []
      }
      web_listings: {
        Row: {
          agent_name: string | null
          agent_whatsapp: string | null
          asking_rent: number | null
          asking_sale_price: number | null
          available_from: string | null
          baths: number | null
          beds: number | null
          built_up_area_sqft: number | null
          commercial_sub_category:
            | Database["public"]["Enums"]["commercial_sub_category"]
            | null
          condition: Database["public"]["Enums"]["property_condition"] | null
          cover: Json | null
          development_name: string | null
          development_slug: string | null
          features: string[] | null
          furnished: Database["public"]["Enums"]["furnishing"] | null
          garden: boolean | null
          land_extent_perches: number | null
          listing_no: string | null
          listing_types: Database["public"]["Enums"]["listing_type"][] | null
          location_name: string | null
          location_slug: string | null
          market_tier: Database["public"]["Enums"]["market_tier"] | null
          number_of_floors: number | null
          parking: number | null
          photos: Json | null
          pool: boolean | null
          price_on_request: boolean | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          public_notes: string | null
          published_at: string | null
          rent_currency: Database["public"]["Enums"]["currency"] | null
          rent_lkr: number | null
          rent_usd: number | null
          sale_currency: Database["public"]["Enums"]["currency"] | null
          sale_lkr: number | null
          sale_usd: number | null
          sea_view: boolean | null
          slug: string | null
          square_feet: number | null
          status: Database["public"]["Enums"]["property_status"] | null
          total_floor_area_sqft: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      web_locations: {
        Row: {
          image: Json | null
          listing_count: number | null
          market_tier: Database["public"]["Enums"]["market_tier"] | null
          name: string | null
          seo_body: string | null
          seo_faq: Json | null
          seo_intro: string | null
          seo_meta_description: string | null
          seo_title: string | null
          slug: string | null
        }
        Insert: {
          image?: never
          listing_count?: never
          market_tier?: Database["public"]["Enums"]["market_tier"] | null
          name?: string | null
          seo_body?: string | null
          seo_faq?: Json | null
          seo_intro?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string | null
        }
        Update: {
          image?: never
          listing_count?: never
          market_tier?: Database["public"]["Enums"]["market_tier"] | null
          name?: string | null
          seo_body?: string | null
          seo_faq?: Json | null
          seo_intro?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      web_price_guide: {
        Row: {
          rent_psf_high: number | null
          rent_psf_low: number | null
          rent_usd_high: number | null
          rent_usd_low: number | null
          sale_lkr_high: number | null
          sale_lkr_low: number | null
          scope: string | null
          slug: string | null
        }
        Relationships: []
      }
      web_pages: {
        Row: {
          body: string | null
          h1: string | null
          image: Json | null
          intro: string | null
          kind: string | null
          meta_description: string | null
          path: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          h1?: string | null
          image?: never
          intro?: string | null
          kind?: string | null
          meta_description?: string | null
          path?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          h1?: string | null
          image?: never
          intro?: string | null
          kind?: string | null
          meta_description?: string | null
          path?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_sync_sequences: { Args: never; Returns: undefined }
      move_lead: {
        Args: { p_lead: string; p_to: Database["public"]["Enums"]["pipeline_status"]; p_lost_reason?: string; p_override_reason?: string }
        Returns: Json
      }
      my_closings_count: { Args: { p_from: string; p_to: string }; Returns: number }
      my_targets: { Args: never; Returns: { metric: string; period: string; target_value: number }[] }
      web_gallery: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      mandate_status: "prospect" | "assessment_booked" | "mandate_won" | "lost"
      offer_status: "draft" | "sent" | "countered" | "accepted" | "rejected" | "expired"
      activity_type: "call" | "whatsapp" | "email" | "meeting" | "note"
      agent_role: "super_admin" | "sales_manager" | "agent" | "data_entry"
      agent_status: "active" | "inactive"
      agent_tenure: "probation" | "confirmed"
      air_conditioning: "central" | "split" | "none"
      audit_action: "create" | "update" | "delete" | "restore" | "hard_delete"
      building_grade: "a" | "b" | "c"
      change_source: "app" | "website" | "api" | "job" | "migration"
      commercial_sub_category: "office" | "retail" | "warehouse"
      contact_protocol:
        | "direct_call_ok"
        | "introduce_via_whatsapp_first"
        | "route_through_adhith"
      currency: "LKR" | "USD"
      deal_side: "lead" | "listing"
      deal_type: "rental" | "short_let" | "sale"
      development_status:
        | "completed"
        | "under_construction"
        | "off_plan"
        | "pre_launch"
      financing: "cash" | "bank_loan" | "part_cash_part_loan"
      floor_sharing: "shared_floor" | "dedicated_floor"
      furnishing: "fully" | "semi" | "unfurnished" | "unknown"
      fx_source: "auto" | "manual"
      investor_type:
        | "first_time_buyer"
        | "casual_investor"
        | "serial_investor"
        | "end_user"
        | "developer"
        | "not_applicable"
      land_category:
        | "residential"
        | "commercial"
        | "mixed"
        | "agricultural"
        | "beachfront"
      land_shape: "square" | "rectangular" | "irregular"
      lead_profile: "expat" | "diplomatic" | "corporate" | "local"
      listing_type: "rent_long_term" | "rent_short_term" | "sale"
      looking_for: "rent" | "buy" | "either"
      market_tier: "prime_core" | "outside_core"
      marketing_audience: "owner" | "buyer_investor" | "tenant"
      marketing_status:
        | "new"
        | "nurturing"
        | "engaged"
        | "promoted"
        | "unsubscribed"
        | "disqualified"
      owner_type:
        | "individual"
        | "corporate"
        | "developer"
        | "bank"
        | "unknown_via_agent"
      payee_type: "agent" | "referrer"
      payment_method: "bank_transfer" | "cash" | "cheque" | "card"
      photo_source: "upload" | "drive_import" | "airtable_import"
      pipeline_status:
        | "new"
        | "contacted"
        | "viewing_scheduled"
        | "viewing_completed"
        | "ongoing_negotiations"
        | "deposit_paid"
        | "documentation_ready"
        | "closed_won"
        | "lost"
        | "dormant"
      pool_size: "small" | "medium" | "large"
      property_condition:
        | "brand_new"
        | "off_plan"
        | "under_construction"
        | "used"
      property_status:
        | "available"
        | "reserved"
        | "rented"
        | "sold"
        | "withdrawn"
      property_type: "apartment" | "house" | "land" | "villa" | "commercial"
      purchase_timeline:
        | "immediate"
        | "months_1_3"
        | "months_3_6"
        | "months_6_plus"
      referral_attribution: "company_referrer" | "agent_personal_referrer"
      source_type: "direct" | "via_agent"
      sourcing_model:
        | "company_direct"
        | "company_via_referrer"
        | "agent_self_sourced"
        | "agent_via_referrer"
      storefront_type: "glass" | "solid" | "mixed"
      task_status: "open" | "done" | "cancelled"
      title_type: "freehold" | "leasehold" | "crown_grant"
      traffic_level: "high" | "medium" | "low"
      urgency: "low" | "medium" | "high" | "immediate"
      viewing_model:
        | "our_lead_our_property"
        | "our_lead_cobroke_property"
        | "cobroke_lead_our_property"
        | "cobroke_lead_cobroke_property"
        | "sourcing_visit"
      viewing_outcome:
        | "pending"
        | "interested"
        | "not_interested"
        | "wants_second_viewing"
        | "made_offer"
      water_source: "mains" | "well" | "tube_well" | "both"
      weekday:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      mandate_status: ["prospect", "assessment_booked", "mandate_won", "lost"],
      offer_status: ["draft", "sent", "countered", "accepted", "rejected", "expired"],
      activity_type: ["call", "whatsapp", "email", "meeting", "note"],
      agent_role: ["super_admin", "sales_manager", "agent", "data_entry"],
      agent_status: ["active", "inactive"],
      agent_tenure: ["probation", "confirmed"],
      air_conditioning: ["central", "split", "none"],
      audit_action: ["create", "update", "delete", "restore", "hard_delete"],
      building_grade: ["a", "b", "c"],
      change_source: ["app", "website", "api", "job", "migration"],
      commercial_sub_category: ["office", "retail", "warehouse"],
      contact_protocol: [
        "direct_call_ok",
        "introduce_via_whatsapp_first",
        "route_through_adhith",
      ],
      currency: ["LKR", "USD"],
      deal_side: ["lead", "listing"],
      deal_type: ["rental", "short_let", "sale"],
      development_status: [
        "completed",
        "under_construction",
        "off_plan",
        "pre_launch",
      ],
      financing: ["cash", "bank_loan", "part_cash_part_loan"],
      floor_sharing: ["shared_floor", "dedicated_floor"],
      furnishing: ["fully", "semi", "unfurnished", "unknown"],
      fx_source: ["auto", "manual"],
      investor_type: [
        "first_time_buyer",
        "casual_investor",
        "serial_investor",
        "end_user",
        "developer",
        "not_applicable",
      ],
      land_category: [
        "residential",
        "commercial",
        "mixed",
        "agricultural",
        "beachfront",
      ],
      land_shape: ["square", "rectangular", "irregular"],
      lead_profile: ["expat", "diplomatic", "corporate", "local"],
      listing_type: ["rent_long_term", "rent_short_term", "sale"],
      looking_for: ["rent", "buy", "either"],
      market_tier: ["prime_core", "outside_core"],
      marketing_audience: ["owner", "buyer_investor", "tenant"],
      marketing_status: [
        "new",
        "nurturing",
        "engaged",
        "promoted",
        "unsubscribed",
        "disqualified",
      ],
      owner_type: [
        "individual",
        "corporate",
        "developer",
        "bank",
        "unknown_via_agent",
      ],
      payee_type: ["agent", "referrer"],
      payment_method: ["bank_transfer", "cash", "cheque", "card"],
      photo_source: ["upload", "drive_import", "airtable_import"],
      pipeline_status: [
        "new",
        "contacted",
        "viewing_scheduled",
        "viewing_completed",
        "ongoing_negotiations",
        "deposit_paid",
        "documentation_ready",
        "closed_won",
        "lost",
        "dormant",
      ],
      pool_size: ["small", "medium", "large"],
      property_condition: [
        "brand_new",
        "off_plan",
        "under_construction",
        "used",
      ],
      property_status: ["available", "reserved", "rented", "sold", "withdrawn"],
      property_type: ["apartment", "house", "land", "villa", "commercial"],
      purchase_timeline: [
        "immediate",
        "months_1_3",
        "months_3_6",
        "months_6_plus",
      ],
      referral_attribution: ["company_referrer", "agent_personal_referrer"],
      source_type: ["direct", "via_agent"],
      sourcing_model: [
        "company_direct",
        "company_via_referrer",
        "agent_self_sourced",
        "agent_via_referrer",
      ],
      storefront_type: ["glass", "solid", "mixed"],
      task_status: ["open", "done", "cancelled"],
      title_type: ["freehold", "leasehold", "crown_grant"],
      traffic_level: ["high", "medium", "low"],
      urgency: ["low", "medium", "high", "immediate"],
      viewing_model: [
        "our_lead_our_property",
        "our_lead_cobroke_property",
        "cobroke_lead_our_property",
        "cobroke_lead_cobroke_property",
        "sourcing_visit",
      ],
      viewing_outcome: [
        "pending",
        "interested",
        "not_interested",
        "wants_second_viewing",
        "made_offer",
      ],
      water_source: ["mains", "well", "tube_well", "both"],
      weekday: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },
  },
} as const
