// Database type definitions for the email queue system
export interface Database {
  public: {
    Tables: {
      email_queue: {
        Row: {
          id: string;
          to_email: string;
          from_email: string;
          subject: string;
          content_html: string | null;
          content_text: string | null;
          template_id: string | null;
          template_data: Record<string, any>;
          priority: number;
          status:
            | 'pending'
            | 'processing'
            | 'sent'
            | 'failed'
            | 'cancelled'
            | 'retry';
          attempts: number;
          max_attempts: number;
          last_attempt_at: string | null;
          next_retry_at: string | null;
          sent_at: string | null;
          error_message: string | null;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['email_queue']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['email_queue']['Row']>;
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          subject_template: string;
          html_template: string;
          text_template: string | null;
          category: 'transactional' | 'marketing' | 'notification' | 'system';
          is_active: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['email_templates']['Row'],
          'id' | 'created_at' | 'updated_at' | 'version'
        >;
        Update: Partial<Database['public']['Tables']['email_templates']['Row']>;
      };
      email_delivery_logs: {
        Row: {
          id: string;
          email_id: string;
          event_type:
            | 'queued'
            | 'sent'
            | 'delivered'
            | 'bounced'
            | 'complained'
            | 'rejected'
            | 'failed';
          provider: string | null;
          provider_message_id: string | null;
          response_code: string | null;
          response_message: string | null;
          processed_at: string;
          metadata: Record<string, any>;
        };
        Insert: Omit<
          Database['public']['Tables']['email_delivery_logs']['Row'],
          'id' | 'processed_at'
        >;
        Update: Partial<
          Database['public']['Tables']['email_delivery_logs']['Row']
        >;
      };
      email_queue_settings: {
        Row: {
          id: string;
          key: string;
          value: any;
          description: string | null;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['email_queue_settings']['Row'],
          'id' | 'updated_at'
        >;
        Update: Partial<
          Database['public']['Tables']['email_queue_settings']['Row']
        >;
      };
      // Existing tables
      users: {
        Row: {
          id: string;
          email: string;
          raw_user_meta_data: Record<string, any>;
        };
        Insert: {
          id: string;
          email: string;
          raw_user_meta_data?: Record<string, any>;
        };
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      incidents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          title: string;
          description: string;
          affected_services: string[];
        };
        Insert: Omit<
          Database['public']['Tables']['incidents']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['incidents']['Row']>;
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          preferences: any;
          subscribed_at: string;
          confirmed: boolean;
        };
        Insert: Omit<Database['public']['Tables']['subscribers']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['subscribers']['Row']>;
      };
    };
    Functions: {
      add_email_to_queue: {
        Args: {
          p_to_email: string;
          p_from_email?: string;
          p_subject: string;
          p_content_html?: string | null;
          p_content_text?: string | null;
          p_template_id?: string | null;
          p_template_data?: Record<string, any>;
          p_priority?: number;
          p_metadata?: Record<string, any>;
        };
        Returns: string;
      };
      process_email_queue: {
        Args: {
          batch_size?: number;
        };
        Returns: { processed: number; failed: number }[];
      };
      get_email_queue_stats: {
        Args: Record<string, never>;
        Returns: {
          pending_count: number;
          processing_count: number;
          sent_today: number;
          failed_today: number;
          retry_count: number;
          avg_delivery_time?: string;
        }[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    RLS: {
      [_ in never]: never;
    };
  };
}
