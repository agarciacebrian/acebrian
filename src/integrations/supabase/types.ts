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
      capabilities: {
        Row: {
          category: string
          created_at: string
          deployed_at_turn: number
          description: string | null
          effects: Json
          game_id: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          deployed_at_turn: number
          description?: string | null
          effects?: Json
          game_id: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          deployed_at_turn?: number
          description?: string | null
          effects?: Json
          game_id?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capabilities_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      country_seeds: {
        Row: {
          code: string
          created_at: string
          description: string | null
          flag_emoji: string
          initial_capabilities: Json
          initial_rankings: Json
          initial_state: Json
          name: string
          organizations: Json
          region: string
          type: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          flag_emoji: string
          initial_capabilities?: Json
          initial_rankings: Json
          initial_state: Json
          name: string
          organizations?: Json
          region: string
          type?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          flag_emoji?: string
          initial_capabilities?: Json
          initial_rankings?: Json
          initial_state?: Json
          name?: string
          organizations?: Json
          region?: string
          type?: string
        }
        Relationships: []
      }
      game_events: {
        Row: {
          actors: Json
          body: string
          category: string
          created_at: string
          game_id: string
          id: string
          lore_date: string
          severity: string
          title: string
          turn_number: number
        }
        Insert: {
          actors?: Json
          body: string
          category: string
          created_at?: string
          game_id: string
          id?: string
          lore_date: string
          severity?: string
          title: string
          turn_number: number
        }
        Update: {
          actors?: Json
          body?: string
          category?: string
          created_at?: string
          game_id?: string
          id?: string
          lore_date?: string
          severity?: string
          title?: string
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state_snapshots: {
        Row: {
          created_at: string
          cyber: Json
          defense: Json
          energy: Json
          game_id: string
          id: string
          lore_date: string
          macro: Json
          rankings: Json
          rankings_delta: Json
          social: Json
          soft_power: Json
          strategic: Json
          turn_number: number
        }
        Insert: {
          created_at?: string
          cyber?: Json
          defense?: Json
          energy?: Json
          game_id: string
          id?: string
          lore_date: string
          macro?: Json
          rankings?: Json
          rankings_delta?: Json
          social?: Json
          soft_power?: Json
          strategic?: Json
          turn_number: number
        }
        Update: {
          created_at?: string
          cyber?: Json
          defense?: Json
          energy?: Json
          game_id?: string
          id?: string
          lore_date?: string
          macro?: Json
          rankings?: Json
          rankings_delta?: Json
          social?: Json
          soft_power?: Json
          strategic?: Json
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_state_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          difficulty: string
          flag_emoji: string
          id: string
          lore_date: string
          status: string
          territory_code: string
          territory_name: string
          turn_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          flag_emoji?: string
          id?: string
          lore_date?: string
          status?: string
          territory_code: string
          territory_name: string
          turn_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          flag_emoji?: string
          id?: string
          lore_date?: string
          status?: string
          territory_code?: string
          territory_name?: string
          turn_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incoming_requests: {
        Row: {
          actor_flag: string | null
          actor_name: string
          actor_role: string | null
          created_at: string
          created_at_turn: number
          game_id: string
          id: string
          lore_date: string
          message: string
          origin: string
          request_type: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_session_id: string | null
          status: string
          suggested_attendees: Json
          topic: string
          urgency: string
        }
        Insert: {
          actor_flag?: string | null
          actor_name: string
          actor_role?: string | null
          created_at?: string
          created_at_turn: number
          game_id: string
          id?: string
          lore_date: string
          message: string
          origin?: string
          request_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_session_id?: string | null
          status?: string
          suggested_attendees?: Json
          topic: string
          urgency?: string
        }
        Update: {
          actor_flag?: string | null
          actor_name?: string
          actor_role?: string | null
          created_at?: string
          created_at_turn?: number
          game_id?: string
          id?: string
          lore_date?: string
          message?: string
          origin?: string
          request_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_session_id?: string | null
          status?: string
          suggested_attendees?: Json
          topic?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_requests_resolved_session_id_fkey"
            columns: ["resolved_session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          player_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          player_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      roleplay_messages: {
        Row: {
          actor_flag: string | null
          actor_name: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          actor_flag?: string | null
          actor_name?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          actor_flag?: string | null
          actor_name?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_sessions: {
        Row: {
          closed_at: string | null
          convocados: Json
          created_at: string
          exchange_count: number
          game_id: string
          id: string
          opened_at_turn: number
          status: string
          summary: string | null
          topic: string
        }
        Insert: {
          closed_at?: string | null
          convocados?: Json
          created_at?: string
          exchange_count?: number
          game_id: string
          id?: string
          opened_at_turn: number
          status?: string
          summary?: string | null
          topic: string
        }
        Update: {
          closed_at?: string | null
          convocados?: Json
          created_at?: string
          exchange_count?: number
          game_id?: string
          id?: string
          opened_at_turn?: number
          status?: string
          summary?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_meetings: {
        Row: {
          agenda: string | null
          created_at: string
          game_id: string
          id: string
          meeting_type: string
          organization: string
          outcome: string | null
          scheduled_date: string
          status: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          game_id: string
          id?: string
          meeting_type: string
          organization: string
          outcome?: string | null
          scheduled_date: string
          status?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          game_id?: string
          id?: string
          meeting_type?: string
          organization?: string
          outcome?: string | null
          scheduled_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_meetings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
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
