import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { log, generateRequestId } from '../../../lib/logger';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const GET: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  const apiLogger = log.child({
    requestId,
    module: 'bandwidth-notifications',
    method: 'GET',
    url: request.url,
  });

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

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let query = supabase
      .from('usage_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: notifError } = await query;

    if (notifError) {
      return new Response(JSON.stringify({ error: notifError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('usage_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (countError) {
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    apiLogger.error(
      'Notifications API error',
      error instanceof Error ? error : new Error(String(error)),
      {
        method: 'GET',
        url: request.url,
      }
    );
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  const apiLogger = log.child({
    requestId,
    module: 'bandwidth-notifications',
    method: 'PUT',
    url: request.url,
  });

  try {
    const body = await request.json();
    const { notificationIds, markAsRead } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return new Response(
        JSON.stringify({ error: 'Notification IDs array required' }),
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

    // Update notifications
    const { data, error: updateError } = await supabase
      .from('usage_notifications')
      .update({ is_read: markAsRead !== false })
      .eq('user_id', user.id)
      .in('id', notificationIds)
      .select();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount: data?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    apiLogger.error(
      'Notifications PUT error',
      error instanceof Error ? error : new Error(String(error)),
      {
        method: 'PUT',
        url: request.url,
      }
    );
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  const apiLogger = log.child({
    requestId,
    module: 'bandwidth-notifications',
    method: 'DELETE',
    url: request.url,
  });

  try {
    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return new Response(
        JSON.stringify({ error: 'Notification IDs array required' }),
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

    // Delete notifications
    const { error: deleteError } = await supabase
      .from('usage_notifications')
      .delete()
      .eq('user_id', user.id)
      .in('id', notificationIds);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    apiLogger.error(
      'Notifications DELETE error',
      error instanceof Error ? error : new Error(String(error)),
      {
        method: 'DELETE',
        url: request.url,
      }
    );
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
