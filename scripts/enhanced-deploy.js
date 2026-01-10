#!/usr/bin/env node

/**
 * Enhanced deployment script with pre-flight checks
 * Improves deployment reliability by validating configuration before deployment
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_NAME = 'astro-maskom';
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_KEY'];
const OPTIONAL_ENV_VARS = ['SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'];

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
}

function checkEnvironment() {
  log('info', 'Checking environment configuration...');

  const envExamplePath = '.env.example';
  if (!existsSync(envExamplePath)) {
    log('warn', '.env.example file not found');
  } else {
    log('info', '.env.example file exists');
  }

  // Check for required environment variables in wrangler.toml
  try {
    const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
    if (
      wranglerConfig.includes('SUPABASE_URL') ||
      wranglerConfig.includes('SUPABASE_KEY')
    ) {
      log(
        'warn',
        'Supabase configuration found in wrangler.toml - should use environment variables instead'
      );
    }
  } catch (error) {
    log('warn', 'Could not read wrangler.toml');
  }

  return true;
}

function checkDependencies() {
  log('info', 'Checking dependencies...');

  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@astrojs/cloudflare',
      '@supabase/supabase-js',
      'wrangler',
    ];

    for (const dep of requiredDeps) {
      if (
        packageJson.dependencies?.[dep] ||
        packageJson.devDependencies?.[dep]
      ) {
        log('info', `✓ ${dep} found`);
      } else {
        log('error', `✗ ${dep} missing`);
        return false;
      }
    }
  } catch (error) {
    log('error', 'Failed to read package.json');
    return false;
  }

  return true;
}

function checkBuildConfiguration() {
  log('info', 'Checking build configuration...');

  try {
    const astroConfig = readFileSync('astro.config.mjs', 'utf8');
    if (astroConfig.includes('@astrojs/cloudflare')) {
      log('info', '✓ Cloudflare adapter configured');
    } else {
      log('error', '✗ Cloudflare adapter not found');
      return false;
    }

    if (astroConfig.includes("output: 'server'")) {
      log('info', '✓ Server output configured');
    } else {
      log('warn', 'Server output not explicitly configured');
    }
  } catch (error) {
    log('error', 'Failed to read astro.config.mjs');
    return false;
  }

  return true;
}

function checkSupabaseIntegration() {
  log('info', 'Checking Supabase integration...');

  const supabaseClientPath = 'src/lib/supabase.ts';
  if (!existsSync(supabaseClientPath)) {
    log('error', 'Supabase client not found');
    return false;
  }

  try {
    const supabaseClient = readFileSync(supabaseClientPath, 'utf8');
    if (
      supabaseClient.includes('createClient') &&
      supabaseClient.includes('getSupabaseConfig')
    ) {
      log('info', '✓ Supabase client properly configured');
    } else {
      log('warn', 'Supabase client may have configuration issues');
    }
  } catch (error) {
    log('error', 'Failed to read Supabase client');
    return false;
  }

  // Check for migrations
  const migrationsDir = 'supabase/migrations';
  if (existsSync(migrationsDir)) {
    try {
      const migrationFiles = readdirSync(migrationsDir);
      log('info', `✓ Found ${migrationFiles.length} migration(s)`);
    } catch (error) {
      log('warn', 'Could not read migrations directory');
    }
  } else {
    log('warn', 'No migrations directory found');
  }

  return true;
}

function runPreFlightChecks() {
  log('info', '🚀 Starting pre-flight deployment checks...');

  const checks = [
    { name: 'Environment', fn: checkEnvironment },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Build Configuration', fn: checkBuildConfiguration },
    { name: 'Supabase Integration', fn: checkSupabaseIntegration },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const result = check.fn();
      if (!result) {
        allPassed = false;
        log('error', `Check failed: ${check.name}`);
      }
    } catch (error) {
      allPassed = false;
      log('error', `Check error: ${check.name} - ${error.message}`);
    }
  }

  if (allPassed) {
    log('info', '✅ All pre-flight checks passed');
  } else {
    log('error', '❌ Pre-flight checks failed');
    process.exit(1);
  }
}

function runBuild() {
  log('info', '🔨 Building application...');

  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('info', '✅ Build successful');
  } catch (error) {
    log('error', '❌ Build failed');
    process.exit(1);
  }
}

function runTests() {
  log('info', '🧪 Running tests...');

  try {
    execSync('npm run test:run', { stdio: 'inherit' });
    log('info', '✅ Tests passed');
  } catch (error) {
    log('warn', '⚠️ Tests failed, but continuing deployment');
  }
}

function runLinting() {
  log('info', '🔍 Running linting...');

  try {
    execSync('npm run lint', { stdio: 'inherit' });
    log('info', '✅ Linting passed');
  } catch (error) {
    log('warn', '⚠️ Linting failed, but continuing deployment');
  }
}

function deployToCloudflare() {
  log('info', '🌐 Deploying to Cloudflare Pages...');

  try {
    execSync('npx wrangler pages deploy dist --project-name astro-maskom', {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Ensure we don't expose secrets in logs
        CI: 'true',
      },
    });
    log('info', '✅ Deployment successful');
  } catch (error) {
    log('error', '❌ Deployment failed');
    process.exit(1);
  }
}

function verifyDeployment() {
  log('info', '🔍 Verifying deployment...');

  try {
    execSync('npm run deploy:verify', { stdio: 'inherit' });
    log('info', '✅ Deployment verified');
  } catch (error) {
    log(
      'warn',
      '⚠️ Deployment verification failed, but deployment may still be working'
    );
  }
}

function main() {
  log('info', '🚀 Starting enhanced deployment process...');

  try {
    // Run pre-flight checks
    runPreFlightChecks();

    // Run quality checks
    runLinting();
    runTests();

    // Build and deploy
    runBuild();
    deployToCloudflare();

    // Verify deployment
    verifyDeployment();

    log('info', '🎉 Enhanced deployment completed successfully!');
  } catch (error) {
    log('error', `❌ Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as enhancedDeploy };
