import path from "path";
import fs from "fs";

type DatabaseType = any;
let DatabaseCtor: any = null;
// Lazy + eval-guarded so bundlers (next-on-pages/workerd) never statically
// include the native better-sqlite3 addon. Only called from auth/history
// API routes; never from pages.
function loadDatabaseCtor(): any {
  if (!DatabaseCtor) {
    // eslint-disable-next-line no-eval
    const req = eval("require");
    const mod = req("better-sqlite3");
    DatabaseCtor = mod.default || mod;
  }
  return DatabaseCtor;
}

const DATA_DIR = path.join(process.cwd(), "data");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Workers / read-only filesystems: DB file ops fail lazily inside getDb instead.
}

const DB_PATH = path.join(DATA_DIR, "streamaggregator.db");

let dbInstance: DatabaseType | null = null;

export function getDb(): DatabaseType {
  if (!dbInstance) {
    var Ctor = loadDatabaseCtor();
    dbInstance = new Ctor(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");

    // Initialize tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS watch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        media_type TEXT NOT NULL,
        tmdb_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        backdrop_path TEXT,
        season INTEGER DEFAULT NULL,
        episode INTEGER DEFAULT NULL,
        episode_title TEXT DEFAULT NULL,
        watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_history_user ON watch_history(user_id, watched_at DESC);
    `);
  }
  return dbInstance;
}
