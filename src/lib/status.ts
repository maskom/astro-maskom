import { createClient } from '@supabase/supabase-js';

// Database types
interface DatabaseService {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
  updated_at: string;
}

interface ServiceUptime {
  service_id: string;
  period_days: number;
  uptime_percentage: number;
}

// Define types for our status data
export interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  created_at: string;
  updated_at: string;
  description: string;
  affected_services: string[]; // Array of service IDs
}

export interface StatusData {
  overall_status: 'operational' | 'degraded' | 'outage';
  last_updated: string;
  services: ServiceStatus[];
  incidents: Incident[];
}

// Singleton Supabase client for server-side usage
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const createSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations
    ) as ReturnType<typeof createClient>;
  }
  return supabaseClient;
};

// Status API functions
export const getStatusData = async (): Promise<StatusData> => {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error('Failed to create Supabase client');

  try {
    // Fetch services status
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (servicesError) throw servicesError;

    // Fetch active incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('*')
      .in('status', ['investigating', 'identified', 'monitoring'])
      .order('created_at', { ascending: false });

    if (incidentsError) throw incidentsError;

    // Calculate overall status based on services and incidents
    let overall_status: 'operational' | 'degraded' | 'outage' = 'operational';

    // First check if any services have outages or degraded status
    const hasServiceOutage = (services as DatabaseService[]).some(
      service => service.status === 'outage'
    );
    const hasServiceDegraded = (services as DatabaseService[]).some(
      service => service.status === 'degraded'
    );

    // Then consider active incidents
    const hasActiveIncidents = incidents.length > 0;

    if (hasServiceOutage) {
      overall_status = 'outage';
    } else if (hasServiceDegraded || hasActiveIncidents) {
      overall_status = 'degraded';
    }

    return {
      overall_status,
      last_updated: new Date().toISOString(),
      services: services || [],
      incidents: incidents || [],
    };
  } catch (error) {
    console.error('Error fetching status data:', error);
    // Return mock data in case of error
    return {
      overall_status: 'operational',
      last_updated: new Date().toISOString(),
      services: [],
      incidents: [],
    };
  }
};

// Function to calculate uptime percentage
export const getUptimePercentage = async (
  serviceId: string,
  days: number = 30
): Promise<number> => {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error('Failed to create Supabase client');

  try {
    // This is a simplified implementation
    // In a real system, you would have a history table tracking service status over time
    const { data, error } = await supabase
      .from('service_uptime')
      .select('uptime_percentage')
      .eq('service_id', serviceId)
      .eq('period_days', days)
      .single();

    if (error) throw error;

    return (data as ServiceUptime)?.uptime_percentage || 99.9;
  } catch (error) {
    console.error('Error fetching uptime data:', error);
    return 99.9; // Default to 99.9% uptime
  }
};

// Admin functions for managing incidents
export const createIncident = async (
  incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>
): Promise<Incident | null> => {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error('Failed to create Supabase client');

  try {
    const result = await (supabase as any)
      .from('incidents')
      .insert([
        {
          ...incident,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (result.error) throw result.error;
    return result.data as Incident;
  } catch (error) {
    console.error('Error creating incident:', error);
    return null;
  }
};

export const updateIncident = async (
  id: string,
  updates: Partial<Incident>
): Promise<Incident | null> => {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error('Failed to create Supabase client');

  try {
    const result = await (supabase as any)
      .from('incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (result.error) throw result.error;
    return result.data as Incident;
  } catch (error) {
    console.error('Error updating incident:', error);
    return null;
  }
};

export const getAllIncidents = async (): Promise<Incident[]> => {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error('Failed to create Supabase client');

  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return [];
  }
};
