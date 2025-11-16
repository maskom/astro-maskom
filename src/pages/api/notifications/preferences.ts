import type { APIRoute } from 'astro';
import { outageNotificationService } from '../../../lib/notifications/outage-service';
import { sanitizeString } from '../../../lib/sanitization';
import { logger } from '../../../lib/logger';

export const prerender = false;

// GET: Fetch user notification preferences
export const GET: APIRoute = async ({ request }) => {
  try {
    // Get user from authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify token and get user ID (this would use your auth system)
    const userId = 'user-id-placeholder'; // This should come from token verification

    const preferences =
      await outageNotificationService.getUserNotificationPreferences(userId);

    if (!preferences) {
      return new Response('Notification preferences not found', {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ preferences }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.apiError('Notification preferences API error', error, {
      action: 'getNotificationPreferences',
      endpoint: '/api/notifications/preferences',
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

// PUT: Update user notification preferences
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

    // Validate and sanitize input
    const validFields = [
      'email_notifications',
      'sms_notifications',
      'in_app_notifications',
      'push_notifications',
      'phone_number',
      'outage_notifications',
      'maintenance_notifications',
      'billing_notifications',
      'marketing_notifications',
      'minimum_severity',
      'quiet_hours_start',
      'quiet_hours_end',
      'timezone',
    ];

    const updates: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      if (validFields.includes(key)) {
        if (typeof value === 'string') {
          updates[key] = sanitizeString(value);
        } else {
          updates[key] = value;
        }
      }
    }

    // Validate specific fields
    if (
      updates.minimum_severity &&
      !['low', 'medium', 'high', 'critical'].includes(updates.minimum_severity)
    ) {
      return new Response('Invalid minimum_severity value', { status: 400 });
    }

    if (
      updates.phone_number &&
      !/^\+?[\d\s\-()]+$/.test(updates.phone_number)
    ) {
      return new Response('Invalid phone number format', { status: 400 });
    }

    if (
      updates.quiet_hours_start &&
      !/^\d{2}:\d{2}$/.test(updates.quiet_hours_start)
    ) {
      return new Response('Invalid quiet_hours_start format (use HH:MM)', {
        status: 400,
      });
    }

    if (
      updates.quiet_hours_end &&
      !/^\d{2}:\d{2}$/.test(updates.quiet_hours_end)
    ) {
      return new Response('Invalid quiet_hours_end format (use HH:MM)', {
        status: 400,
      });
    }

    const preferences =
      await outageNotificationService.updateUserNotificationPreferences(
        userId,
        updates
      );

    if (!preferences) {
      return new Response('Failed to update notification preferences', {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ preferences }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.apiError('Notification preferences API error', error, {
      action: 'updateNotificationPreferences',
      endpoint: '/api/notifications/preferences',
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
