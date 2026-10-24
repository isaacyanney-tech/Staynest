// Generated from the Supabase schema (supabase gen types). Regenerate after
// changing migrations: npx supabase gen types typescript --project-id <ref>
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          description: string
          is_public: boolean
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string
          is_public?: boolean
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          is_public?: boolean
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      content_revisions: {
        Row: {
          action: string
          content: Json
          created_at: string
          created_by: string | null
          id: number
          section_id: string
        }
        Insert: {
          action: string
          content: Json
          created_at?: string
          created_by?: string | null
          id?: never
          section_id: string
        }
        Update: {
          action?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: never
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "page_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_placements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          hostel_id: string
          id: string
          payment_id: string | null
          source: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          hostel_id: string
          id?: string
          payment_id?: string | null
          source?: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          hostel_id?: string
          id?: string
          payment_id?: string | null
          source?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_placements_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_placements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_media: {
        Row: {
          alt_text: string
          caption: string | null
          created_at: string
          credit: string | null
          external_url: string | null
          height: number | null
          hostel_id: string
          id: string
          sort_order: number
          storage_path: string | null
          width: number | null
        }
        Insert: {
          alt_text: string
          caption?: string | null
          created_at?: string
          credit?: string | null
          external_url?: string | null
          height?: number | null
          hostel_id: string
          id?: string
          sort_order?: number
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          credit?: string | null
          external_url?: string | null
          height?: number | null
          hostel_id?: string
          id?: string
          sort_order?: number
          storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hostel_media_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostels: {
        Row: {
          address: string
          amenities: string[]
          area: string
          city: string
          contact_phone: string | null
          created_at: string
          description: string
          distance_km: number | null
          gender_policy: Database["public"]["Enums"]["gender_policy"]
          house_rules: string
          id: string
          is_demo: boolean
          is_verified: boolean
          moderation_note: string | null
          name: string
          owner_id: string | null
          price_from: number | null
          published_at: string | null
          rooms_available: number
          search: unknown
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          summary: string
          university_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          amenities?: string[]
          area?: string
          city?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          distance_km?: number | null
          gender_policy?: Database["public"]["Enums"]["gender_policy"]
          house_rules?: string
          id?: string
          is_demo?: boolean
          is_verified?: boolean
          moderation_note?: string | null
          name: string
          owner_id?: string | null
          price_from?: number | null
          published_at?: string | null
          rooms_available?: number
          search?: unknown
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          summary?: string
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[]
          area?: string
          city?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          distance_km?: number | null
          gender_policy?: Database["public"]["Enums"]["gender_policy"]
          house_rules?: string
          id?: string
          is_demo?: boolean
          is_verified?: boolean
          moderation_note?: string | null
          name?: string
          owner_id?: string | null
          price_from?: number | null
          published_at?: string | null
          rooms_available?: number
          search?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          summary?: string
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostels_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_requests: {
        Row: {
          created_at: string
          hostel_id: string
          id: string
          message: string
          owner_response: string | null
          preferred_date: string
          preferred_time: string
          proposed_date: string | null
          room_type_id: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hostel_id: string
          id?: string
          message?: string
          owner_response?: string | null
          preferred_date: string
          preferred_time?: string
          proposed_date?: string | null
          room_type_id?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hostel_id?: string
          id?: string
          message?: string
          owner_response?: string | null
          preferred_date?: string
          preferred_time?: string
          proposed_date?: string | null
          room_type_id?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_requests_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_requests_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string
          bucket: string
          caption: string | null
          created_at: string
          credit: string | null
          external_url: string | null
          height: number | null
          id: string
          is_illustrative: boolean
          mime_type: string | null
          size_bytes: number | null
          sort_order: number
          status: string
          storage_path: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string
          bucket?: string
          caption?: string | null
          created_at?: string
          credit?: string | null
          external_url?: string | null
          height?: number | null
          id?: string
          is_illustrative?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          status?: string
          storage_path?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          bucket?: string
          caption?: string | null
          created_at?: string
          credit?: string | null
          external_url?: string | null
          height?: number | null
          id?: string
          is_illustrative?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          status?: string
          storage_path?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          group_label: string | null
          href: string
          id: string
          is_visible: boolean
          label: string
          location: string
          sort_order: number
        }
        Insert: {
          group_label?: string | null
          href: string
          id?: string
          is_visible?: boolean
          label: string
          location: string
          sort_order?: number
        }
        Update: {
          group_label?: string | null
          href?: string
          id?: string
          is_visible?: boolean
          label?: string
          location?: string
          sort_order?: number
        }
        Relationships: []
      }
      page_section_drafts: {
        Row: {
          content: Json
          section_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: Json
          section_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          section_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_section_drafts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "page_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          id: string
          is_visible: boolean
          key: string
          label: string
          page_id: string
          published: Json | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          type: string
        }
        Insert: {
          id?: string
          is_visible?: boolean
          key: string
          label: string
          page_id: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          type: string
        }
        Update: {
          id?: string
          is_visible?: boolean
          key?: string
          label?: string
          page_id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          id: string
          is_published: boolean
          is_system: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_published?: boolean
          is_system?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_published?: boolean
          is_system?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          featured_weeks: number | null
          gateway_response: string | null
          hostel_id: string | null
          id: string
          owner_id: string
          plan_id: string | null
          provider: string
          provider_payload: Json | null
          purpose: string
          reference: string
          status: string
          subscription_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          featured_weeks?: number | null
          gateway_response?: string | null
          hostel_id?: string | null
          id?: string
          owner_id: string
          plan_id?: string | null
          provider?: string
          provider_payload?: Json | null
          purpose: string
          reference: string
          status?: string
          subscription_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          featured_weeks?: number | null
          gateway_response?: string | null
          hostel_id?: string | null
          id?: string
          owner_id?: string
          plan_id?: string | null
          provider?: string
          provider_payload?: Json | null
          purpose?: string
          reference?: string
          status?: string
          subscription_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          code: string
          currency: string
          description: string
          featured_slots: number
          features: string[]
          id: string
          is_active: boolean
          is_default: boolean
          listing_limit: number | null
          name: string
          photo_limit: number
          price_amount: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_interval?: string
          code: string
          currency?: string
          description?: string
          featured_slots?: number
          features?: string[]
          id?: string
          is_active?: boolean
          is_default?: boolean
          listing_limit?: number | null
          name: string
          photo_limit?: number
          price_amount?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_interval?: string
          code?: string
          currency?: string
          description?: string
          featured_slots?: number
          features?: string[]
          id?: string
          is_active?: boolean
          is_default?: boolean
          listing_limit?: number | null
          name?: string
          photo_limit?: number
          price_amount?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_suspended?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          ends_at: string | null
          id: string
          is_active: boolean
          link_href: string | null
          link_label: string | null
          message: string
          sort_order: number
          starts_at: string | null
          tone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_href?: string | null
          link_label?: string | null
          message: string
          sort_order?: number
          starts_at?: string | null
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_href?: string | null
          link_label?: string | null
          message?: string
          sort_order?: number
          starts_at?: string | null
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      room_types: {
        Row: {
          available_rooms: number
          created_at: string
          description: string
          hostel_id: string
          id: string
          name: string
          occupancy: number
          price_amount: number
          price_period: Database["public"]["Enums"]["price_period"]
          sort_order: number
          total_rooms: number
          updated_at: string
        }
        Insert: {
          available_rooms?: number
          created_at?: string
          description?: string
          hostel_id: string
          id?: string
          name: string
          occupancy: number
          price_amount: number
          price_period?: Database["public"]["Enums"]["price_period"]
          sort_order?: number
          total_rooms?: number
          updated_at?: string
        }
        Update: {
          available_rooms?: number
          created_at?: string
          description?: string
          hostel_id?: string
          id?: string
          name?: string
          occupancy?: number
          price_amount?: number
          price_period?: Database["public"]["Enums"]["price_period"]
          sort_order?: number
          total_rooms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_hostels: {
        Row: {
          created_at: string
          hostel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hostel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hostel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_hostels_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_hostels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          contact: Json
          favicon_media_id: string | null
          id: number
          logo_media_id: string | null
          seo: Json
          site_name: string
          social: Json
          tagline: string
          theme: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact?: Json
          favicon_media_id?: string | null
          id?: number
          logo_media_id?: string | null
          seo?: Json
          site_name?: string
          social?: Json
          tagline?: string
          theme?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact?: Json
          favicon_media_id?: string | null
          id?: number
          logo_media_id?: string | null
          seo?: Json
          site_name?: string
          social?: Json
          tagline?: string
          theme?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_favicon_media_id_fkey"
            columns: ["favicon_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          featured_slots: number
          id: string
          listing_limit: number | null
          owner_id: string
          plan_id: string
          plan_name: string
          price_amount: number
          status: string
        }
        Insert: {
          created_at?: string
          currency: string
          current_period_end?: string | null
          current_period_start?: string | null
          featured_slots?: number
          id?: string
          listing_limit?: number | null
          owner_id: string
          plan_id: string
          plan_name: string
          price_amount: number
          status?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          featured_slots?: number
          id?: string
          listing_limit?: number | null
          owner_id?: string
          plan_id?: string
          plan_name?: string
          price_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string
          created_at: string
          description: string
          id: string
          image_alt: string
          image_path: string | null
          is_popular: boolean
          name: string
          region: string | null
          short_name: string
          slug: string
          sort_order: number
        }
        Insert: {
          city: string
          created_at?: string
          description?: string
          id?: string
          image_alt?: string
          image_path?: string | null
          is_popular?: boolean
          name: string
          region?: string | null
          short_name: string
          slug: string
          sort_order?: number
        }
        Update: {
          city?: string
          created_at?: string
          description?: string
          id?: string
          image_alt?: string
          image_path?: string | null
          is_popular?: boolean
          name?: string
          region?: string | null
          short_name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      verification_applications: {
        Row: {
          hostel_id: string
          id: string
          owner_id: string
          owner_note: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
        }
        Insert: {
          hostel_id: string
          id?: string
          owner_id: string
          owner_note?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
        }
        Update: {
          hostel_id?: string
          id?: string
          owner_id?: string
          owner_note?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_applications_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_applications_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_applications_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          application_id: string
          created_at: string
          doc_type: string
          file_name: string
          id: string
          storage_path: string
        }
        Insert: {
          application_id: string
          created_at?: string
          doc_type: string
          file_name: string
          id?: string
          storage_path: string
        }
        Update: {
          application_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role?: Database["public"]["Enums"]["app_role"]
          p_search?: string
        }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_suspended: boolean
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          total: number
        }[]
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      hostel_is_public: { Args: { p_hostel: string }; Returns: boolean }
      finalize_payment: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_gateway_response: string
          p_payload: Json
          p_reference: string
          p_status: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      my_featured_slots_left: { Args: never; Returns: number }
      is_owner: { Args: never; Returns: boolean }
      is_privileged_connection: { Args: never; Returns: boolean }
      owns_hostel: { Args: { p_hostel: string }; Returns: boolean }
      publish_section: { Args: { p_section: string }; Returns: string }
      start_payment: {
        Args: {
          p_hostel?: string
          p_plan_code?: string
          p_purpose: string
          p_weeks?: number
        }
        Returns: {
          amount: number
          currency: string
          description: string
          reference: string
        }[]
      }
      restore_revision_to_draft: {
        Args: { p_revision: number }
        Returns: string
      }
      unpublish_section: { Args: { p_section: string }; Returns: undefined }
      use_featured_slot: { Args: { p_hostel: string }; Returns: string }
    }
    Enums: {
      app_role: "student" | "owner" | "admin"
      gender_policy: "mixed" | "male" | "female"
      inspection_status:
        | "requested"
        | "accepted"
        | "rescheduled"
        | "declined"
        | "completed"
        | "cancelled"
      listing_status:
        | "draft"
        | "pending_review"
        | "published"
        | "rejected"
        | "suspended"
      price_period: "semester" | "academic_year" | "month"
      verification_status: "pending" | "needs_info" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
