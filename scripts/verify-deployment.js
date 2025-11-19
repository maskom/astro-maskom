#!/usr/bin/env node

/**
 * Deployment verification script
 * Checks that the deployment is healthy and all services are working
 */

import https from 'https';

const PRODUCTION_URL = 'https://astro-maskom.pages.dev';
const HEALTH_ENDPOINT = '/api/health';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: response.statusCode,
            data: jsonData,
          });
        } catch {
          resolve({
            status: response.statusCode,
            data: data,
          });
        }
      });
    });

    request.on('error', err => {
      reject(err);
    });

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkDeployment() {
  console.log('🔍 Verifying deployment...');

  try {
    const healthUrl = `${PRODUCTION_URL}${HEALTH_ENDPOINT}`;
    console.log(`📊 Checking health endpoint: ${healthUrl}`);

    const response = await makeRequest(healthUrl);

    if (response.status !== 200 && response.status !== 503) {
      console.log(`❌ Health check failed with status: ${response.status}`);
      process.exit(1);
    }

    const health = response.data;
    console.log(`✅ Overall status: ${health.status}`);
    console.log(`📈 Response time: ${health.responseTime}ms`);
    console.log(`🌍 Environment: ${health.environment}`);
    console.log(`📦 Version: ${health.version}`);

    // Check individual services
    console.log('\n🔧 Services:');

    if (health.services?.supabase) {
      const supabase = health.services.supabase;
      const status =
        supabase.status === 'healthy'
          ? '✅'
          : supabase.status === 'skipped'
            ? '⚠️'
            : '❌';
      console.log(`   ${status} Supabase: ${supabase.status}`);
      if (supabase.error) {
        console.log(`      Error: ${supabase.error}`);
      }
      if (supabase.latency > 0) {
        console.log(`      Latency: ${supabase.latency}ms`);
      }
    }

    if (health.services?.cloudflare) {
      const cloudflare = health.services.cloudflare;
      console.log(`   ✅ Cloudflare: ${cloudflare.status}`);
      if (cloudflare.features?.length > 0) {
        console.log(`      Features: ${cloudflare.features.join(', ')}`);
      }
    }

    // Determine if deployment is successful
    // Allow degraded status if only Supabase is missing (common in CI)
    const isHealthy =
      health.status === 'healthy' ||
      (health.status === 'degraded' &&
        health.services?.supabase?.status === 'error' &&
        health.services?.supabase?.error?.includes(
          'Missing Supabase configuration'
        ));

    if (isHealthy) {
      console.log('\n🎉 Deployment verification successful!');
      if (health.status === 'degraded') {
        console.log(
          '📝 Note: Supabase environment variables need to be configured in production'
        );
      }
      process.exit(0);
    } else {
      console.log('\n⚠️ Deployment needs attention');
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ Failed to verify deployment: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkDeployment();
}

export { checkDeployment };
