import type { APIRoute } from 'astro';
import { outageNotificationService } from '../../../lib/notifications/outage-service';
import { sanitizeString } from '../../../lib/sanitization';
import { logger } from '../../../lib/logger';

export const prerender = false;

// GET: Fetch active outage events
export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const limit = parseInt(sanitizeString(searchParams.get('limit') || '50'));

    let events;
    if (activeOnly) {
      events = await outageNotificationService.getActiveOutageEvents();
    } else {
      events = await outageNotificationService.getAllOutageEvents(limit);
    }

    return new Response(JSON.stringify({ events }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.apiError('Outage events API error', error, {
      action: 'getOutageEvents',
      endpoint: '/api/outage-events',
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

// POST: Create new outage event (admin only)
export const POST: APIRoute = async ({ request }) => {
  try {
    // Check admin permissions (this would use your auth system)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // For now, we'll assume admin check passes
    // In a real implementation, you would verify the user has admin permissions

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'severity'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(`${field} is required`, { status: 400 });
      }
    }

    // Validate field values
    if (!['low', 'medium', 'high', 'critical'].includes(body.severity)) {
      return new Response('Invalid severity value', { status: 400 });
    }

    if (
      body.status &&
      !['investigating', 'identified', 'monitoring', 'resolved'].includes(
        body.status
      )
    ) {
      return new Response('Invalid status value', { status: 400 });
    }

    // Sanitize input
    const eventData = {
      title: sanitizeString(body.title),
      description: sanitizeString(body.description),
      status: body.status || 'investigating',
      severity: body.severity,
      affected_services: Array.isArray(body.affected_services)
        ? body.affected_services
        : [],
      affected_regions: Array.isArray(body.affected_regions)
        ? body.affected_regions
        : [],
      estimated_resolution: body.estimated_resolution || null,
      created_by: 'admin-user-id', // This would come from auth
    };

    const event = await outageNotificationService.createOutageEvent(eventData);

    if (!event) {
      return new Response('Failed to create outage event', { status: 500 });
    }

    return new Response(JSON.stringify({ event }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.apiError('Outage events API error', error, {
      action: 'createOutageEvent',
      endpoint: '/api/outage-events',
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
