import type { APIRoute } from 'astro';
import { outageNotificationService } from '../../../lib/notifications/outage-service';
import { sanitizeString } from '../../../lib/sanitization';
import { logger } from '../../../lib/logger';

export const prerender = false;

// GET: Fetch user's outage notifications
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Get user from authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify token and get user ID (this would use your auth system)
    // For now, we'll assume the token is valid and contains user ID
    const userId = 'user-id-placeholder'; // This should come from token verification

    // Parse query parameters
    const searchParams = new URL(url).searchParams;
    const limit = parseInt(sanitizeString(searchParams.get('limit') || '20'));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await outageNotificationService.getUserNotifications(
      userId,
      limit,
      unreadOnly
    );

    return new Response(JSON.stringify({ notifications }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.apiError('Notifications API error', error, {
      action: 'getUserNotifications',
      endpoint: '/api/notifications',
    });

    const sanitizedError = sanitizeString(
      error instanceof Error ? error.message : 'Internal server error'
    );

    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: Mark notifications as read
export const PUT: APIRoute = async ({ request }) => {
  try {
    // Get user from authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify token and get user ID (this would use your auth system)
    const userId = 'user-id-placeholder'; // This should come from token verification

    const body = await request.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds)) {
      return new Response('notificationIds must be an array', { status: 400 });
    }

    // Mark each notification as read
    const results = await Promise.all(
      notificationIds.map(async (id: string) => {
        return await outageNotificationService.markNotificationAsRead(
          id,
          userId
        );
      })
    );

    const successCount = results.filter(Boolean).length;

    return new Response(
      JSON.stringify({
        success: true,
        markedCount: successCount,
        totalCount: notificationIds.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.apiError('Notifications API error', error, {
      action: 'markNotificationsAsRead',
      endpoint: '/api/notifications',
    });

    const sanitizedError = sanitizeString(
      error instanceof Error ? error.message : 'Internal server error'
    );

    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Delete notifications
export const DELETE: APIRoute = async ({ request }) => {
  try {
    // Get user from authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify token and get user ID (this would use your auth system)
    // const userId = 'user-id-placeholder'; // This should come from token verification

    const body = await request.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds)) {
      return new Response('notificationIds must be an array', { status: 400 });
    }

    // In a real implementation, you would delete notifications from the database
    // For now, we'll just return success

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: notificationIds.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.apiError('Notifications API error', error, {
      action: 'deleteNotifications',
      endpoint: '/api/notifications',
    });

    const sanitizedError = sanitizeString(
      error instanceof Error ? error.message : 'Internal server error'
    );

    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
