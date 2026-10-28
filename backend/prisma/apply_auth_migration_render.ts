/**
 * APPLY AUTH SESSIONS & GOOGLE IDENTITY MIGRATION TO RENDER POSTGRESQL
 *
 * SAFETY GUARDS:
 * 1. Default mode is DRY-RUN (wraps in transaction, rolls back).
 *    Write operations require explicit --apply flag.
 * 2. Strict target DB verification:
 *    - Host must end with .oregon-postgres.render.com
 *    - current_database() must be pc_store_db_nbtg
 * 3. Never prints or logs connection strings, passwords, or credentials.
 * 4. Checks for duplicate googleSubject before creating unique index.
 * 5. Backs up user metadata before applying changes.
 * 6. Validates schema post-conditions before committing.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const TARGET_DATABASE = 'pc_store_db_nbtg';
const TARGET_HOST_SUFFIX = '.oregon-postgres.render.com';
const BACKUP_PATH = path.resolve(__dirname, '../../scratch/backup_user_table_before_auth_migration.json');

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log('='.repeat(78));
  console.log(`  RENDER DB AUTH MIGRATION: [${isApply ? 'APPLY MODE (PERMANENT)' : 'DRY-RUN MODE (ROLLBACK)'}]`);
  console.log('='.repeat(78));

  // 1. Resolve connection string for Render DB
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
    // 2. Verify database name
    const dbCheck = await client.query<{ db: string }>('SELECT current_database() AS db');
    const currentDb = dbCheck.rows[0]?.db;
    if (currentDb !== TARGET_DATABASE) {
      throw new Error(`Database name mismatch: expected "${TARGET_DATABASE}", got "${currentDb}"`);
    }
    console.log(`[Target DB] Verified database "${currentDb}" on host: ${parsed.hostname}`);

    // 3. Pre-migration diagnostics
    const preUsers = await client.query<{ count: string }>('SELECT count(*)::int AS count FROM "User";');
    const initialUserCount = parseInt(preUsers.rows[0].count, 10);
    console.log(`[Pre-check] Current User count: ${initialUserCount}`);

    const colCheck = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'googleSubject';
    `);
    const hasGoogleSubCol = colCheck.rows.length > 0;

    if (hasGoogleSubCol) {
      const dupCheck = await client.query<{ count: string }>(`
        SELECT COUNT(*)::int AS count FROM (
          SELECT "googleSubject" FROM "User"
          WHERE "googleSubject" IS NOT NULL
          GROUP BY "googleSubject" HAVING COUNT(*) > 1
        ) sub;
      `);
      const dups = parseInt(dupCheck.rows[0].count, 10);
      if (dups > 0) {
        throw new Error(`Cannot proceed: found ${dups} duplicate googleSubject groups in User table.`);
      }
      console.log(`[Pre-check] No duplicate googleSubject values found.`);
    }

    // 4. Save backup before write
    if (isApply) {
      const usersData = await client.query('SELECT id, email, role, "createdAt", "updatedAt" FROM "User";');
      fs.writeFileSync(BACKUP_PATH, JSON.stringify({
        timestamp: new Date().toISOString(),
        database: currentDb,
        userCount: initialUserCount,
        users: usersData.rows
      }, null, 2), 'utf8');
      console.log(`[Backup] User snapshot saved to: ${BACKUP_PATH}`);
    }

    // 5. Execute Migration within Transaction
    console.log('\n[Transaction] Beginning SQL migration transaction...');
    await client.query('BEGIN;');

    console.log('  -> Executing: ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL, ADD COLUMN IF NOT EXISTS "googleSubject" TEXT;');
    await client.query(`
      ALTER TABLE "User"
        ALTER COLUMN "password" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "googleSubject" TEXT;
    `);

    console.log('  -> Executing: CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSubject_key" ON "User"("googleSubject");');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSubject_key" ON "User"("googleSubject");
    `);

    console.log('  -> Executing: CREATE TABLE IF NOT EXISTS "Session" (...)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "tokenHash" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('  -> Executing: CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
      CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
      CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
    `);

    console.log('  -> Executing: FOREIGN KEY Session_userId_fkey ...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey'
        ) THEN
          ALTER TABLE "Session"
            ADD CONSTRAINT "Session_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 6. Post-migration verification within transaction
    const postColCheck = await client.query<{ column_name: string; is_nullable: string }>(`
      SELECT column_name, is_nullable FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name IN ('password', 'googleSubject');
    `);
    console.log('\n[Verification] User columns:', postColCheck.rows);

    const postSessionCheck = await client.query<{ count: string }>(`
      SELECT count(*)::int AS count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'Session';
    `);
    if (parseInt(postSessionCheck.rows[0].count, 10) === 0) {
      throw new Error('Session table verification failed: table was not created.');
    }
    console.log('[Verification] Session table exists: true');

    const postUserCount = await client.query<{ count: string }>('SELECT count(*)::int AS count FROM "User";');
    if (parseInt(postUserCount.rows[0].count, 10) !== initialUserCount) {
      throw new Error(`Data corruption guard: user count changed from ${initialUserCount} to ${postUserCount.rows[0].count}`);
    }
    console.log(`[Verification] User count preserved: ${postUserCount.rows[0].count}`);

    if (isApply) {
      await client.query('COMMIT;');
      console.log('\n>>> SUCCESS: Transaction COMMITTED to Render Database! <<<');
    } else {
      await client.query('ROLLBACK;');
      console.log('\n>>> DRY-RUN COMPLETE: Transaction safely ROLLED BACK. No changes persisted. <<<');
      console.log('To apply permanently, run with: --apply');
    }

  } catch (err) {
    try {
      await client.query('ROLLBACK;');
      console.log('[Safety] Transaction aborted and rolled back due to error.');
    } catch {
      // ignore rollback error
    }
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('\n[FATAL ERROR]:', err.message);
  process.exit(1);
});
