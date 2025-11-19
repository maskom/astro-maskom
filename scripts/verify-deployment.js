#!/usr/bin/env node

/**
 * Deployment verification script
 * Checks that the deployment is healthy and all services are working
 */

import https from 'https';

// Support multiple deployment URLs for different environments
const DEPLOYMENT_URLS = {
  production: 'https://astro-maskom.pages.dev',
  preview: process.env.CF_PAGES_URL || 'https://astro-maskom.pages.dev',
  custom: process.env.DEPLOYMENT_URL || null,
};

const HEALTH_ENDPOINT = '/api/health';
const TIMEOUT = 15000; // Increased timeout for better reliability

function makeRequest(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptRequest = attempt => {
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
              attempt,
            });
          } catch {
            resolve({
              status: response.statusCode,
              data: data,
              attempt,
            });
          }
        });
      });

      request.on('error', err => {
        if (attempt < retries) {
          console.log(
            `⚠️ Request failed (attempt ${attempt + 1}/${retries}), retrying...`
          );
          setTimeout(() => attemptRequest(attempt + 1), 1000 * attempt);
        } else {
          reject(err);
        }
      });

      request.setTimeout(TIMEOUT, () => {
        request.destroy();
        if (attempt < retries) {
          console.log(
            `⚠️ Request timeout (attempt ${attempt + 1}/${retries}), retrying...`
          );
          setTimeout(() => attemptRequest(attempt + 1), 1000 * attempt);
        } else {
          reject(new Error(`Request timeout after ${TIMEOUT}ms`));
        }
      });
    };

    attemptRequest(0);
  });
}

async function checkDeployment() {
  console.log('🔍 Verifying deployment...');

  // Determine which URL to check
  const environment = process.env.NODE_ENV || 'production';
  let deploymentUrl = DEPLOYMENT_URLS.production;

  if (environment === 'preview' && DEPLOYMENT_URLS.preview) {
    deploymentUrl = DEPLOYMENT_URLS.preview;
  } else if (DEPLOYMENT_URLS.custom) {
    deploymentUrl = DEPLOYMENT_URLS.custom;
  }

  console.log(`🌍 Environment: ${environment}`);
  console.log(`🎯 Target URL: ${deploymentUrl}`);

  try {
    const healthUrl = `${deploymentUrl}${HEALTH_ENDPOINT}`;
    console.log(`📊 Checking health endpoint: ${healthUrl}`);

    const response = await makeRequest(healthUrl);

    if (response.status !== 200 && response.status !== 503) {
      console.log(`❌ Health check failed with status: ${response.status}`);
      if (response.attempt > 0) {
        console.log(`🔄 Completed after ${response.attempt + 1} attempts`);
      }
      process.exit(1);
    }

    const health = response.data;
    console.log(`✅ Overall status: ${health.status}`);
    console.log(`📈 Response time: ${health.responseTime}ms`);
    console.log(`🌍 Environment: ${health.environment}`);
    console.log(`📦 Version: ${health.version}`);

    if (response.attempt > 0) {
      console.log(`🔄 Completed after ${response.attempt + 1} attempts`);
    }

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

    // Additional checks for deployment quality
    const issues = [];

    // Check response time
    if (health.responseTime > 5000) {
      issues.push('Slow response time (>5s)');
    }

    // Check environment variables
    if (health.env_check?.missing_vars?.length > 0) {
      issues.push(
        `Missing environment variables: ${health.env_check.missing_vars.join(', ')}`
      );
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

    if (isHealthy && issues.length === 0) {
      console.log('\n🎉 Deployment verification successful!');
      if (health.status === 'degraded') {
        console.log(
          '📝 Note: Supabase environment variables need to be configured in production'
        );
      }
      process.exit(0);
    } else if (isHealthy && issues.length > 0) {
      console.log('\n⚠️ Deployment is healthy but has performance issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('🎉 Deployment verification successful (with warnings)');
      process.exit(0);
    } else {
      console.log('\n❌ Deployment verification failed:');
      if (health.status !== 'healthy') {
        console.log(`   - Overall status: ${health.status}`);
      }
      issues.forEach(issue => console.log(`   - ${issue}`));
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
