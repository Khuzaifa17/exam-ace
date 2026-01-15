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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      content_nodes: {
        Row: {
          created_at: string
          description: string | null
          exam_id: string
          id: string
          node_type: Database["public"]["Enums"]["node_type"]
          order_index: number | null
          parent_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exam_id: string
          id?: string
          node_type: Database["public"]["Enums"]["node_type"]
          order_index?: number | null
          parent_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exam_id?: string
          id?: string
          node_type?: Database["public"]["Enums"]["node_type"]
          order_index?: number | null
          parent_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_nodes_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_usage: {
        Row: {
          created_at: string
          demo_completed: boolean
          exam_id: string
          id: string
          questions_attempted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_completed?: boolean
          exam_id: string
          id?: string
          questions_attempted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demo_completed?: boolean
          exam_id?: string
          id?: string
          questions_attempted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_usage_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          demo_attempts_per_day: number | null
          demo_questions_limit: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_attempts_per_day?: number | null
          demo_questions_limit?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_attempts_per_day?: number | null
          demo_questions_limit?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          exam_id: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          exam_id: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          exam_id?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          content_node_id: string
          correct_option: number
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          explanation: string | null
          id: string
          option1: string
          option2: string
          option3: string
          option4: string
          source: string | null
          text1: string
          updated_at: string
          year: number | null
        }
        Insert: {
          content_node_id: string
          correct_option: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          explanation?: string | null
          id?: string
          option1: string
          option2: string
          option3: string
          option4: string
          source?: string | null
          text1: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          content_node_id?: string
          correct_option?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          explanation?: string | null
          id?: string
          option1?: string
          option2?: string
          option3?: string
          option4?: string
          source?: string | null
          text1?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_content_node_id_fkey"
            columns: ["content_node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          exam_id: string
          expires_at: string
          id: string
          is_active: boolean | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          answered_at: string | null
          id: string
          is_correct: boolean | null
          order_index: number
          question_id: string
          selected_option: number | null
          test_id: string
        }
        Insert: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          order_index: number
          question_id: string
          selected_option?: number | null
          test_id: string
        }
        Update: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          order_index?: number
          question_id?: string
          selected_option?: number | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          completed_at: string | null
          content_node_id: string | null
          correct_answers: number | null
          exam_id: string
          id: string
          is_mock: boolean | null
          started_at: string
          time_limit_seconds: number | null
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_node_id?: string | null
          correct_answers?: number | null
          exam_id: string
          id?: string
          is_mock?: boolean | null
          started_at?: string
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_node_id?: string | null
          correct_answers?: number | null
          exam_id?: string
          id?: string
          is_mock?: boolean | null
          started_at?: string
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_content_node_id_fkey"
            columns: ["content_node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      questions_public: {
        Row: {
          content_node_id: string | null
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          explanation: string | null
          id: string | null
          option1: string | null
          option2: string | null
          option3: string | null
          option4: string | null
          source: string | null
          text1: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          content_node_id?: string | null
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          explanation?: string | null
          id?: string | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          option4?: string | null
          source?: string | null
          text1?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          content_node_id?: string | null
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          explanation?: string | null
          id?: string | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          option4?: string | null
          source?: string | null
          text1?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_content_node_id_fkey"
            columns: ["content_node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_answer: {
        Args: { question_id: string; selected_option: number }
        Returns: {
          correct_option: number
          explanation: string
          is_correct: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "easy" | "medium" | "hard"
      node_type: "TRACK" | "SUBJECT" | "CHAPTER" | "TOPIC"
      payment_method: "jazzcash" | "easypaisa" | "nayapay" | "bank"
      payment_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      difficulty_level: ["easy", "medium", "hard"],
      node_type: ["TRACK", "SUBJECT", "CHAPTER", "TOPIC"],
      payment_method: ["jazzcash", "easypaisa", "nayapay", "bank"],
      payment_status: ["pending", "approved", "rejected"],
    },
  },
} as const
