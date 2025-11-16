#!/usr/bin/env node

/**
 * Deployment verification script for astro-maskom
 * Checks build, environment, and deployment readiness
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

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

    if (
      wranglerConfig.includes('SUPABASE_URL') &&
      wranglerConfig.includes('SUPABASE_KEY')
    ) {
      log('✅ Supabase configuration found in wrangler.toml', 'green');
      return true;
    } else {
      log('❌ Supabase configuration missing in wrangler.toml', 'red');
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

function main() {
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
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const result = check.fn();
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

main();
