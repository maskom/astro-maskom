#!/usr/bin/env node

/**
 * Development Environment Verification Script
 *
 * This script verifies that the TypeScript configuration and dependencies
 * are properly set up for development. It addresses the critical issue
 * where missing dependencies were blocking development workflows.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying TypeScript development environment...\n');

const checks = [
  {
    name: 'TypeScript Configuration',
    check: () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      if (!fs.existsSync(tsconfigPath)) {
        throw new Error('tsconfig.json not found');
      }

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      if (
        !tsconfig.extends ||
        !tsconfig.extends.includes('astro/tsconfigs/base.json')
      ) {
        throw new Error(
          'tsconfig.json does not extend Astro base configuration'
        );
      }

      return '✅ TypeScript configuration is valid';
    },
  },
  {
    name: 'Astro TypeScript Configs',
    check: () => {
      const astroConfigPath = path.join(
        process.cwd(),
        'node_modules/astro/tsconfigs/base.json'
      );
      if (!fs.existsSync(astroConfigPath)) {
        throw new Error('Astro TypeScript configs not found - run npm install');
      }
      return '✅ Astro TypeScript configs are available';
    },
  },
  {
    name: 'Node Types',
    check: () => {
      const nodeTypesPath = path.join(
        process.cwd(),
        'node_modules/@types/node'
      );
      if (!fs.existsSync(nodeTypesPath)) {
        throw new Error('@types/node not found - run npm install');
      }
      return '✅ Node.js type definitions are available';
    },
  },
  {
    name: 'TypeScript Compilation',
    check: () => {
      try {
        execSync('npm run typecheck', { stdio: 'pipe' });
        return '✅ TypeScript compilation succeeds';
      } catch {
        throw new Error('TypeScript compilation failed - run npm install');
      }
    },
  },
  {
    name: 'Build Process',
    check: () => {
      try {
        execSync('npm run build', { stdio: 'pipe' });
        return '✅ Build process completes successfully';
      } catch {
        throw new Error('Build process failed');
      }
    },
  },
];

let allPassed = true;

checks.forEach(({ name, check }) => {
  try {
    const result = check();
    console.log(`${result}`);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Development environment is ready.');
  console.log('\n📝 Quick start commands:');
  console.log('  npm run dev       - Start development server');
  console.log('  npm run typecheck - Run TypeScript checks');
  console.log('  npm run build     - Build for production');
  console.log('  npm run test:run  - Run test suite');
} else {
  console.log('⚠️  Some checks failed. Please run the following:');
  console.log('  npm install       - Install dependencies');
  console.log('  npm run typecheck - Verify TypeScript compilation');
  console.log('\nIf issues persist, check the error messages above.');
  process.exit(1);
}
