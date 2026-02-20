#!/usr/bin/env node
/**
 * D1 Database Management Script - Enhanced
 * Easily sync schema and data between local and remote D1 databases
 * 
 * Folder Structure:
 *   src/db/migrations/    - Schema files (0001_initial_schema.sql, etc.)
 *   src/db/seeds/         - Seed data files (001_seed_fresh.sql, etc.)
 * 
 * Usage:
 *   node scripts/d1.cjs [command] [options]
 * 
 * Commands:
 *   schema:push           - Push schema to database
 *   schema:pull           - Pull schema from database (backup)
 *   schema:update-initial - Update 0001_initial_schema.sql from current LOCAL database
 *   seed:push             - Push seed data to database
 *   data:pull             - Export data from database to SQL file
 *   
 *   drop:local            - Drop all tables from LOCAL database
 *   drop:remote           - Drop all tables from REMOTE database
 *   
 *   push:local-to-remote  - Complete sync: LOCAL -> REMOTE (schema + data)
 *   push:remote-to-local  - Complete sync: REMOTE -> LOCAL (schema + data)
 *   
 *   reset                 - Reset database (drop all tables + recreate schema)
 *   sync                  - Full sync: reset + schema + seed data
 *   deploy                - Deploy worker to Cloudflare
 * 
 * Options:
 *   --remote              - Target remote database (default: local)
 *   --force               - Skip confirmation prompts
 * 
 * THIS IS WORKING --- node scripts/d1.cjs push:local-to-remote --force | but this will wipe and recreate the remote database
 * 
 * SCHEMA CHANGES - AFTER EVERY NEW TABLE OR SCHEMA CHANGES RUN THIS
 * 
 * npx wrangler d1 export openclaw_admin --local --output ./backups/current_schema.sql --no-data
 * 
 * 
 * Examples:
 *   node scripts/d1.cjs drop:local
 *   node scripts/d1.cjs drop:remote --force
 *   node scripts/d1.cjs push:local-to-remote
 *   node scripts/d1.cjs push:remote-to-local --force
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_DIR = path.resolve(__dirname, '..');
const DB_NAME = 'openclaw_admin';
const MIGRATIONS_DIR = path.join(BASE_DIR, 'src/db/migrations');
const SEEDS_DIR = path.join(BASE_DIR, 'src/db/seeds');
const SCHEMA_FILE = path.join(MIGRATIONS_DIR, '0001_initial_schema.sql');
const SEED_FILE = path.join(SEEDS_DIR, '001_seed_fresh.sql');
const BACKUP_DIR = path.join(BASE_DIR, 'backups');

/**
 * Extract table names from SQL migration files
 */
function extractTableNames() {
  const tables = new Set();

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`⚠️  Migrations directory not found: ${MIGRATIONS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));

  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    // Match CREATE TABLE statements with various formats
    const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["'`]?(\w+)["'`]?/gi;
    let match;

    while ((match = createTableRegex.exec(content)) !== null) {
      tables.add(match[1]);
    }
  });

  return Array.from(tables).sort();
}

/**
 * Generate DROP TABLE statements for all tables
 */
function generateDropStatements(tables) {
  if (tables.length === 0) {
    return ''; // No-op if no tables found
  }

  // Drop in reverse order to handle foreign key dependencies
  const reversedTables = [...tables].reverse();

  // Disable foreign keys, drop tables, re-enable foreign keys
  const statements = [
    'PRAGMA foreign_keys = OFF;',
    '',
    ...reversedTables.map(table => `DROP TABLE IF EXISTS ${table};`),
    '',
    'PRAGMA foreign_keys = ON;'
  ];

  return statements.join('\n');
}

/**
 * Execute shell command
 */
function run(command, options = {}) {
  const { silent = false, returnOutput = false } = options;

  if (!silent) {
    console.log(`\n> ${command}\n`);
  }

  try {
    const result = execSync(command, {
      stdio: returnOutput ? 'pipe' : 'inherit',
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    return returnOutput ? result : true;
  } catch (err) {
    if (!silent) {
      console.error(`\n❌ Command failed: ${command}`);
      if (err.stderr) console.error(err.stderr);
    }
    return returnOutput ? null : false;
  }
}

/**
 * Prompt for confirmation
 */
function confirm(message) {
  if (process.argv.includes('--force')) return Promise.resolve(true);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(`${message} (y/N): `, answer => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  return BACKUP_DIR;
}

/**
 * Strip CREATE TABLE statements from SQL file (keep only INSERTs)
 * This prevents "table already exists" errors during import
 */
function stripSchemaFromDump(inputFile, outputFile) {
  console.log('   → Stripping schema statements, keeping only data...');

  const content = fs.readFileSync(inputFile, 'utf8');
  const lines = content.split('\n');
  const dataOnlyLines = [];
  let inCreateTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip CREATE TABLE blocks
    if (trimmed.match(/^CREATE TABLE/i)) {
      inCreateTable = true;
      continue;
    }

    // End of CREATE TABLE block
    if (inCreateTable && trimmed === ');') {
      inCreateTable = false;
      continue;
    }

    // Skip lines inside CREATE TABLE
    if (inCreateTable) {
      continue;
    }

    // Skip other schema-related statements
    if (trimmed.match(/^(CREATE INDEX|CREATE UNIQUE INDEX|PRAGMA)/i)) {
      continue;
    }

    // Keep everything else (INSERTs, etc.)
    dataOnlyLines.push(line);
  }

  fs.writeFileSync(outputFile, dataOnlyLines.join('\n'));
  console.log('   → Data-only file created');
}

/**
 * Sanitize SQL file to prevent SQLITE_TOOBIG errors
 * 1. Splitting multi-row INSERTs into single-row INSERTs
 * 2. Truncating overly large individual statements (e.g., huge base64 images)
 */
function sanitizeSqlFile(filePath) {
  console.log(`   → Sanitizing SQL file: ${path.basename(filePath)}`);

  const MAX_STATEMENT_LENGTH = 1000000; // ~1MB limit for D1
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const sanitizedLines = [];
  let truncatedCount = 0;
  let splitCount = 0;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Handle multi-row INSERTs (INSERT INTO table VALUES (...), (...);)
    // Wrangler export often produces these, which can easily exceed the limit
    if (trimmed.length > MAX_STATEMENT_LENGTH && trimmed.toUpperCase().startsWith('INSERT INTO')) {
      // Very naive split for multi-row inserts
      // If it has multiple ),( it's likely a multi-row insert
      const match = trimmed.match(/^(INSERT INTO .*? VALUES\s*)\((.*)\);$/i);
      if (match) {
        const prefix = match[1];
        const valuesPart = match[2];

        // This is a bit risky if data contains ),( but for standard exports it's usually fine
        // A better way would be a proper SQL parser but that's heavy
        const valueSets = valuesPart.split(/\s*\)\s*,\s*\(\s*/);

        if (valueSets.length > 1) {
          console.log(`     - Splitting large multi-row INSERT (${valueSets.length} rows)`);
          valueSets.forEach(v => {
            const newStatement = `${prefix}(${v});`;
            // Still check the new statement's length
            if (newStatement.length > MAX_STATEMENT_LENGTH) {
              sanitizedLines.push(truncateLargeFields(newStatement));
              truncatedCount++;
            } else {
              sanitizedLines.push(newStatement);
            }
          });
          splitCount++;
          continue;
        }
      }
    }

    // 2. Handle single statements that are too large
    if (trimmed.length > MAX_STATEMENT_LENGTH) {
      sanitizedLines.push(truncateLargeFields(trimmed));
      truncatedCount++;
    } else {
      sanitizedLines.push(line);
    }
  }

  if (truncatedCount > 0 || splitCount > 0) {
    fs.writeFileSync(filePath, sanitizedLines.join('\n'));
    console.log(`   → Sanitization complete: ${splitCount} statements split, ${truncatedCount} statements truncated`);
  } else {
    console.log('   → No sanitization needed');
  }
}

/**
 * Truncates exceptionally large string literals in a SQL statement
 */
function truncateLargeFields(statement) {
  const LARGE_FIELD_THRESHOLD = 500000; // Truncate fields larger than 500KB

  // Replace large quoted strings with a truncation message
  // This regex looks for strings enclosed in '' that are very long
  return statement.replace(/'([^']{500000,})'/g, (match, p1) => {
    console.warn(`     ⚠️  Truncating oversized field (${Math.round(p1.length / 1024)} KB)`);
    return `'[TRUNCATED_DUE_TO_SIZE: Original length ${p1.length} chars. This field exceeded D1 statement limits.]'`;
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const isRemote = process.argv.includes('--remote');
  const isForce = process.argv.includes('--force');
  const target = isRemote ? 'REMOTE' : 'LOCAL';
  const remoteFlag = isRemote ? '--remote' : '--local';
  const forceFlag = isForce ? '-y' : '';

  console.log(`\n🗄️  D1 Database Manager - Enhanced`);
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   Target: ${target}`);
  console.log(`   Migrations: ${MIGRATIONS_DIR}`);
  console.log(`   Seeds: ${SEEDS_DIR}\n`);

  // Extract table names from migrations
  const tables = extractTableNames();

  if (tables.length > 0) {
    console.log(`📋 Detected tables: ${tables.join(', ')}\n`);
  }

  // List available migrations
  if (fs.existsSync(MIGRATIONS_DIR)) {
    const migrations = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    if (migrations.length > 0) {
      console.log(`📁 Migrations: ${migrations.join(', ')}`);
    }
  }

  // List available seeds
  if (fs.existsSync(SEEDS_DIR)) {
    const seeds = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.sql')).sort();
    if (seeds.length > 0) {
      console.log(`🌱 Seeds: ${seeds.join(', ')}\n`);
    }
  }

  switch (command) {
    case 'schema:push':
      console.log(`📤 Pushing schema to ${target}...`);
      run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SCHEMA_FILE} ${forceFlag}`);
      break;

    case 'schema:update-initial':
      console.log(`🔄 Updating consolidated schema ${SCHEMA_FILE} from LOCAL...`);
      // Use wrangler export with --no-data to get just the schema
      const tempSchema = path.join(BACKUP_DIR, `temp_schema_${Date.now()}.sql`);
      ensureBackupDir();

      if (run(`npx wrangler d1 export ${DB_NAME} --local --output ${tempSchema} --no-data --no-schema=false`)) {
        const content = fs.readFileSync(tempSchema, 'utf8');
        // Add header
        const header = `-- Consolidate Schema Update\n-- Generated at: ${new Date().toISOString()}\n\n`;
        fs.writeFileSync(SCHEMA_FILE, header + content);
        fs.unlinkSync(tempSchema);
        console.log(`\n✅ ${SCHEMA_FILE} updated successfully!`);
      }
      break;

    case 'schema:pull':
      console.log(`📥 Pulling schema from ${target}...`);
      ensureBackupDir();
      const schemaFile = path.join(BACKUP_DIR, `schema_${Date.now()}.sql`);
      run(`npx wrangler d1 export ${DB_NAME} ${remoteFlag} --output ${schemaFile}`);
      console.log(`\n✅ Schema saved to ${schemaFile}`);
      break;

    case 'seed:push':
      console.log(`📤 Pushing seed data to ${target}...`);
      run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SEED_FILE} ${forceFlag}`);
      break;

    case 'data:pull':
      console.log(`📥 Exporting data from ${target}...`);
      ensureBackupDir();
      const dataFile = path.join(BACKUP_DIR, `data_export_${Date.now()}.sql`);
      run(`npx wrangler d1 export ${DB_NAME} ${remoteFlag} --output ${dataFile}`);
      console.log(`\n✅ Data saved to ${dataFile}`);
      break;

    case 'drop:local':
      console.log('🗑️  Dropping all tables from LOCAL database...');

      if (tables.length === 0) {
        console.log('⚠️  No tables found in migration files');
        break;
      }

      const dropLocalCmd = generateDropStatements(tables);
      console.log(`\nTables to drop: ${tables.join(', ')}`);

      const confirmLocal = await confirm('\n⚠️  This will DELETE all tables from LOCAL database. Continue?');
      if (!confirmLocal && !isForce) {
        console.log('❌ Aborted');
        break;
      }

      ensureBackupDir();
      const dropLocalFile = `./backups/drop_local_${Date.now()}.sql`;
      fs.writeFileSync(dropLocalFile, dropLocalCmd);
      run(`npx wrangler d1 execute ${DB_NAME} --local --file=${dropLocalFile}`);
      console.log('\n✅ All tables dropped from LOCAL database');
      break;

    case 'drop:remote':
      console.log('🗑️  Dropping all tables from REMOTE database...');

      if (tables.length === 0) {
        console.log('⚠️  No tables found in migration files');
        break;
      }

      const dropRemoteCmd = generateDropStatements(tables);
      console.log(`\nTables to drop: ${tables.join(', ')}`);

      const confirmRemote = await confirm('\n⚠️  WARNING: This will DELETE all tables from REMOTE database. Continue?');
      if (!confirmRemote && !isForce) {
        console.log('❌ Aborted');
        break;
      }

      ensureBackupDir();
      const dropRemoteFile = `./backups/drop_remote_${Date.now()}.sql`;
      fs.writeFileSync(dropRemoteFile, dropRemoteCmd);
      run(`npx wrangler d1 execute ${DB_NAME} --remote --file=${dropRemoteFile}`);
      console.log('\n✅ All tables dropped from REMOTE database');
      break;

    case 'push:local-to-remote': {
      console.log('🚀 Complete sync: LOCAL → REMOTE (full DB copy)\n');

      const confirmL2R = await confirm('⚠️  WARNING: This will REPLACE REMOTE database with LOCAL data. Continue?');
      if (!confirmL2R && !isForce) {
        console.log('❌ Aborted');
        break;
      }

      ensureBackupDir();

      console.log('Step 1/4: Exporting LOCAL database (schema + data)...');
      const localExport = `./backups/local_full_${Date.now()}.sql`;
      if (!run(`npx wrangler d1 export ${DB_NAME} --local --output ${localExport} --no-schema=false`)) {
        console.error('❌ Failed to export local database');
        break;
      }

      console.log('Step 2/4: Backing up REMOTE database...');
      const remoteBackup = `./backups/remote_backup_${Date.now()}.sql`;
      run(`npx wrangler d1 export ${DB_NAME} --remote --output ${remoteBackup}`, { silent: true });

      console.log('Step 3/4: Dropping REMOTE tables...');
      if (tables.length > 0) {
        const dropFile = `./backups/drop_remote_${Date.now()}.sql`;
        const dropStatements = generateDropStatements(tables);
        fs.writeFileSync(dropFile, dropStatements);
        run(`npx wrangler d1 execute ${DB_NAME} --remote --file=${dropFile} ${forceFlag}`, { silent: false });
      }

      console.log('Step 4/4: Importing full DB export to REMOTE...');
      sanitizeSqlFile(localExport);
      if (!run(`npx wrangler d1 execute ${DB_NAME} --remote --file=${localExport} ${forceFlag}`)) {
        console.error('\n❌ Import failed! Remote backup saved to:', remoteBackup);
        break;
      }

      console.log('\n✅ Sync complete: LOCAL → REMOTE (full DB copy)');
      console.log(`📦 Local export: ${localExport}`);
      console.log(`💾 Remote backup: ${remoteBackup}`);
      break;
    }

    case 'push:remote-to-local': {
      console.log('🚀 Complete sync: REMOTE → LOCAL (full DB copy)\n');

      const confirmR2L = await confirm('⚠️  This will REPLACE LOCAL database with REMOTE data. Continue?');
      if (!confirmR2L && !isForce) {
        console.log('❌ Aborted');
        break;
      }

      ensureBackupDir();

      console.log('Step 1/4: Exporting REMOTE database (schema + data)...');
      const remoteExport = `./backups/remote_full_${Date.now()}.sql`;
      if (!run(`npx wrangler d1 export ${DB_NAME} --remote --output ${remoteExport} --no-schema=false`)) {
        console.error('❌ Failed to export remote database');
        break;
      }

      console.log('Step 2/4: Backing up LOCAL database...');
      const localBackup = `./backups/local_backup_${Date.now()}.sql`;
      run(`npx wrangler d1 export ${DB_NAME} --local --output ${localBackup}`, { silent: true });

      console.log('Step 3/4: Dropping LOCAL tables...');
      if (tables.length > 0) {
        const dropFile = `./backups/drop_local_${Date.now()}.sql`;
        const dropStatements = generateDropStatements(tables);
        fs.writeFileSync(dropFile, dropStatements);
        run(`npx wrangler d1 execute ${DB_NAME} --local --file=${dropFile} ${forceFlag}`, { silent: false });
      }

      console.log('Step 4/4: Importing full DB export to LOCAL...');
      sanitizeSqlFile(remoteExport);
      if (!run(`npx wrangler d1 execute ${DB_NAME} --local --file=${remoteExport} ${forceFlag}`)) {
        console.error('\n❌ Import failed! Local backup saved to:', localBackup);
        break;
      }

      console.log('\n✅ Sync complete: REMOTE → LOCAL (full DB copy)');
      console.log(`📦 Remote export: ${remoteExport}`);
      console.log(`💾 Local backup: ${localBackup}`);
      break;
    }

    case 'reset':
      console.log(`🗑️  Resetting ${target} database...`);

      if (isRemote) {
        const confirmReset = await confirm('⚠️  WARNING: This will DELETE ALL data from REMOTE database. Continue?');
        if (!confirmReset && !isForce) {
          console.log('❌ Aborted');
          break;
        }
      }

      if (tables.length > 0) {
        ensureBackupDir();
        const dropCmd = generateDropStatements(tables);
        const dropFile = `./backups/drop_reset_${Date.now()}.sql`;
        fs.writeFileSync(dropFile, dropCmd);
        run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${dropFile}`);
      }

      run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SCHEMA_FILE} ${forceFlag}`);
      console.log(`\n✅ ${target} database reset complete`);
      break;

    case 'sync':
      console.log(`🔄 Full sync to ${target}...`);

      if (isRemote) {
        const confirmSync = await confirm('⚠️  WARNING: This will DELETE and RECREATE REMOTE database. Continue?');
        if (!confirmSync && !isForce) {
          console.log('❌ Aborted');
          break;
        }
      }

      if (tables.length > 0) {
        ensureBackupDir();
        const dropCmd = generateDropStatements(tables);
        const dropFile = `./backups/drop_sync_${Date.now()}.sql`;
        fs.writeFileSync(dropFile, dropCmd);
        run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${dropFile}`);
      }

      if (!run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SCHEMA_FILE} ${forceFlag}`)) break;
      run(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${SEED_FILE} ${forceFlag}`);
      console.log(`\n✅ ${target} database sync complete`);
      break;

    case 'deploy':
      console.log('🚀 Deploying worker to Cloudflare...');
      run('npm run deploy');
      break;

    default:
      console.log(`
❌ Unknown command: ${command || '(none)'}

📖 Available commands:

  Schema & Data:
    schema:push              Push schema to database
    schema:pull              Pull schema from database (backup)
    schema:update-initial    Update 0001_initial_schema.sql from LOCAL
    seed:push                Push seed data to database
    data:pull                Export database to SQL file

  Drop Tables:
    drop:local               Drop all tables from LOCAL database
    drop:remote              Drop all tables from REMOTE database

  Complete Sync (Schema + Data):
    push:local-to-remote     Sync LOCAL → REMOTE (complete replacement)
    push:remote-to-local     Sync REMOTE → LOCAL (complete replacement)

  Maintenance:
    reset                    Reset database (drop all tables + recreate schema)
    sync                     Full sync: reset + schema + seed data
    deploy                   Deploy worker to Cloudflare

📁 Folder Structure:
    ${MIGRATIONS_DIR}/       Schema migration files (0001_*, 0002_*, etc.)
    ${SEEDS_DIR}/            Seed data files (001_*, 002_*, etc.)

🎛️  Options:
    --remote                 Target remote database (default: local)
    --force                  Skip confirmation prompts

📚 Examples:
    node scripts/d1.cjs drop:local
    node scripts/d1.cjs drop:remote --force
    node scripts/d1.cjs push:local-to-remote
    node scripts/d1.cjs push:remote-to-local --force
    node scripts/d1.cjs sync --remote
      `);
      process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
