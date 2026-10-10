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
      agent_actions: {
        Row: {
          action: string
          actor: string
          analysis_id: string
          created_at: string
          description: string | null
          id: string
          seq: number
          status: string
          user_id: string
        }
        Insert: {
          action: string
          actor: string
          analysis_id: string
          created_at?: string
          description?: string | null
          id?: string
          seq: number
          status?: string
          user_id?: string
        }
        Update: {
          action?: string
          actor?: string
          analysis_id?: string
          created_at?: string
          description?: string | null
          id?: string
          seq?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          affected_area: number | null
          agent_decision: string | null
          completed_at: string | null
          confidence: number | null
          created_at: string
          crop_id: string | null
          crop_type: string
          error_message: string | null
          field_id: string | null
          final_assessment: string | null
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          image_quality_score: number | null
          mode: string
          notes: string | null
          pipeline: Json
          source: Database["public"]["Enums"]["data_source"]
          status: Database["public"]["Enums"]["analysis_status"]
          suspicious_region_count: number | null
          updated_at: string
          user_id: string
          vegetation_coverage: number | null
        }
        Insert: {
          affected_area?: number | null
          agent_decision?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          crop_id?: string | null
          crop_type: string
          error_message?: string | null
          field_id?: string | null
          final_assessment?: string | null
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          image_quality_score?: number | null
          mode?: string
          notes?: string | null
          pipeline?: Json
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["analysis_status"]
          suspicious_region_count?: number | null
          updated_at?: string
          user_id?: string
          vegetation_coverage?: number | null
        }
        Update: {
          affected_area?: number | null
          agent_decision?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          crop_id?: string | null
          crop_type?: string
          error_message?: string | null
          field_id?: string | null
          final_assessment?: string | null
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          image_quality_score?: number | null
          mode?: string
          notes?: string | null
          pipeline?: Json
          source?: Database["public"]["Enums"]["data_source"]
          status?: Database["public"]["Enums"]["analysis_status"]
          suspicious_region_count?: number | null
          updated_at?: string
          user_id?: string
          vegetation_coverage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_diagnoses: {
        Row: {
          analysis_id: string
          cause: string | null
          confidence: number | null
          created_at: string
          crop: string | null
          disclaimer: string | null
          disease: string | null
          id: string
          is_healthy: boolean | null
          looks_like: Json | null
          management: Json | null
          message: string | null
          other_possibilities: Json | null
          prevention: Json | null
          status: string
          symptoms: Json | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          cause?: string | null
          confidence?: number | null
          created_at?: string
          crop?: string | null
          disclaimer?: string | null
          disease?: string | null
          id?: string
          is_healthy?: boolean | null
          looks_like?: Json | null
          management?: Json | null
          message?: string | null
          other_possibilities?: Json | null
          prevention?: Json | null
          status: string
          symptoms?: Json | null
          user_id?: string
        }
        Update: {
          analysis_id?: string
          cause?: string | null
          confidence?: number | null
          created_at?: string
          crop?: string | null
          disclaimer?: string | null
          disease?: string | null
          id?: string
          is_healthy?: boolean | null
          looks_like?: Json | null
          management?: Json | null
          message?: string | null
          other_possibilities?: Json | null
          prevention?: Json | null
          status?: string
          symptoms?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_diagnoses_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: true
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_images: {
        Row: {
          analysis_id: string
          created_at: string
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          analysis_id: string
          created_at?: string
          height?: number | null
          id?: string
          kind: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id?: string
          width?: number | null
        }
        Update: {
          analysis_id?: string
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_images_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_measurements: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          key: string
          label: string
          unit: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          key: string
          label: string
          unit?: string | null
          user_id?: string
          value?: number | null
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          unit?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_measurements_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_regions: {
        Row: {
          analysis_id: string
          area_percent: number | null
          contour: Json | null
          created_at: string
          h: number
          id: string
          label: string
          reanalyzed: boolean
          severity: string
          user_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          analysis_id: string
          area_percent?: number | null
          contour?: Json | null
          created_at?: string
          h: number
          id?: string
          label: string
          reanalyzed?: boolean
          severity?: string
          user_id?: string
          w: number
          x: number
          y: number
        }
        Update: {
          analysis_id?: string
          area_percent?: number | null
          contour?: Json | null
          created_at?: string
          h?: number
          id?: string
          label?: string
          reanalyzed?: boolean
          severity?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_regions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          created_at: string
          field_id: string | null
          id: string
          name: string
          planted_on: string | null
          user_id: string
          variety: string | null
        }
        Insert: {
          created_at?: string
          field_id?: string | null
          id?: string
          name: string
          planted_on?: string | null
          user_id?: string
          variety?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string | null
          id?: string
          name?: string
          planted_on?: string | null
          user_id?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crops_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          area_hectares: number | null
          created_at: string
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          location: string | null
          name: string
          primary_crop: string | null
          source: Database["public"]["Enums"]["data_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          area_hectares?: number | null
          created_at?: string
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          location?: string | null
          name: string
          primary_crop?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          area_hectares?: number | null
          created_at?: string
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          location?: string | null
          name?: string
          primary_crop?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          organization: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          organization?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          analysis_id: string | null
          created_at: string
          field_id: string | null
          id: string
          next_step: string | null
          reason: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          field_id?: string | null
          id?: string
          next_step?: string | null
          reason?: string | null
          severity?: string
          title: string
          user_id?: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          field_id?: string | null
          id?: string
          next_step?: string | null
          reason?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          report_type: string
          source: Database["public"]["Enums"]["data_source"]
          status: string
          storage_path: string | null
          summary: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type: string
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          storage_path?: string | null
          summary?: Json
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          source?: Database["public"]["Enums"]["data_source"]
          status?: string
          storage_path?: string | null
          summary?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      analysis_status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "vision_unavailable"
      data_source: "demo" | "backend"
      health_status: "healthy" | "attention" | "high_stress" | "unknown"
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
      analysis_status: [
        "queued",
        "processing",
        "completed",
        "failed",
        "vision_unavailable",
      ],
      data_source: ["demo", "backend"],
      health_status: ["healthy", "attention", "high_stress", "unknown"],
    },
  },
} as const
