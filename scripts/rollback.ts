#!/usr/bin/env node

/**
 * Rollback Script
 *
 * This script helps rollback deployments to previous versions.
 */

import { execSync } from 'child_process';

interface DeploymentInfo {
  commit: string;
  timestamp: string;
  author: string;
  message: string;
}

async function getPreviousSuccessfulDeployments(
  limit: number = 5
): Promise<DeploymentInfo[]> {
  try {
    // Get recent commits to main branch
    const gitLog = execSync(
      'git log --oneline --pretty=format:"%H|%ai|%an|%s" -n 20 main',
      {
        encoding: 'utf8',
      }
    );

    const commits = gitLog
      .trim()
      .split('\n')
      .map(line => {
        const [commit, timestamp, author, ...messageParts] = line.split('|');
        return {
          commit: commit.substring(0, 7), // Short commit hash
          timestamp,
          author,
          message: messageParts.join('|'),
        };
      });

    return commits.slice(0, limit);
  } catch (error) {
    console.error('❌ Failed to get deployment history:', error);
    return [];
  }
}

async function rollbackToCommit(
  commitHash: string,
  environment: 'staging' | 'production'
): Promise<void> {
  console.log(
    `🔄 Starting rollback to commit ${commitHash} for ${environment} environment...`
  );

  try {
    // Checkout the target commit
    console.log('📥 Checking out target commit...');
    execSync(`git checkout ${commitHash}`, { stdio: 'inherit' });

    // Install dependencies (in case package.json changed)
    console.log('📦 Installing dependencies...');
    execSync('npm ci', { stdio: 'inherit' });

    // Build the application
    console.log('🔨 Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // Deploy to the specified environment
    const deployCommand =
      environment === 'production'
        ? 'npm run deploy:production'
        : 'npm run deploy:staging';

    console.log(`🚀 Deploying to ${environment}...`);
    execSync(deployCommand, { stdio: 'inherit' });

    // Return to main branch
    console.log('🔙 Returning to main branch...');
    execSync('git checkout main', { stdio: 'inherit' });

    console.log(`✅ Rollback to ${commitHash} completed successfully!`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);

    // Try to return to main branch even if rollback failed
    try {
      execSync('git checkout main', { stdio: 'inherit' });
    } catch (checkoutError) {
      console.error('❌ Failed to return to main branch:', checkoutError);
    }

    process.exit(1);
  }
}

async function listAvailableRollbacks(): Promise<void> {
  console.log('📋 Available rollback targets:\n');

  const deployments = await getPreviousSuccessfulDeployments();

  if (deployments.length === 0) {
    console.log('❌ No previous deployments found.');
    return;
  }

  deployments.forEach((deployment, index) => {
    console.log(`${index + 1}. ${deployment.commit} - ${deployment.timestamp}`);
    console.log(`   Author: ${deployment.author}`);
    console.log(`   Message: ${deployment.message}`);
    console.log('');
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      await listAvailableRollbacks();
      break;

    case 'rollback': {
      const commitHash = args[1];
      const environment = (args[2] as 'staging' | 'production') || 'production';

      if (!commitHash) {
        console.error('❌ Commit hash is required for rollback.');
        console.log('Usage: npm run rollback <commit-hash> [environment]');
        process.exit(1);
      }

      if (!['staging', 'production'].includes(environment)) {
        console.error('❌ Invalid environment. Use "staging" or "production".');
        process.exit(1);
      }

      await rollbackToCommit(commitHash, environment);
      break;
    }

    default:
      console.log('🔄 Rollback Script Usage:');
      console.log('');
      console.log('List available rollback targets:');
      console.log('  npm run rollback list');
      console.log('');
      console.log('Rollback to specific commit:');
      console.log('  npm run rollback <commit-hash> [environment]');
      console.log('');
      console.log('Examples:');
      console.log('  npm run rollback list');
      console.log('  npm run rollback abc1234 production');
      console.log('  npm run rollback def5678 staging');
      break;
  }
}

// Export for testing
export { getPreviousSuccessfulDeployments, rollbackToCommit };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
