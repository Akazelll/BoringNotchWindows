import type { LyricLine } from "../../../shared/types";
import { parseLrc } from "./lrcParser";

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

// In-memory module cache: persists across component unmount/remount (closing & reopening hover)
const lyricsCache = new Map<string, CachedLyrics>();
const inFlightFetches = new Map<string, Promise<CachedLyrics>>();
const LRC_STORAGE_PREFIX = "boring_lrc_v2_";

export function getLyricsCacheKey(title: string, artist: string): string {
  if (!title) return "";
  const t = title.trim().toLowerCase();
  const a = (artist || "").trim().toLowerCase();
  return a ? `${t}::${a}` : t;
}

export function getCachedLyrics(key: string): CachedLyrics | null {
  if (!key) return null;
  if (lyricsCache.has(key)) {
    return lyricsCache.get(key)!;
  }
  try {
    const raw = localStorage.getItem(LRC_STORAGE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.lyrics)) {
        lyricsCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export function setCachedLyrics(key: string, data: CachedLyrics) {
  if (!key) return;
  lyricsCache.set(key, data);
  try {
    localStorage.setItem(LRC_STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // Ignore quota errors
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