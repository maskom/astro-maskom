import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/database.types';

const supabase = createClient(
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

    // Get data caps for the user
    const { data: dataCaps, error: capsError } = await supabase
      .from('data_caps')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (capsError && capsError.code !== 'PGRST116') {
      // Not found error
      return new Response(JSON.stringify({ error: capsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get usage history for the last 6 months
    const { data: history, error: historyError } = await supabase
      .from('bandwidth_usage_history')
      .select('*')
      .eq('user_id', user.id)
      .gte(
        'month',
        new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
          .substring(0, 7)
      )
      .order('month', { ascending: true });

    if (historyError) {
      return new Response(JSON.stringify({ error: historyError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        dataCap: dataCaps || null,
        history: history || [],
        summary: dataCaps
          ? {
              usagePercentage:
                (dataCaps.current_usage_gb / dataCaps.monthly_cap_gb) * 100,
              remainingGB: dataCaps.monthly_cap_gb - dataCaps.current_usage_gb,
              daysRemaining: Math.ceil(
                (new Date(dataCaps.billing_cycle_start).getTime() +
                  30 * 24 * 60 * 60 * 1000 -
                  Date.now()) /
                  (24 * 60 * 60 * 1000)
              ),
            }
          : null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Data caps API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { package_id, monthly_cap_gb, billing_cycle_start } = body;

    if (!package_id || !monthly_cap_gb) {
      return new Response(
        JSON.stringify({ error: 'Package ID and monthly cap required' }),
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

    // Create or update data cap
    const { data, error: upsertError } = await supabase
      .from('data_caps')
      .upsert({
        user_id: user.id,
        package_id,
        monthly_cap_gb,
        billing_cycle_start:
          billing_cycle_start || new Date().toISOString().split('T')[0],
        notification_thresholds: [80, 90, 100],
        is_active: true,
      })
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
    console.error('Data caps POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { monthly_cap_gb, notification_thresholds } = body;

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

    // Update data cap
    const updateData: Partial<
      Database['public']['Tables']['data_caps']['Update']
    > = {};
    if (monthly_cap_gb) updateData.monthly_cap_gb = monthly_cap_gb;
    if (notification_thresholds)
      updateData.notification_thresholds = notification_thresholds;

    const { data, error: updateError } = await supabase
      .from('data_caps')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
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
    console.error('Data caps PUT error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
