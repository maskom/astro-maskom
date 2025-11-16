import type { APIRoute } from 'astro';
import { outageNotificationService } from '../../../lib/notifications/outage-service';
import { sanitizeString } from '../../../lib/sanitization';
import { logger } from '../../../lib/logger';

export const prerender = false;

// PUT: Update outage event (admin only)
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const eventId = params.id;
    if (!eventId) {
      return new Response('Event ID is required', { status: 400 });
    }

    // Check admin permissions
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();

    // Validate field values
    if (
      body.status &&
      !['investigating', 'identified', 'monitoring', 'resolved'].includes(
        body.status
      )
    ) {
      return new Response('Invalid status value', { status: 400 });
    }

    if (
      body.severity &&
      !['low', 'medium', 'high', 'critical'].includes(body.severity)
    ) {
      return new Response('Invalid severity value', { status: 400 });
    }

    // Sanitize input
    const updates: Record<string, any> = {};

    if (body.title !== undefined) {
      updates.title = sanitizeString(body.title);
    }
    if (body.description !== undefined) {
      updates.description = sanitizeString(body.description);
    }
    if (body.status !== undefined) {
      updates.status = body.status;
    }
    if (body.severity !== undefined) {
      updates.severity = body.severity;
    }
    if (Array.isArray(body.affected_services)) {
      updates.affected_services = body.affected_services;
    }
    if (Array.isArray(body.affected_regions)) {
      updates.affected_regions = body.affected_regions;
    }
    if (body.estimated_resolution !== undefined) {
      updates.estimated_resolution = body.estimated_resolution;
    }
    if (body.actual_resolution !== undefined) {
      updates.actual_resolution = body.actual_resolution;
    }

    // If status is being set to resolved, set resolution time and resolver
    if (body.status === 'resolved') {
      updates.actual_resolution = new Date().toISOString();
      updates.resolved_by = 'admin-user-id'; // This would come from auth
    }

    const event = await outageNotificationService.updateOutageEvent(
      eventId,
      updates
    );

    if (!event) {
      return new Response('Outage event not found or update failed', {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ event }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.apiError('Outage event update API error', error, {
      action: 'updateOutageEvent',
      endpoint: `/api/outage-events/${params.id}`,
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
