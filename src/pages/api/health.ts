import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // Check required environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(
    envVar => !import.meta.env[envVar]
  );

  // Initialize health checks
  const checks = {
    status: 'healthy' as 'healthy' | 'degraded',
    timestamp,
    uptime: process.uptime(),
    environment: import.meta.env.MODE,
    version: process.env.npm_package_version || '0.0.1',
    responseTime: 0,
    env_check: {
      status: missingEnvVars.length === 0 ? 'healthy' : 'error',
      required_vars: requiredEnvVars,
      missing_vars: missingEnvVars,
    },
    services: {
      supabase: {
        status: 'unknown' as 'unknown' | 'healthy' | 'error' | 'skipped',
        latency: 0,
        error: null as string | null,
      },
      cloudflare: {
        status: 'active' as string,
        features: ['pages', 'kv', 'functions'] as string[],
        region: 'unknown',
        edge_location: 'unknown',
      },
      deployment: {
        commit_sha:
          process.env.VERCEL_GIT_COMMIT_SHA ||
          process.env.GITHUB_SHA ||
          'unknown',
        deployment_url:
          process.env.CF_PAGES_URL || process.env.VERCEL_URL || 'unknown',
        environment:
          process.env.CF_PAGES_BRANCH ||
          process.env.VERCEL_ENV ||
          import.meta.env.MODE,
      },
    },
  };

  try {
    // Only test Supabase if environment variables are available
    if (checks.env_check.status === 'healthy') {
      // Test Supabase connectivity using basic auth check
      const supabase = createServerClient();
      const supabaseStart = Date.now();

      // Try to access auth.users which should exist in all Supabase projects
      const { error } = await supabase
        .from('auth.users')
        .select('count')
        .limit(1);

      const supabaseLatency = Date.now() - supabaseStart;

      if (error) {
        // In development, Supabase might not be running - don't mark as degraded
        if (import.meta.env.MODE === 'development') {
          checks.services.supabase.status = 'skipped';
          checks.services.supabase.error =
            'Supabase not available in development';
        } else {
          checks.services.supabase.status = 'error';
          checks.services.supabase.error = error.message;
          checks.status = 'degraded';
        }
      } else {
        checks.services.supabase.status = 'healthy';
        checks.services.supabase.latency = supabaseLatency;
      }
    } else {
      checks.services.supabase.status = 'skipped';
      checks.services.supabase.error = 'Environment variables not configured';
    }

    // Update overall status if environment check failed
    if (checks.env_check.status === 'error') {
      checks.status = 'degraded';
    }
  } catch (error) {
    // In development, Supabase might not be running - don't mark as degraded
    if (import.meta.env.MODE === 'development') {
      checks.services.supabase.status = 'skipped';
      checks.services.supabase.error = 'Supabase not available in development';
    } else {
      checks.services.supabase.status = 'error';
      checks.services.supabase.error =
        error instanceof Error ? error.message : 'Unknown error';
      checks.status = 'degraded';
    }
  }

  // Detect Cloudflare environment
  try {
    // Check if we're running on Cloudflare Pages
    if (
      typeof globalThis.navigator !== 'undefined' &&
      (globalThis as { navigator?: { userAgent?: string } }).navigator
        ?.userAgent
    ) {
      const userAgent = (globalThis as { navigator: { userAgent: string } })
        .navigator.userAgent;
      if (userAgent.includes('Cloudflare-Workers')) {
        checks.services.cloudflare.status = 'active';
        checks.services.cloudflare.features.push('workers-runtime');
      }
    }

    // Try to access Cloudflare-specific environment variables
    const cfEnv = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      pages: {
        url: process.env.CF_PAGES_URL,
        branch: process.env.CF_PAGES_BRANCH,
        commitSha: process.env.CF_PAGES_COMMIT_SHA,
      },
    };

    // Add Cloudflare-specific info if available
    if (cfEnv.accountId) {
      checks.services.cloudflare.features.push('account-configured');
    }
    if (cfEnv.pages.url) {
      checks.services.cloudflare.features.push('pages-deployed');
    }
  } catch (error) {
    // Cloudflare detection failed, but don't mark as degraded
    console.warn('Cloudflare environment detection failed:', error);
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
    'Access-Control-Allow-Methods': 'GET, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Health-Check': 'astro-maskom',
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
