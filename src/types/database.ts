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
      branches: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          image_url: string | null
          instagram: string | null
          name: string
          phone: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      club_redemptions: {
        Row: {
          id: string
          period: string
          redeemed_at: string
          redeemed_by: string | null
          subscription_id: string
        }
        Insert: {
          id?: string
          period: string
          redeemed_at?: string
          redeemed_by?: string | null
          subscription_id: string
        }
        Update: {
          id?: string
          period?: string
          redeemed_at?: string
          redeemed_by?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          active: boolean | null
          available_spots: number
          branch_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          instructor_bio: string | null
          instructor_name: string
          price: number | null
          schedule: string | null
          start_date: string
          syllabus: Json | null
          title: string
          total_classes: number
          total_spots: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          available_spots: number
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructor_bio?: string | null
          instructor_name: string
          price?: number | null
          schedule?: string | null
          start_date: string
          syllabus?: Json | null
          title: string
          total_classes: number
          total_spots?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          available_spots?: number
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string
          price?: number | null
          schedule?: string | null
          start_date?: string
          syllabus?: Json | null
          title?: string
          total_classes?: number
          total_spots?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          payment_id: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          payment_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          payment_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      event_hosts: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_hosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string | null
          date: string | null
          ended_at: string | null
          event_id: string
          id: string
          location: string | null
          session_number: number
          started_at: string | null
          time: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          ended_at?: string | null
          event_id: string
          id?: string
          location?: string | null
          session_number: number
          started_at?: string | null
          time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          ended_at?: string | null
          event_id?: string
          id?: string
          location?: string | null
          session_number?: number
          started_at?: string | null
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          active: boolean | null
          available_spots: number
          branch_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          image_url: string | null
          instructor_bio: string | null
          instructor_name: string | null
          kind: string
          location: string | null
          price: number | null
          schedule: string | null
          syllabus: Json | null
          time: string | null
          title: string
          total_classes: number | null
          total_spots: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          available_spots: number
          branch_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          kind?: string
          location?: string | null
          price?: number | null
          schedule?: string | null
          syllabus?: Json | null
          time?: string | null
          title: string
          total_classes?: number | null
          total_spots: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          available_spots?: number
          branch_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          kind?: string
          location?: string | null
          price?: number | null
          schedule?: string | null
          syllabus?: Json | null
          time?: string | null
          title?: string
          total_classes?: number | null
          total_spots?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          branch_id: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter: {
        Row: {
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_checkouts: {
        Row: {
          created_at: string | null
          id: string
          payer_email: string | null
          payer_name: string | null
          preference_id: string | null
          price: number | null
          processed_at: string | null
          ref: string
          spots: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payer_email?: string | null
          payer_name?: string | null
          preference_id?: string | null
          price?: number | null
          processed_at?: string | null
          ref: string
          spots?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payer_email?: string | null
          payer_name?: string | null
          preference_id?: string | null
          price?: number | null
          processed_at?: string | null
          ref?: string
          spots?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean | null
          badge: string | null
          created_at: string | null
          emoji: string | null
          features: Json | null
          highlighted: boolean | null
          id: string
          image_url: string | null
          mp_plan_id: string | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          created_at?: string | null
          emoji?: string | null
          features?: Json | null
          highlighted?: boolean | null
          id?: string
          image_url?: string | null
          mp_plan_id?: string | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          created_at?: string | null
          emoji?: string | null
          features?: Json | null
          highlighted?: boolean | null
          id?: string
          image_url?: string | null
          mp_plan_id?: string | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          attended: boolean | null
          created_at: string | null
          email: string | null
          event_id: string
          id: string
          name: string | null
          payment_id: string | null
          spots: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          email?: string | null
          event_id: string
          id?: string
          name?: string | null
          payment_id?: string | null
          spots?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          email?: string | null
          event_id?: string
          id?: string
          name?: string | null
          payment_id?: string | null
          spots?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          email: string | null
          id: string
          monthly_price: number | null
          name: string | null
          notes: string | null
          payment_id: string | null
          plan_id: string | null
          preapproval_id: string | null
          redeem_token: string
          start_date: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_price?: number | null
          name?: string | null
          notes?: string | null
          payment_id?: string | null
          plan_id?: string | null
          preapproval_id?: string | null
          redeem_token?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_price?: number | null
          name?: string | null
          notes?: string | null
          payment_id?: string | null
          plan_id?: string | null
          preapproval_id?: string | null
          redeem_token?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      tickets: {
        Row: {
          attendee_email: string | null
          created_at: string | null
          event_id: string
          id: string
          registration_id: string
          session_id: string | null
          token: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          attendee_email?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          registration_id: string
          session_id?: string | null
          token?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          attendee_email?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          registration_id?: string
          session_id?: string | null
          token?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_tickets_for_registration: {
        Args: { p_event_id: string; p_registration_id: string; p_spots: number }
        Returns: undefined
      }
      backfill_tickets_for_session: {
        Args: { p_event_id: string; p_session_id: string }
        Returns: undefined
      }
      event_branch_id: { Args: { p_event_id: string }; Returns: string }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          app_metadata: Json
          email: string
          id: string
        }[]
      }
      get_branch_hosts: {
        Args: { p_branch_id: string }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_event_hosts: {
        Args: { p_event_id: string }
        Returns: {
          email: string
          id: string
          user_id: string
        }[]
      }
      get_staff: {
        Args: Record<PropertyKey, never>
        Returns: {
          branch_id: string
          created_at: string
          email: string
          id: string
          role: string
        }[]
      }
      is_host_of_event: { Args: { p_event_id: string }; Returns: boolean }
      recalculate_event_spots: {
        Args: { p_event_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// Convenience aliases
export type Branch = Database['public']['Tables']['branches']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type NewsletterRow = Database['public']['Tables']['newsletter']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type EventSession = Database['public']['Tables']['event_sessions']['Row']
export type EventHost = Database['public']['Tables']['event_hosts']['Row']
export type ClubRedemption = Database['public']['Tables']['club_redemptions']['Row']
