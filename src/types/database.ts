export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
      }
      events: {
        Row: {
          active: boolean | null
          available_spots: number
          branch_id: string | null
          created_at: string | null
          date: string
          description: string | null
          ended_at: string | null
          id: string
          image_url: string | null
          instructor_bio: string | null
          instructor_name: string | null
          kind: string
          location: string | null
          price: number | null
          schedule: string | null
          started_at: string | null
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
          ended_at?: string | null
          id?: string
          image_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          kind?: string
          location?: string | null
          price?: number | null
          schedule?: string | null
          started_at?: string | null
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
          ended_at?: string | null
          id?: string
          image_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          kind?: string
          location?: string | null
          price?: number | null
          schedule?: string | null
          started_at?: string | null
          syllabus?: Json | null
          time?: string | null
          title?: string
          total_classes?: number | null
          total_spots?: number
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
      plans: {
        Row: {
          active: boolean | null
          badge: string | null
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
        Relationships: []
      }
      subscriptions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          monthly_price: number | null
          notes: string | null
          plan_id: string | null
          start_date: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          monthly_price?: number | null
          notes?: string | null
          plan_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          monthly_price?: number | null
          notes?: string | null
          plan_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience aliases
export type Branch = Database['public']['Tables']['branches']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type Enrollment = Database['public']['Tables']['enrollments']['Row']
export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type NewsletterRow = Database['public']['Tables']['newsletter']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type EventSession = Database['public']['Tables']['event_sessions']['Row']
