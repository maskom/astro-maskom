import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const userId = url.searchParams.get('userId');

    // Get current user if userId not provided (for customer access)
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get bandwidth usage for the user
      const { data: usage, error: usageError } = await supabase
        .from('bandwidth_usage')
        .select('*')
        .eq('user_id', user.id)
        .gte('usage_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('usage_date', { ascending: true });

      if (usageError) {
        return new Response(JSON.stringify({ error: usageError.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get data cap information
      const { data: dataCap, error: capError } = await supabase
        .from('data_caps')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (capError && capError.code !== 'PGRST116') { // Not found error
        return new Response(JSON.stringify({ error: capError.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get notifications
      const { data: notifications, error: notifError } = await supabase
        .from('usage_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (notifError) {
        return new Response(JSON.stringify({ error: notifError.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        usage: usage || [],
        dataCap: dataCap || null,
        notifications: notifications || [],
        summary: {
          totalUsageGB: usage?.reduce((sum, day) => sum + (day.total_bytes / (1024 * 1024 * 1024)), 0) || 0,
          averageDailyGB: usage?.length ? usage.reduce((sum, day) => sum + (day.total_bytes / (1024 * 1024 * 1024)), 0) / usage.length : 0,
          usagePercentage: dataCap ? (dataCap.current_usage_gb / dataCap.monthly_cap_gb) * 100 : 0
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Admin access to specific user data
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get bandwidth usage for specified user
    const { data: usage, error: usageError } = await supabase
      .from('bandwidth_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('usage_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('usage_date', { ascending: true });

    if (usageError) {
      return new Response(JSON.stringify({ error: usageError.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      usage: usage || [],
      summary: {
        totalUsageGB: usage?.reduce((sum, day) => sum + (day.total_bytes / (1024 * 1024 * 1024)), 0) || 0,
        averageDailyGB: usage?.length ? usage.reduce((sum, day) => sum + (day.total_bytes / (1024 * 1024 * 1024)), 0) / usage.length : 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Bandwidth usage API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { download_bytes, upload_bytes, usage_date, package_id } = body;

    if (!download_bytes && !upload_bytes) {
      return new Response(JSON.stringify({ error: 'Download or upload bytes required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert or update bandwidth usage
    const { data, error: insertError } = await supabase
      .from('bandwidth_usage')
      .upsert({
        user_id: user.id,
        package_id: package_id || 'unknown',
        usage_date: usage_date || new Date().toISOString().split('T')[0],
        download_bytes: download_bytes || 0,
        upload_bytes: upload_bytes || 0
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Bandwidth usage POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};