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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          couple_id: string | null
          created_at: string
          emoji: string
          group_id: string | null
          id: string
          lat: number | null
          lng: number | null
          location: string
          map_type: string
          name: string
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          emoji?: string
          group_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string
          map_type?: string
          name?: string
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          emoji?: string
          group_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string
          map_type?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          anniversary: string | null
          created_at: string
          id: string
          invite_code: string
          status: string
          user1_id: string
          user2_id: string | null
        }
        Insert: {
          anniversary?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          status?: string
          user1_id: string
          user2_id?: string | null
        }
        Update: {
          anniversary?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          status?: string
          user1_id?: string
          user2_id?: string | null
        }
        Relationships: []
      }
      group_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          type?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          content: string | null
          created_at: string
          id: string
          location: string | null
          mood: string | null
          photo_urls: string[] | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          location?: string | null
          mood?: string | null
          photo_urls?: string[] | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          location?: string | null
          mood?: string | null
          photo_urls?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          checkin_notify: boolean
          created_at: string
          id: string
          member_join_notify: boolean
          memory_notify: boolean
          trip_plan_notify: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_notify?: boolean
          created_at?: string
          id?: string
          member_join_notify?: boolean
          memory_notify?: boolean
          trip_plan_notify?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_notify?: boolean
          created_at?: string
          id?: string
          member_join_notify?: boolean
          memory_notify?: boolean
          trip_plan_notify?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_emoji: string
          background_url: string | null
          created_at: string
          display_name: string
          id: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_emoji?: string
          background_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_emoji?: string
          background_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_history: {
        Row: {
          archived_at: string
          couple_id: string | null
          created_at: string
          end_date: string | null
          group_id: string | null
          id: string
          original_trip_id: string | null
          places: string[]
          start_date: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          archived_at?: string
          couple_id?: string | null
          created_at?: string
          end_date?: string | null
          group_id?: string | null
          id?: string
          original_trip_id?: string | null
          places?: string[]
          start_date?: string | null
          status?: string
          title?: string
          user_id: string
        }
        Update: {
          archived_at?: string
          couple_id?: string | null
          created_at?: string
          end_date?: string | null
          group_id?: string | null
          id?: string
          original_trip_id?: string | null
          places?: string[]
          start_date?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_plans: {
        Row: {
          couple_id: string | null
          created_at: string
          end_date: string | null
          group_id: string | null
          id: string
          places: string[]
          start_date: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          end_date?: string | null
          group_id?: string | null
          id?: string
          places?: string[]
          start_date?: string | null
          status?: string
          title?: string
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          end_date?: string | null
          group_id?: string | null
          id?: string
          places?: string[]
          start_date?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_plans_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
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
