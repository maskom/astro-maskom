import type { APIRoute } from 'astro';
import { createServiceClient } from '../../../lib/supabase';
import { logger, generateRequestId } from '../../../lib/logger';

export const GET: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  let userId: string | undefined;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createServiceClient();
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

    userId = user.id;

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
    logger.apiError('Data caps API error', error, {
      requestId,
      userId,
      endpoint: '/api/bandwidth/data-caps',
      method: 'GET',
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  let userId: string | undefined;
  let package_id: string | undefined;
  let monthly_cap_gb: number | undefined;
  let billing_cycle_start: number | undefined;

  try {
    const body = await request.json();
    package_id = body.package_id;
    monthly_cap_gb = body.monthly_cap_gb;
    billing_cycle_start = body.billing_cycle_start;

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
    const supabase = createServiceClient();
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

    userId = user.id;

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
    logger.apiError('Data caps POST error', error, {
      requestId,
      userId,
      endpoint: '/api/bandwidth/data-caps',
      method: 'POST',
      package_id,
      monthly_cap_gb,
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  let userId: string | undefined;
  let monthly_cap_gb: number | undefined;
  let notification_thresholds: any;

  try {
    const body = await request.json();
    monthly_cap_gb = body.monthly_cap_gb;
    notification_thresholds = body.notification_thresholds;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createServiceClient();
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

    userId = user.id;

    // Update data cap
    const updateData: {
      monthly_cap_gb?: number;
      notification_thresholds?: number[];
    } = {};
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
    logger.apiError('Data caps PUT error', error, {
      requestId,
      userId,
      endpoint: '/api/bandwidth/data-caps',
      method: 'PUT',
      monthly_cap_gb,
      notification_thresholds,
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
