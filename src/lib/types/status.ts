// Extended database types for status module
export interface StatusDatabase {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_services: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_services: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_services?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
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
      service_uptime: {
        Row: {
          service_id: string;
          uptime_percentage: number;
          period_days: number;
          last_check: string;
        };
        Insert: never;
        Update: never;
      };
    };
  };
}
