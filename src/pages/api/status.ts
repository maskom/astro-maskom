import type { APIRoute } from 'astro';
import { getStatusData } from '../../lib/status';
import { sanitizeString } from '../../lib/sanitization';
import { withApiMiddleware } from '../../lib/middleware/api';

export const prerender = false;

// GET endpoint to fetch status data
export const GET: APIRoute = withApiMiddleware(async ({ url }) => {
  // Sanitize any query parameters
  const searchParams = new URL(url).searchParams;
  const sanitizedParams: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    sanitizedParams[key] = sanitizeString(value);
  }

  const statusData = await getStatusData();

  return new Response(JSON.stringify(statusData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
