import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const timestamp = new Date().toISOString();

  // Basic health checks
  const checks = {
    status: 'healthy',
    timestamp,
    uptime: process.uptime(),
    environment: import.meta.env.MODE,
    version: process.env.npm_package_version || '0.0.1',
    services: {
      supabase: 'configured',
      cloudflare: 'active',
    },
  };

  // Add CORS headers for monitoring tools
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  return new Response(JSON.stringify(checks, null, 2), {
    status: 200,
    headers,
  });
};

export const HEAD: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
