import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../lib/database.types';

const supabase = createClient<Database>(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';

    // Get all data caps with user information
    let query = supabase
      .from('data_caps')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('user_id', `%${search}%`);
    }

    const { data: dataCaps, error: capsError } = await query;

    if (capsError) {
      return new Response(JSON.stringify({ error: capsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('data_caps')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) {
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get system-wide statistics
    const { data: stats, error: statsError } = await supabase
      .from('data_caps')
      .select('monthly_cap_gb, current_usage_gb')
      .eq('is_active', true);

    if (statsError) {
      return new Response(JSON.stringify({ error: statsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalUsers = stats?.length || 0;
    const totalCapacityGB =
      stats?.reduce(
        (sum, cap: { monthly_cap_gb: number }) => sum + cap.monthly_cap_gb,
        0
      ) || 0;
    const totalUsageGB =
      stats?.reduce(
        (sum, cap: { current_usage_gb: number }) => sum + cap.current_usage_gb,
        0
      ) || 0;
    const averageUsagePercentage =
      totalCapacityGB > 0 ? (totalUsageGB / totalCapacityGB) * 100 : 0;

    // Get users with high usage (>90% of cap)
    const highUsageUsers =
      dataCaps?.filter(
        (cap: { current_usage_gb: number; monthly_cap_gb: number }) =>
          (cap.current_usage_gb / cap.monthly_cap_gb) * 100 > 90
      ) || [];

    // Get recent notifications
    const { data: recentNotifications, error: notifError } = await supabase
      .from('usage_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20);

    if (notifError) {
      return new Response(JSON.stringify({ error: notifError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        dataCaps: dataCaps || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        statistics: {
          totalUsers,
          totalCapacityGB,
          totalUsageGB,
          averageUsagePercentage:
            Math.round(averageUsagePercentage * 100) / 100,
          highUsageUsersCount: highUsageUsers.length,
          systemLoadPercentage:
            Math.round((totalUsageGB / totalCapacityGB) * 100 * 100) / 100,
        },
        highUsageUsers,
        recentNotifications: recentNotifications || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Admin monitoring API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, package_id, monthly_cap_gb, billing_cycle_start } = body;

    if (!userId || !package_id || !monthly_cap_gb) {
      return new Response(
        JSON.stringify({
          error: 'User ID, package ID, and monthly cap required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create or update data cap for user
    const { data, error: upsertError } = await supabase
      .from('data_caps')
      .upsert({
        user_id: userId,
        package_id,
        monthly_cap_gb,
        billing_cycle_start:
          billing_cycle_start || new Date().toISOString().split('T')[0],
        notification_thresholds: [80, 90, 100],
        is_active: true,
      } as Database['public']['Tables']['data_caps']['Insert'])
      .select()
      .single();

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Admin monitoring POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
