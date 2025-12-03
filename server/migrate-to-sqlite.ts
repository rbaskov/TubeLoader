import { Pool, neonConfig } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import ws from 'ws';
import path from 'path';
import fs from 'fs';

neonConfig.webSocketConstructor = ws;

async function migrateData() {
  console.log('Starting migration from PostgreSQL to SQLite...');

  // Connect to PostgreSQL
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for migration');
  }

  const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Setup SQLite
  const dbPath = path.join(process.cwd(), 'data', 'youtube-downloader.db');
  const dataDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);

  // Create tables in SQLite
  sqlite.exec(`
    DROP TABLE IF EXISTS download_jobs;
    DROP TABLE IF EXISTS user_settings;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;

    CREATE TABLE sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    );
    CREATE INDEX IDX_session_expire ON sessions(expire);

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      is_admin INTEGER DEFAULT 0,
      language TEXT DEFAULT 'en',
      theme TEXT DEFAULT 'light',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      synology_endpoint TEXT,
      synology_username TEXT,
      synology_password TEXT,
      auto_upload_to_nas INTEGER DEFAULT 1,
      youtube_cookies TEXT,
      proxy_enabled INTEGER DEFAULT 0,
      proxy_type TEXT DEFAULT 'http',
      proxy_host TEXT,
      proxy_port INTEGER,
      proxy_username TEXT,
      proxy_password TEXT,
      telegram_bot_token TEXT,
      telegram_chat_id TEXT,
      jellyfin_server_url TEXT,
      jellyfin_api_key TEXT,
      jellyfin_library_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE download_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      youtube_url TEXT NOT NULL,
      video_title TEXT,
      video_thumbnail TEXT,
      format TEXT NOT NULL,
      quality TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER DEFAULT 0,
      error_message TEXT,
      file_path TEXT,
      file_size INTEGER,
      uploaded_to_nas INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  console.log('SQLite tables created');

  // Migrate users
  console.log('Migrating users...');
  const usersResult = await pgPool.query('SELECT * FROM users');
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, username, password_hash, email, first_name, last_name, profile_image_url, is_admin, language, theme, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of usersResult.rows) {
    insertUser.run(
      user.id,
      user.username,
      user.password_hash,
      user.email,
      user.first_name,
      user.last_name,
      user.profile_image_url,
      user.is_admin || 0,
      user.language || 'en',
      user.theme || 'light',
      user.created_at?.toISOString() || new Date().toISOString(),
      user.updated_at?.toISOString() || new Date().toISOString()
    );
    console.log(`  Migrated user: ${user.username || user.id}`);
  }

  // Migrate user_settings
  console.log('Migrating user settings...');
  const settingsResult = await pgPool.query('SELECT * FROM user_settings');
  const insertSettings = sqlite.prepare(`
    INSERT INTO user_settings (id, user_id, synology_endpoint, synology_username, synology_password, auto_upload_to_nas, youtube_cookies, proxy_enabled, proxy_type, proxy_host, proxy_port, proxy_username, proxy_password, telegram_bot_token, telegram_chat_id, jellyfin_server_url, jellyfin_api_key, jellyfin_library_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const settings of settingsResult.rows) {
    insertSettings.run(
      settings.id,
      settings.user_id,
      settings.synology_endpoint,
      settings.synology_username,
      settings.synology_password,
      settings.auto_upload_to_nas ?? 1,
      settings.youtube_cookies,
      settings.proxy_enabled ?? 0,
      settings.proxy_type || 'http',
      settings.proxy_host,
      settings.proxy_port,
      settings.proxy_username,
      settings.proxy_password,
      settings.telegram_bot_token,
      settings.telegram_chat_id,
      settings.jellyfin_server_url,
      settings.jellyfin_api_key,
      settings.jellyfin_library_id,
      settings.created_at?.toISOString() || new Date().toISOString(),
      settings.updated_at?.toISOString() || new Date().toISOString()
    );
    console.log(`  Migrated settings for user: ${settings.user_id}`);
  }

  // Migrate download_jobs
  console.log('Migrating download jobs...');
  const jobsResult = await pgPool.query('SELECT * FROM download_jobs');
  const insertJob = sqlite.prepare(`
    INSERT INTO download_jobs (id, user_id, youtube_url, video_title, video_thumbnail, format, quality, status, progress, error_message, file_path, file_size, uploaded_to_nas, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const job of jobsResult.rows) {
    insertJob.run(
      job.id,
      job.user_id,
      job.youtube_url,
      job.video_title,
      job.video_thumbnail,
      job.format,
      job.quality,
      job.status,
      job.progress ?? 0,
      job.error_message,
      job.file_path,
      job.file_size,
      job.uploaded_to_nas ?? 0,
      job.created_at?.toISOString() || new Date().toISOString(),
      job.updated_at?.toISOString() || new Date().toISOString()
    );
    console.log(`  Migrated job: ${job.video_title || job.id}`);
  }

  // Migrate sessions
  console.log('Migrating sessions...');
  const sessionsResult = await pgPool.query('SELECT * FROM sessions');
  const insertSession = sqlite.prepare(`
    INSERT INTO sessions (sid, sess, expire)
    VALUES (?, ?, ?)
  `);

  for (const session of sessionsResult.rows) {
    insertSession.run(
      session.sid,
      typeof session.sess === 'object' ? JSON.stringify(session.sess) : session.sess,
      session.expire?.toISOString() || new Date().toISOString()
    );
    console.log(`  Migrated session: ${session.sid}`);
  }

  // Close connections
  sqlite.close();
  await pgPool.end();

  console.log('\nMigration completed successfully!');
  console.log(`SQLite database created at: ${dbPath}`);

  // Verify migration
  const verifyDb = new Database(dbPath);
  const userCount = verifyDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const settingsCount = verifyDb.prepare('SELECT COUNT(*) as count FROM user_settings').get() as { count: number };
  const jobsCount = verifyDb.prepare('SELECT COUNT(*) as count FROM download_jobs').get() as { count: number };
  const sessionsCount = verifyDb.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
  verifyDb.close();

  console.log('\nVerification:');
  console.log(`  Users: ${userCount.count}`);
  console.log(`  User Settings: ${settingsCount.count}`);
  console.log(`  Download Jobs: ${jobsCount.count}`);
  console.log(`  Sessions: ${sessionsCount.count}`);
}

migrateData().catch(console.error);
