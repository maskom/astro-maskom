import { createClient } from '@supabase/supabase-js';

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

// Create Supabase client for server-side usage
export const createSupabaseClient = () => {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations
  );
};

// Status API functions
export const getStatusData = async (): Promise<StatusData> => {
  const supabase = createSupabaseClient();
  
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
      .eq('status', 'investigating')
      .or('status.eq.identified, status.eq.monitoring')
      .order('created_at', { ascending: false });
      
    if (incidentsError) throw incidentsError;
    
    // Calculate overall status
    let overall_status: 'operational' | 'degraded' | 'outage' = 'operational';
    if (incidents.some((incident: Incident) => incident.status === 'investigating' || incident.status === 'identified')) {
      overall_status = 'degraded';
    }
    if (incidents.some((incident: Incident) => incident.status === 'outage')) {
      overall_status = 'outage';
    }
    
    return {
      overall_status,
      last_updated: new Date().toISOString(),
      services: services || [],
      incidents: incidents || []
    };
  } catch (error) {
    console.error('Error fetching status data:', error);
    // Return mock data in case of error
    return {
      overall_status: 'operational',
      last_updated: new Date().toISOString(),
      services: [],
      incidents: []
    };
  }
};

// Function to calculate uptime percentage
export const getUptimePercentage = async (serviceId: string, days: number = 30): Promise<number> => {
  const supabase = createSupabaseClient();
  
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
    
    return data?.uptime_percentage || 99.9;
  } catch (error) {
    console.error('Error fetching uptime data:', error);
    return 99.9; // Default to 99.9% uptime
  }
};

// Admin functions for managing incidents
export const createIncident = async (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident | null> => {
  const supabase = createSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('incidents')
      .insert([{ ...incident, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating incident:', error);
    return null;
  }
};

export const updateIncident = async (id: string, updates: Partial<Incident>): Promise<Incident | null> => {
  const supabase = createSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating incident:', error);
    return null;
  }
};

export const getAllIncidents = async (): Promise<Incident[]> => {
  const supabase = createSupabaseClient();
  
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