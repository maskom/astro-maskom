import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const GET: APIRoute = async ({}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // Initialize health checks
  const checks = {
    status: 'healthy' as 'healthy' | 'degraded',
    timestamp,
    uptime: process.uptime(),
    environment: import.meta.env.MODE,
    version: process.env.npm_package_version || '0.0.1',
    responseTime: 0,
    services: {
      supabase: {
        status: 'unknown' as 'unknown' | 'healthy' | 'error',
        latency: 0,
        error: null as string | null,
      },
      cloudflare: {
        status: 'active' as string,
        features: ['pages', 'kv', 'functions'] as string[],
      },
    },
  };

  try {
    // Test Supabase connectivity
    const supabase = createServerClient();
    const supabaseStart = Date.now();

    const { error } = await supabase
      .from('security_audit_logs')
      .select('count')
      .limit(1);

    const supabaseLatency = Date.now() - supabaseStart;

    if (error) {
      checks.services.supabase.status = 'error';
      checks.services.supabase.error = error.message;
      checks.status = 'degraded';
    } else {
      checks.services.supabase.status = 'healthy';
      checks.services.supabase.latency = supabaseLatency;
    }
  } catch (error) {
    checks.services.supabase.status = 'error';
    checks.services.supabase.error =
      error instanceof Error ? error.message : 'Unknown error';
    checks.status = 'degraded';
  }

  // Calculate total response time
  checks.responseTime = Date.now() - startTime;

  // Determine HTTP status based on overall health
  const httpStatus = checks.status === 'healthy' ? 200 : 503;

  // Add CORS headers for monitoring tools
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  return new Response(JSON.stringify(checks, null, 2), {
    status: httpStatus,
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
