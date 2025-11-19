import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const timestamp = new Date().toISOString();

    const health = {
      status: 'healthy',
      timestamp,
      environment: import.meta.env.MODE || 'unknown',
      version: '0.0.1',
      uptime:
        typeof process !== 'undefined' && process.uptime
          ? Math.floor(process.uptime())
          : 0,
      services: {
        supabase: 'skipped',
        cloudflare: 'active',
      },
    };

    return new Response(JSON.stringify(health, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
