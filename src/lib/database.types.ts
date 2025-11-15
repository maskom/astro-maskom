// Database type definitions for Supabase

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          name: string;
          status: 'operational' | 'degraded' | 'outage';
          description: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status: 'operational' | 'degraded' | 'outage';
          description: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: 'operational' | 'degraded' | 'outage';
          description?: string;
          updated_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          title: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          created_at: string;
          updated_at: string;
          description: string;
          affected_services: string[];
        };
        Insert: {
          id?: string;
          title: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          created_at?: string;
          updated_at?: string;
          description: string;
          affected_services: string[];
        };
        Update: {
          id?: string;
          title?: string;
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          created_at?: string;
          updated_at?: string;
          description?: string;
          affected_services?: string[];
        };
      };
      service_uptime: {
        Row: {
          id: string;
          service_id: string;
          period_days: number;
          uptime_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          period_days: number;
          uptime_percentage: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          period_days?: number;
          uptime_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          preferences: any;
          subscribed_at: string;
          confirmed: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          preferences: any;
          subscribed_at?: string;
          confirmed?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          preferences?: any;
          subscribed_at?: string;
          confirmed?: boolean;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          current_usage_gb: number;
          monthly_cap_gb: number;
          package_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          current_usage_gb?: number;
          monthly_cap_gb?: number;
          package_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          current_usage_gb?: number;
          monthly_cap_gb?: number;
          package_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_caps: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          monthly_cap_gb: number;
          current_usage_gb: number;
          billing_cycle_start: string;
          notification_thresholds: number[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id: string;
          monthly_cap_gb: number;
          current_usage_gb?: number;
          billing_cycle_start?: string;
          notification_thresholds?: number[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string;
          monthly_cap_gb?: number;
          current_usage_gb?: number;
          billing_cycle_start?: string;
          notification_thresholds?: number[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      usage_notifications: {
        Row: {
          id: string;
          user_id: string;
          data_cap_id: string;
          notification_type: string;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data_cap_id: string;
          notification_type: string;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data_cap_id?: string;
          notification_type?: string;
          sent_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
