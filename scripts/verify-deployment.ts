#!/usr/bin/env node

/**
 * Deployment verification script for astro-maskom
 * Checks build, environment, and deployment readiness
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command: string, description: string): boolean {
  log(`\n🔧 ${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed successfully`, 'green');
    return true;
  } catch {
    log(`❌ ${description} failed`, 'red');
    return false;
  }
}

function checkEnvironment() {
  log('\n🌍 Checking environment...', 'blue');

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN',
  ];

  let allPresent = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} is set`, 'green');
    } else {
      log(`⚠️  ${envVar} is not set (may be needed for deployment)`, 'yellow');
      allPresent = false;
    }
  }

  return allPresent;
}

function checkPackageJson() {
  log('\n📦 Checking package.json...', 'blue');

  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    const requiredScripts = [
      'build',
      'deploy:cloudflare',
      'test',
      'lint',
      'typecheck',
    ];

    let allPresent = true;

    for (const script of requiredScripts) {
      if (packageJson.scripts[script]) {
        log(`✅ Script "${script}" found`, 'green');
      } else {
        log(`❌ Script "${script}" missing`, 'red');
        allPresent = false;
      }
    }

    return allPresent;
  } catch {
    log('❌ Failed to read package.json', 'red');
    return false;
  }
}

function checkWranglerConfig() {
  log('\n☁️  Checking wrangler.toml...', 'blue');

  try {
    const wranglerConfig = readFileSync('wrangler.toml', 'utf8');

    // Check for essential Cloudflare Pages configuration
    const hasPagesConfig = wranglerConfig.includes('pages_build_output_dir');
    const hasKvNamespace = wranglerConfig.includes('kv_namespaces');
    const hasSupabaseComment = wranglerConfig.includes(
      'Supabase configuration should be set via Cloudflare Pages environment variables'
    );

    if (hasPagesConfig && hasKvNamespace) {
      log('✅ Cloudflare Pages configuration found in wrangler.toml', 'green');
      if (hasSupabaseComment) {
        log(
          '✅ Supabase configuration properly documented for environment variables',
          'green'
        );
      }
      return true;
    } else {
      log(
        '❌ Essential Cloudflare Pages configuration missing in wrangler.toml',
        'red'
      );
      return false;
    }
  } catch {
    log('❌ Failed to read wrangler.toml', 'red');
    return false;
  }
}

function checkSupabaseMigrations() {
  log('\n🗄️  Checking Supabase migrations...', 'blue');

  try {
    execSync('ls supabase/migrations/*.sql > /dev/null 2>&1', {
      stdio: 'pipe',
    });
    const migrations = execSync('ls supabase/migrations/*.sql', {
      encoding: 'utf8',
    });
    const migrationFiles = migrations.trim().split('\n');

    log(`✅ Found ${migrationFiles.length} migration files:`, 'green');
    migrationFiles.forEach(file => log(`   - ${file}`, 'green'));

    return true;
  } catch {
    log('❌ No migration files found in supabase/migrations/', 'red');
    return false;
  }
}

async function checkDeployedHealth() {
  log('\n🏥 Checking deployed application health...', 'blue');

  // Get the latest production deployment URL from wrangler
  try {
    const deploymentsOutput = execSync(
      'npx wrangler pages deployment list --project-name astro-maskom',
      {
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    // Parse the table output to find the latest production deployment
    const lines = deploymentsOutput.trim().split('\n');

    // Skip header lines and find production deployments
    const productionLines = lines.filter(
      line => line.includes('Production') && line.startsWith('https://')
    );

    if (productionLines.length === 0) {
      log('⚠️  No production deployment found', 'yellow');
      return true; // Don't fail verification if no deployment exists yet
    }

    // Get the most recent production deployment (first in list)
    const latestProduction = productionLines[0];

    // Extract URL from the line - it should start with https://
    const urlMatch = latestProduction.match(/(https:\/\/[^\s]+)/);
    if (!urlMatch) {
      log('⚠️  Could not parse deployment URL from production line', 'yellow');
      return true;
    }

    const deploymentUrl = urlMatch[1];
    const healthUrl = `${deploymentUrl}/api/health`;
    log(`🔍 Testing health endpoint: ${healthUrl}`, 'blue');

    // Try to fetch health check with retries
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'deployment-verification-script/1.0',
          },
        });

        if (response.ok) {
          const healthData = await response.json();

          log(`✅ Health check passed (${response.status})`, 'green');
          log(`   Status: ${healthData.status}`, 'green');
          log(`   Response time: ${healthData.responseTime}ms`, 'green');
          log(`   Supabase: ${healthData.services.supabase.status}`, 'green');

          if (healthData.services.supabase.latency > 0) {
            log(
              `   Supabase latency: ${healthData.services.supabase.latency}ms`,
              'green'
            );
          }

          return true;
        } else {
          log(
            `⚠️  Health check failed with status ${response.status} (attempt ${attempts}/${maxAttempts})`,
            'yellow'
          );
          if (attempts < maxAttempts) {
            await setTimeout(2000); // Wait 2 seconds before retry
          }
        }
      } catch (error) {
        log(
          `⚠️  Health check request failed (attempt ${attempts}/${maxAttempts}): ${error instanceof Error ? error.message : 'Unknown error'}`,
          'yellow'
        );
        if (attempts < maxAttempts) {
          await setTimeout(2000); // Wait 2 seconds before retry
        }
      }
    }

    log('❌ Health check failed after all attempts', 'red');
    return false;
  } catch (error) {
    log(
      `⚠️  Could not check deployed health: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'yellow'
    );
    return true; // Don't fail verification if we can't check health
  }
}

async function main() {
  log('🚀 Starting deployment verification for astro-maskom', 'blue');

  const checks = [
    { name: 'Environment variables', fn: checkEnvironment },
    { name: 'Package.json scripts', fn: checkPackageJson },
    { name: 'Wrangler configuration', fn: checkWranglerConfig },
    { name: 'Supabase migrations', fn: checkSupabaseMigrations },
    {
      name: 'TypeScript compilation',
      fn: () => runCommand('npm run typecheck', 'TypeScript type checking'),
    },
    { name: 'Linting', fn: () => runCommand('npm run lint', 'ESLint linting') },
    {
      name: 'Tests',
      fn: () => runCommand('npm run test:run', 'Running tests'),
    },
    {
      name: 'Build',
      fn: () => runCommand('npm run build', 'Building application'),
    },
    { name: 'Deployed health check', fn: checkDeployedHealth },
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const result = await check.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  log('\n📊 Verification Summary:', 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n🎉 All checks passed! Ready for deployment.', 'green');
    process.exit(0);
  } else {
    log(
      '\n⚠️  Some checks failed. Please fix issues before deploying.',
      'yellow'
    );
    process.exit(1);
  }
}

main().catch(error => {
  log(
    `\n💥 Verification script failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    'red'
  );
  process.exit(1);
});
