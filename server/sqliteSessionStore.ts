import session from 'express-session';
import { sqlite } from './db';

interface SessionData {
  sid: string;
  sess: string;
  expire: string;
}

export class SQLiteSessionStore extends session.Store {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options?: { ttl?: number }) {
    super();
    
    // Clean up expired sessions every hour
    this.cleanupInterval = setInterval(() => {
      this.clearExpiredSessions();
    }, 60 * 60 * 1000);
    
    // Initial cleanup
    this.clearExpiredSessions();
  }

  private clearExpiredSessions() {
    try {
      const now = new Date().toISOString();
      sqlite.prepare('DELETE FROM sessions WHERE expire < ?').run(now);
    } catch (error) {
      console.error('Error clearing expired sessions:', error);
    }
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    try {
      const row = sqlite.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?')
        .get(sid, new Date().toISOString()) as { sess: string } | undefined;
      
      if (row) {
        const session = JSON.parse(row.sess);
        callback(null, session);
      } else {
        callback(null, null);
      }
    } catch (error) {
      callback(error);
    }
  }

  set(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    try {
      const ttl = session.cookie?.maxAge || 7 * 24 * 60 * 60 * 1000;
      const expire = new Date(Date.now() + ttl).toISOString();
      const sess = JSON.stringify(session);

      sqlite.prepare(`
        INSERT INTO sessions (sid, sess, expire) 
        VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
      `).run(sid, sess, expire);

      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    try {
      sqlite.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    try {
      const ttl = session.cookie?.maxAge || 7 * 24 * 60 * 60 * 1000;
      const expire = new Date(Date.now() + ttl).toISOString();

      sqlite.prepare('UPDATE sessions SET expire = ? WHERE sid = ?').run(expire, sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  all(callback: (err: any, sessions?: { [sid: string]: session.SessionData } | null) => void): void {
    try {
      const rows = sqlite.prepare('SELECT sid, sess FROM sessions WHERE expire > ?')
        .all(new Date().toISOString()) as Array<{ sid: string; sess: string }>;
      
      const sessions: { [sid: string]: session.SessionData } = {};
      for (const row of rows) {
        sessions[row.sid] = JSON.parse(row.sess);
      }
      callback(null, sessions);
    } catch (error) {
      callback(error);
    }
  }

  length(callback: (err: any, length?: number) => void): void {
    try {
      const row = sqlite.prepare('SELECT COUNT(*) as count FROM sessions WHERE expire > ?')
        .get(new Date().toISOString()) as { count: number };
      callback(null, row.count);
    } catch (error) {
      callback(error);
    }
  }

  clear(callback?: (err?: any) => void): void {
    try {
      sqlite.prepare('DELETE FROM sessions').run();
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
