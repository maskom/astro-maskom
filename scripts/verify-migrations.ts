#!/usr/bin/env node

/**
 * Migration verification script for astro-maskom
 * Validates Supabase migration files for syntax and consistency
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

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

function validateMigrationFile(filePath: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const content = readFileSync(filePath, 'utf8');

    // Basic SQL syntax checks
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Skip comments and empty lines
      if (line.startsWith('--') || line === '') continue;

      // Check for basic SQL syntax issues
      if (line.includes('CREATE TABLE') && !line.includes(';')) {
        // Look for the closing semicolon in subsequent lines
        let foundSemicolon = false;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().endsWith(';')) {
            foundSemicolon = true;
            break;
          }
        }
        if (!foundSemicolon) {
          errors.push(
            `Line ${lineNum}: CREATE TABLE statement missing semicolon`
          );
        }
      }

      // Check for common SQL issues (only for single-line DELETE statements)
      if (
        line.includes('DELETE FROM') &&
        !line.includes('WHERE') &&
        !line.includes('--')
      ) {
        // Look for WHERE clause in the next few lines
        let hasWhere = false;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('WHERE')) {
            hasWhere = true;
            break;
          }
          // Stop looking if we hit a semicolon, comment, or another SQL statement
          if (
            nextLine.endsWith(';') ||
            nextLine.startsWith('--') ||
            nextLine.includes('DELETE') ||
            nextLine.includes('CREATE') ||
            nextLine.includes('ALTER') ||
            nextLine.includes('DROP')
          ) {
            break;
          }
        }
        if (!hasWhere) {
          errors.push(
            `Line ${lineNum}: DELETE FROM without WHERE clause (dangerous)`
          );
        }
      }

      // Check for DROP TABLE without IF EXISTS
      if (line.includes('DROP TABLE') && !line.includes('IF EXISTS')) {
        errors.push(`Line ${lineNum}: DROP TABLE should use IF EXISTS clause`);
      }
    }

    // Check for required migration elements
    if (
      !content.includes('CREATE') &&
      !content.includes('ALTER') &&
      !content.includes('DROP')
    ) {
      errors.push(
        'Migration does not contain any CREATE, ALTER, or DROP statements'
      );
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return { valid: false, errors };
  }
}

function main() {
  log('🔍 Verifying Supabase migrations...', 'blue');

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      log('❌ No migration files found', 'red');
      process.exit(1);
    }

    log(`\n📁 Found ${migrationFiles.length} migration files:`, 'blue');
    migrationFiles.forEach(file => log(`   - ${file}`, 'green'));

    let allValid = true;
    let totalErrors = 0;

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      log(`\n🔍 Validating ${file}...`, 'blue');

      const result = validateMigrationFile(filePath);

      if (result.valid) {
        log(`✅ ${file} is valid`, 'green');
      } else {
        log(`❌ ${file} has ${result.errors.length} error(s):`, 'red');
        result.errors.forEach(error => log(`   - ${error}`, 'red'));
        allValid = false;
        totalErrors += result.errors.length;
      }
    }

    log('\n📊 Migration Summary:', 'blue');
    log(
      `✅ Valid migrations: ${migrationFiles.length - (totalErrors > 0 ? 1 : 0)}`,
      'green'
    );
    log(
      `❌ Invalid migrations: ${totalErrors > 0 ? 1 : 0}`,
      totalErrors > 0 ? 'red' : 'green'
    );
    log(`📝 Total errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');

    if (allValid) {
      log('\n🎉 All migrations are valid!', 'green');
      process.exit(0);
    } else {
      log(
        '\n⚠️  Some migrations have issues. Please fix them before deploying.',
        'yellow'
      );
      process.exit(1);
    }
  } catch (error) {
    log(
      `\n💥 Migration verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'red'
    );
    process.exit(1);
  }
}

main();
