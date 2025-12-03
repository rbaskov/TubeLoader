import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'youtube-downloader.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize database tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

  CREATE TABLE IF NOT EXISTS users (
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

  CREATE TABLE IF NOT EXISTS user_settings (
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

  CREATE TABLE IF NOT EXISTS download_jobs (
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

console.log(`SQLite database initialized at: ${dbPath}`);
