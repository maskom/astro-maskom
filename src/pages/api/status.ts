import type { APIRoute } from "astro";
import { getStatusData } from "../../lib/status";
import { sanitizeString } from "../../lib/sanitization";
import { logger } from "../../lib/logger";

export const prerender = false;

// GET endpoint to fetch status data
export const GET: APIRoute = async ({ url }) => {
  try {
    // Sanitize any query parameters
    const searchParams = new URL(url).searchParams;
    const sanitizedParams: Record<string, string> = {};
    
    for (const [key, value] of searchParams.entries()) {
      sanitizedParams[key] = sanitizeString(value);
    }
    
    const statusData = await getStatusData(sanitizedParams);
    
    return new Response(JSON.stringify(statusData), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    logger.apiError('Status API error', error, {
      action: 'getStatusData',
      endpoint: '/api/status'
    });
    const sanitizedError = sanitizeString(error instanceof Error ? error.message : 'Internal server error');
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};