import type { LyricLine } from "../../../shared/types";
import { parseLrc } from "./lrcParser";
import { getDb, LYRICS_CACHE_LIMIT } from "../../../shared/lib/db";

interface LrcLibResponse {
  id?: number;
  trackName?: string;
  artistName?: string;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
}

export interface CachedLyrics {
  lyrics: LyricLine[];
  plainLyrics: string | null;
}

// L1: in-memory, dibaca sinkron saat render. Diisi dari SQLite sekali saat boot.
const lyricsCache = new Map<string, CachedLyrics>();
const inFlightFetches = new Map<string, Promise<CachedLyrics>>();

interface LyricsRow {
  cache_key: string;
  lyrics_json: string;
  plain_lyrics: string | null;
}

/**
 * Muat semua lirik dari SQLite ke L1. Dipanggil sekali saat boot, tanpa await,
 * supaya lagu yang diputar offline tetap punya lirik tanpa menyentuh jaringan.
 */
export async function hydrateLyricsCache(): Promise<void> {
  try {
    const db = await getDb();
    const rows = await db.select<LyricsRow[]>(
      "SELECT cache_key, lyrics_json, plain_lyrics FROM lyrics"
    );
    for (const row of rows) {
      try {
        const lyrics = JSON.parse(row.lyrics_json);
        if (Array.isArray(lyrics)) {
          lyricsCache.set(row.cache_key, { lyrics, plainLyrics: row.plain_lyrics });
        }
      } catch {
        // baris rusak: lewati, biarkan dihapus oleh prune berikutnya
      }
    }
  } catch {
    // DB gagal dibuka: aplikasi tetap jalan, lirik diambil dari jaringan
  }
}

export function getLyricsCacheKey(title: string, artist: string): string {
  if (!title) return "";
  const t = title.trim().toLowerCase();
  const a = (artist || "").trim().toLowerCase();
  return a ? `${t}::${a}` : t;
}

export function getCachedLyrics(key: string): CachedLyrics | null {
  if (!key) return null;
  return lyricsCache.get(key) ?? null;
}

export function setCachedLyrics(key: string, data: CachedLyrics) {
  if (!key) return;
  // Jangan simpan hasil kosong: fetch gagal saat offline tidak boleh menimpa
  // baris DB yang bagus maupun memakan kuota LYRICS_CACHE_LIMIT.
  if (data.lyrics.length === 0 && !data.plainLyrics) return;

  lyricsCache.set(key, data);
  void persistLyrics(key, data);
}

async function persistLyrics(key: string, data: CachedLyrics) {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO lyrics (cache_key, lyrics_json, plain_lyrics, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         lyrics_json = excluded.lyrics_json,
         plain_lyrics = excluded.plain_lyrics,
         updated_at = excluded.updated_at`,
      [key, JSON.stringify(data.lyrics), data.plainLyrics, Date.now()]
    );
    // Simpan hanya N lagu terbaru.
    await db.execute(
      `DELETE FROM lyrics WHERE cache_key NOT IN (
         SELECT cache_key FROM lyrics ORDER BY updated_at DESC LIMIT ?
       )`,
      [LYRICS_CACHE_LIMIT]
    );
  } catch {
    // Gagal tulis: lirik tetap ada di L1 untuk sesi ini.
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLyricsForTrack(cleanTitle: string, cleanArtist: string): Promise<CachedLyrics> {
  const key = getLyricsCacheKey(cleanTitle, cleanArtist);
  if (!key) return { lyrics: [], plainLyrics: null };

  const existing = getCachedLyrics(key);
  if (existing) {
    return existing;
  }
  if (inFlightFetches.has(key)) {
    return inFlightFetches.get(key)!;
  }

  const promise = (async (): Promise<CachedLyrics> => {
    function tryExtractLyrics(data: LrcLibResponse | null | undefined): CachedLyrics | null {
      if (!data || typeof data !== "object") return null;
      let foundLyrics: LyricLine[] = [];
      let foundPlain: string | null = null;

      if (typeof data.syncedLyrics === "string" && data.syncedLyrics.trim().length > 0) {
        const parsedLrc = parseLrc(data.syncedLyrics);
        if (parsedLrc.length > 0) {
          foundLyrics = parsedLrc;
        }
      }
      if (foundLyrics.length === 0 && typeof data.plainLyrics === "string" && data.plainLyrics.trim().length > 0) {
        foundPlain = data.plainLyrics.trim();
      }

      if (foundLyrics.length > 0 || foundPlain) {
        return { lyrics: foundLyrics, plainLyrics: foundPlain };
      }
      return null;
    }

    // ─── Attempt 1: Exact Match (/api/get) ───
    try {
      if (cleanTitle && cleanArtist) {
        const directUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
          cleanTitle
        )}&artist_name=${encodeURIComponent(cleanArtist)}`;

        const res = await fetchWithTimeout(directUrl, 3000);
        if (res.ok) {
          const data = await res.json();
          const result = tryExtractLyrics(data);
          if (result) return result;
        }
      }
    } catch {
      // Fallthrough
    }

    // ─── Attempt 2: Search Query (/api/search?q=title+artist) ───
    try {
      const q = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetchWithTimeout(searchUrl, 3000);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list) {
            const result = tryExtractLyrics(item);
            if (result) return result;
          }
        }
      }
    } catch {
      // Fallthrough
    }

    // ─── Attempt 3: Search Title Only (/api/search?q=title) ───
    if (cleanArtist) {
      try {
        const titleUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`;
        const res = await fetchWithTimeout(titleUrl, 3000);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            for (const item of list) {
              const result = tryExtractLyrics(item);
              if (result) return result;
            }
          }
        }
      } catch {
        // Fallthrough
      }
    }

    return { lyrics: [], plainLyrics: null };
  })();

  inFlightFetches.set(key, promise);

  try {
    const finalResult = await promise;
    setCachedLyrics(key, finalResult);
    return finalResult;
  } finally {
    inFlightFetches.delete(key);
  }
}