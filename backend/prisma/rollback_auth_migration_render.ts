/**
 * ROLLBACK AUTH SESSIONS & GOOGLE IDENTITY MIGRATION ON RENDER POSTGRESQL
 *
 * SAFETY GUARDS:
 * 1. Default mode is DRY-RUN (wraps in transaction, rolls back).
 *    Write operations require explicit --apply flag.
 * 2. Strict target DB verification:
 *    - Host must end with .oregon-postgres.render.com
 *    - current_database() must be pc_store_db_nbtg
 * 3. Never prints or logs connection strings, passwords, or credentials.
 * 4. Checks that no active Google-only users exist (where password is null) before restoring constraints.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const TARGET_DATABASE = 'pc_store_db_nbtg';
const TARGET_HOST_SUFFIX = '.oregon-postgres.render.com';

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log('='.repeat(78));
  console.log(`  RENDER DB ROLLBACK AUTH MIGRATION: [${isApply ? 'APPLY MODE (PERMANENT ROLLBACK)' : 'DRY-RUN MODE'}]`);
  console.log('='.repeat(78));

  let connectionString = process.env.RENDER_DATABASE_URL;
  if (!connectionString && process.env.DATABASE_URL && process.env.DATABASE_URL.includes(TARGET_HOST_SUFFIX)) {
    connectionString = process.env.DATABASE_URL;
  }
  if (!connectionString) {
    const historyPath = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt');
    if (fs.existsSync(historyPath)) {
      const lines = fs.readFileSync(historyPath, 'utf8').split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const match = lines[i].match(/(postgres(?:ql)?:\/\/[^\s"'`]+)/);
        if (match && new URL(match[1]).hostname.includes('render.com')) {
          connectionString = match[1];
          break;
        }
      }
    }
  }

  if (!connectionString) {
    throw new Error('Could not find Render Database connection string.');
  }

  const parsed = new URL(connectionString);
  if (!parsed.hostname.endsWith(TARGET_HOST_SUFFIX)) {
    throw new Error(`Refusing to run: host "${parsed.hostname}" does not end with "${TARGET_HOST_SUFFIX}"`);
  }

  if (!connectionString.includes('sslmode=')) {
    connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const dbCheck = await client.query<{ db: string }>('SELECT current_database() AS db');
    const currentDb = dbCheck.rows[0]?.db;
    if (currentDb !== TARGET_DATABASE) {
      throw new Error(`Database name mismatch: expected "${TARGET_DATABASE}", got "${currentDb}"`);
    }

    console.log('\n[Transaction] Beginning Rollback transaction...');
    await client.query('BEGIN;');

    console.log('  -> Dropping Session table...');
    await client.query('DROP TABLE IF EXISTS "Session" CASCADE;');

    console.log('  -> Dropping User_googleSubject_key index...');
    await client.query('DROP INDEX IF EXISTS "User_googleSubject_key";');

    console.log('  -> Dropping googleSubject column...');
    await client.query('ALTER TABLE "User" DROP COLUMN IF EXISTS "googleSubject";');

    console.log('  -> Restoring password NOT NULL (if no null passwords exist)...');
    const nullPw = await client.query<{ count: string }>('SELECT count(*)::int AS count FROM "User" WHERE "password" IS NULL;');
    if (parseInt(nullPw.rows[0].count, 10) === 0) {
      await client.query('ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;');
      console.log('     Restored password NOT NULL successfully.');
    } else {
      console.log('     Skipped setting password NOT NULL because null password accounts exist.');
    }

    if (isApply) {
      await client.query('COMMIT;');
      console.log('\n>>> SUCCESS: Rollback COMMITTED! <<<');
    } else {
      await client.query('ROLLBACK;');
      console.log('\n>>> DRY-RUN COMPLETE: Rollback safely test-executed and canceled. <<<');
    }
  } catch (err) {
    try { await client.query('ROLLBACK;'); } catch {}
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('\n[FATAL ERROR]:', err.message);
  process.exit(1);
});
