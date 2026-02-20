#!/usr/bin/env node
/**
 * Database Reset Script
 * Deletes the local D1 SQLite database file and recreates schema
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCAL_DB_PATH = path.join(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

console.log('🗑️  Database Reset Script\n');

// Check if local DB exists
if (fs.existsSync(LOCAL_DB_PATH)) {
  console.log(`Found local database at: ${LOCAL_DB_PATH}`);
  
  try {
    // Delete the entire D1 database directory
    fs.rmSync(LOCAL_DB_PATH, { recursive: true, force: true });
    console.log('✅ Local database deleted\n');
  } catch (err) {
    console.error('❌ Error deleting database:', err.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  No local database found (already clean)\n');
}

console.log('🔄 Next steps:');
console.log('1. Run: npx wrangler d1 execute openclaw_admin --local --file=./drizzle/clean-reset.sql');
console.log('2. Deploy: npx wrangler deploy');
console.log('\n✨ Your database is now clean and ready for fresh schema!\n');
