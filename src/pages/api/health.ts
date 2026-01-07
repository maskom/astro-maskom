import type { APIRoute } from 'astro';

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
        kv: {
          status: 'unknown' as 'unknown' | 'healthy' | 'error',
          namespace: 'SESSION',
          error: null as string | null,
        },
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

  // Test Supabase connectivity only if environment variables are properly configured
  // Skip Supabase check in development mode
  if (import.meta.env.MODE === 'development') {
    checks.services.supabase.status = 'skipped';
    checks.services.supabase.error = 'Supabase not available in development';
  } else if (missingEnvVars.length === 0) {
    try {
      const { createServerClient } = await import('../../lib/supabase');
      const supabase = createServerClient();
      const supabaseStart = Date.now();

      // Try basic health check using auth
      const { error: authError } = await supabase.auth.getSession();
      const supabaseLatency = Date.now() - supabaseStart;

      if (authError) {
        checks.services.supabase.status = 'error';
        checks.services.supabase.error = `Auth check failed: ${authError.message}`;
      } else {
        checks.services.supabase.status = 'healthy';
        checks.services.supabase.latency = supabaseLatency;
      }
    } catch (error) {
      checks.services.supabase.status = 'error';
      checks.services.supabase.error =
        error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    checks.services.supabase.status = 'error';
    checks.services.supabase.error =
      'Supabase environment variables not configured';
  }

  // Detect Cloudflare environment
  try {
    // Check for Cloudflare Workers runtime
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.navigator &&
      globalThis.navigator.userAgent &&
      globalThis.navigator.userAgent.includes('Cloudflare-Workers')
    ) {
      checks.services.cloudflare.features.push('workers-runtime');
    }

    // Also check for Cloudflare Workers environment in other ways
    if (
      typeof globalThis !== 'undefined' &&
      (globalThis as any).WebSocketPair
    ) {
      checks.services.cloudflare.features.push('workers-runtime');
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

    // Test KV namespace availability
    try {
      // Check if SESSION KV binding is available (runtime check)
      if (typeof globalThis !== 'undefined' && globalThis.SESSION) {
        // Simple KV test - try to write and read a test value
        const testKey = 'health-check-test';
        const testValue = Date.now().toString();

        await globalThis.SESSION.put(testKey, testValue, {
          expirationTtl: 60,
        });
        const result = await (
          globalThis as {
            SESSION: { get: (key: string) => Promise<string | null> };
          }
        ).SESSION.get(testKey);

        if (result === testValue) {
          checks.services.cloudflare.kv.status = 'healthy';
          checks.services.cloudflare.features.push('kv-operational');
        } else {
          checks.services.cloudflare.kv.status = 'error';
          checks.services.cloudflare.kv.error = 'KV read/write test failed';
        }

        // Clean up test key
        await globalThis.SESSION.delete(testKey);
      } else {
        checks.services.cloudflare.kv.status = 'error';
        checks.services.cloudflare.kv.error =
          'SESSION KV binding not available';
      }
    } catch (kvError) {
      checks.services.cloudflare.kv.status = 'error';
      checks.services.cloudflare.kv.error =
        kvError instanceof Error ? kvError.message : 'KV test failed';
    }
  } catch {
    // Cloudflare detection failed, but don't mark as degraded
  }

  // Calculate total response time
  checks.responseTime = Date.now() - startTime;

  // Update overall status if environment check failed
  if (checks.env_check.status === 'error') {
    checks.status = 'degraded';
  }

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
