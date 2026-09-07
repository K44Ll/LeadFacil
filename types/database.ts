export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      interactions: {
        Row: {
          created_at: string;
          happened_at: string;
          id: string;
          lead_id: string;
          observation: string;
          result: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          happened_at?: string;
          id?: string;
          lead_id: string;
          observation: string;
          result?: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          happened_at?: string;
          id?: string;
          lead_id?: string;
          observation?: string;
          result?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_user_id_fkey";
            columns: ["lead_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      lead_lists: {
        Row: {
          created_at: string;
          lead_id: string;
          list_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          lead_id: string;
          list_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          lead_id?: string;
          list_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_lists_lead_id_user_id_fkey";
            columns: ["lead_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "lead_lists_list_id_user_id_fkey";
            columns: ["list_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      lead_score_factors: {
        Row: {
          created_at: string;
          description: string;
          factor_key: string;
          id: string;
          label: string;
          lead_id: string;
          points: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          factor_key: string;
          id?: string;
          label: string;
          lead_id: string;
          points: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          factor_key?: string;
          id?: string;
          label?: string;
          lead_id?: string;
          points?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_score_factors_lead_id_user_id_fkey";
            columns: ["lead_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      lead_tags: {
        Row: {
          created_at: string;
          lead_id: string;
          tag_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          lead_id: string;
          tag_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          lead_id?: string;
          tag_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_user_id_fkey";
            columns: ["lead_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "lead_tags_tag_id_user_id_fkey";
            columns: ["tag_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      leads: {
        Row: {
          address: string;
          analysis: Json;
          category: string;
          city: string;
          company_name: string;
          confidence: Json;
          country: string;
          created_at: string;
          description: string;
          domain: string | null;
          email: string | null;
          facebook: string | null;
          google_rating: number | null;
          google_maps_url: string;
          id: string;
          instagram: string | null;
          is_active: boolean;
          enrichment_confidence: number;
          discovery_distance_m: number | null;
          last_contacted_at: string | null;
          last_enriched_at: string | null;
          latitude: number | null;
          linkedin: string | null;
          longitude: number | null;
          neighborhood: string;
          notes: string;
          opening_hours: string | null;
          phone: string | null;
          postal_code: string | null;
          review_count: number;
          score: number;
          source: string;
          source_id: string;
          source_url: string | null;
          sources: string[];
          state: string;
          status: string;
          updated_at: string;
          user_id: string;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address?: string;
          analysis?: Json;
          category?: string;
          city?: string;
          company_name: string;
          confidence?: Json;
          country?: string;
          created_at?: string;
          description?: string;
          domain?: string | null;
          email?: string | null;
          facebook?: string | null;
          google_rating?: number | null;
          google_maps_url?: string;
          id?: string;
          instagram?: string | null;
          is_active?: boolean;
          enrichment_confidence?: number;
          discovery_distance_m?: number | null;
          last_contacted_at?: string | null;
          last_enriched_at?: string | null;
          latitude?: number | null;
          linkedin?: string | null;
          longitude?: number | null;
          neighborhood?: string;
          notes?: string;
          opening_hours?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          review_count?: number;
          score?: number;
          source: string;
          source_id: string;
          source_url?: string | null;
          sources?: string[];
          state?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string;
          analysis?: Json;
          category?: string;
          city?: string;
          company_name?: string;
          confidence?: Json;
          country?: string;
          created_at?: string;
          description?: string;
          domain?: string | null;
          email?: string | null;
          facebook?: string | null;
          google_rating?: number | null;
          google_maps_url?: string;
          id?: string;
          instagram?: string | null;
          is_active?: boolean;
          enrichment_confidence?: number;
          discovery_distance_m?: number | null;
          last_contacted_at?: string | null;
          last_enriched_at?: string | null;
          latitude?: number | null;
          linkedin?: string | null;
          longitude?: number | null;
          neighborhood?: string;
          notes?: string;
          opening_hours?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          review_count?: number;
          score?: number;
          source?: string;
          source_id?: string;
          source_url?: string | null;
          sources?: string[];
          state?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      lists: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          id: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      searches: {
        Row: {
          created_at: string;
          id: string;
          location: string;
          niche: string;
          provider: string;
          quantity: number;
          result_count: number;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location: string;
          niche: string;
          provider: string;
          quantity: number;
          result_count?: number;
          status: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string;
          niche?: string;
          provider?: string;
          quantity?: number;
          result_count?: number;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      crm_mutate: { Args: { payload: Json }; Returns: undefined };
      crm_save_search: {
        Args: { businesses: Json; search_record: Json };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
