import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:boring-notch.db";

// sqlx menolak banyak statement dalam satu execute, jadi dijalankan satu per satu.
const DDL = [
  `CREATE TABLE IF NOT EXISTS lyrics (
    cache_key    TEXT PRIMARY KEY,
    lyrics_json  TEXT NOT NULL,
    plain_lyrics TEXT,
    updated_at   INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS todos (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    time_schedule TEXT,
    completed     INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL,
    deleted_at    INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_todos_active ON todos(deleted_at)`,
];

let dbPromise: Promise<Database> | null = null;

/** Singleton koneksi SQLite. Tabel dibuat sekali saat load pertama. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL)
      .then(async (db) => {
        for (const stmt of DDL) {
          await db.execute(stmt);
        }
        return db;
      })
      .catch((e) => {
        // biarkan load bisa dicoba lagi di panggilan berikutnya
        dbPromise = null;
        throw e;
      });
  }
  return dbPromise;
}

/** Batas jumlah lagu yang liriknya disimpan. */
export const LYRICS_CACHE_LIMIT = 10;