#!/usr/bin/env node

/**
 * Deployment Health Check Script
 *
 * This script performs health checks on deployed environments
 * to verify they are functioning correctly after deployment.
 */

import { createClient } from '@supabase/supabase-js';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  url: string;
  checks: {
    http: boolean;
    database: boolean;
    criticalPaths: boolean;
  };
  timestamp: string;
  errors?: string[];
}

async function checkHttpHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok && response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error(`HTTP health check failed for ${url}:`, error);
    return false;
  }
}

async function checkDatabaseHealth(
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple health check - try to connect and run a simple query
    const { error } = await supabase.from('_health_check').select('*').limit(1);

    // If table doesn't exist, that's actually okay for a basic connectivity check
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkCriticalPaths(baseUrl: string): Promise<boolean> {
  const criticalPaths = ['/', '/status', '/api/status'];

  const results = await Promise.allSettled(
    criticalPaths.map(async path => {
      const url = `${baseUrl}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    })
  );

  const successCount = results.filter(
    result => result.status === 'fulfilled' && result.value === true
  ).length;

  // At least 80% of critical paths should be healthy
  return successCount / criticalPaths.length >= 0.8;
}

async function performHealthCheck(
  environment: 'staging' | 'production'
): Promise<HealthCheckResult> {
  const config = {
    production: {
      url: process.env.PRODUCTION_URL || 'https://maskom.co.id',
      supabaseUrl: process.env.PRODUCTION_SUPABASE_URL,
      supabaseKey: process.env.PRODUCTION_SUPABASE_ANON_KEY,
    },
    staging: {
      url: process.env.STAGING_URL || 'https://astro-maskom-staging.pages.dev',
      supabaseUrl: process.env.STAGING_SUPABASE_URL,
      supabaseKey: process.env.STAGING_SUPABASE_ANON_KEY,
    },
  };

  const envConfig = config[environment];
  const errors: string[] = [];

  console.log(`🔍 Performing health check for ${environment} environment...`);
  console.log(`📍 URL: ${envConfig.url}`);

  // HTTP Health Check
  console.log('🌐 Checking HTTP connectivity...');
  const httpHealthy = await checkHttpHealth(envConfig.url);
  if (!httpHealthy) {
    errors.push('HTTP health check failed');
  }

  // Database Health Check (if configured)
  let databaseHealthy = true;
  if (envConfig.supabaseUrl && envConfig.supabaseKey) {
    console.log('🗄️ Checking database connectivity...');
    databaseHealthy = await checkDatabaseHealth(
      envConfig.supabaseUrl,
      envConfig.supabaseKey
    );
    if (!databaseHealthy) {
      errors.push('Database health check failed');
    }
  } else {
    console.log('⚠️ Skipping database check - not configured');
  }

  // Critical Paths Check
  console.log('🛤️ Checking critical paths...');
  const criticalPathsHealthy = await checkCriticalPaths(envConfig.url);
  if (!criticalPathsHealthy) {
    errors.push('Critical paths health check failed');
  }

  const result: HealthCheckResult = {
    status:
      httpHealthy && databaseHealthy && criticalPathsHealthy
        ? 'healthy'
        : 'unhealthy',
    url: envConfig.url,
    checks: {
      http: httpHealthy,
      database: databaseHealthy,
      criticalPaths: criticalPathsHealthy,
    },
    timestamp: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  };

  // Log results
  console.log('\n📊 Health Check Results:');
  console.log(
    `Status: ${result.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`
  );
  console.log(`HTTP: ${result.checks.http ? '✅' : '❌'}`);
  console.log(`Database: ${result.checks.database ? '✅' : '❌'}`);
  console.log(`Critical Paths: ${result.checks.criticalPaths ? '✅' : '❌'}`);

  if (result.errors) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  return result;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = (args[0] as 'staging' | 'production') || 'production';

  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use "staging" or "production".');
    process.exit(1);
  }

  try {
    const result = await performHealthCheck(environment);

    if (result.status === 'unhealthy') {
      console.log('\n💥 Health check failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 Health check passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    process.exit(1);
  }
}

// Export for testing
export {
  performHealthCheck,
  checkHttpHealth,
  checkDatabaseHealth,
  checkCriticalPaths,
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
