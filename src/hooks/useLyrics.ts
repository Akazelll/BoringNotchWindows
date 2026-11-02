import { useState, useEffect } from "react";
import { LyricLine, MediaInfo } from "../types";

function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;

  for (const line of lines) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
      const timeSec = minutes * 60 + seconds + millis / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ timeSec, text });
      }
    }
  }

  return result.sort((a, b) => a.timeSec - b.timeSec);
}

export function isInvalidArtist(name: string): boolean {
  if (!name) return true;
  const s = name.trim().toLowerCase();
  return (
    s === "" ||
    s === "spotify" ||
    s === "spotify ab" ||
    s === "spotify web player" ||
    s === "web player" ||
    s === "unknown artist" ||
    s === "various artists" ||
    s === "windows audio" ||
    s.includes("spotify.com") ||
    s.includes("youtube.com") ||
    s.endsWith(".com") ||
    s.endsWith(".net") ||
    s.endsWith(".org") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s === "chrome" ||
    s === "google chrome" ||
    s === "msedge" ||
    s === "microsoft edge" ||
    s === "brave" ||
    s === "firefox" ||
    s === "opera"
  );
}

function cleanTitle(raw: string): string {
  let s = raw
    // Strip Spotify web suffix e.g. " | Spotify", " - Spotify", " on Spotify"
    .replace(/\s*\|\s*(spotify|web player|youtube).*$/gi, "")
    .replace(/\s*[-–—]\s*spotify\b.*$/gi, "")
    .replace(/\s+on\s+spotify\b.*$/gi, "")
    // Strip Spotify prefix e.g. "Spotify – ", "Spotify - "
    .replace(/^spotify\s*[-–—:]\s*/gi, "")
    // Strip " - song (and lyrics) by Artist" pattern from Spotify web
    .replace(/\s*[-–—]\s*song(?:\s+(?:and|&)\s+lyrics)?\s+by\s+.*$/gi, "")
    // Strip bracketed text like (Official Video), [MV], (Lyric Video), (Official Audio), (Remastered...), (Live...), etc.
    .replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/gi, "")
    // Strip buzzwords
    .replace(
      /\b(official\s*(music)?\s*video|official\s*audio|lyric\s*video|lirik|audio|visualizer|remastered|remix|hd|4k|mv)\b/gi,
      ""
    )
    // Strip "feat." or "ft."
    .replace(/\b(feat|ft)\.?\s+[\w\s&]+/gi, "")
    .trim();

  // Strip trailing/leading punctuation
  s = s.replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "").trim();

  return s || raw;
}

export function parseTrackAndArtist(
  rawTitle: string,
  rawArtist: string
): { cleanTitle: string; cleanArtist: string } {
  let cleanedTitle = cleanTitle(rawTitle);
  let cleanedArtist = (rawArtist || "").trim();

  // Pattern: "Song - song and lyrics by Artist | Spotify"
  const songByMatch = rawTitle.match(
    /^(.*?)\s*[-–—]\s*song(?:\s+(?:and|&)\s+lyrics)?\s+by\s+([^|]+)(?:\|.*)?$/i
  );
  if (songByMatch) {
    cleanedTitle = cleanTitle(songByMatch[1]);
    if (isInvalidArtist(cleanedArtist)) {
      cleanedArtist = songByMatch[2].trim();
    }
  }

  // If artist is invalid or empty, try extracting from title
  if (isInvalidArtist(cleanedArtist)) {
    cleanedArtist = "";
    // Separator: bullet (•), middle dot (·), pipe (|)
    const bulletParts = cleanedTitle.split(/\s*[•·|]\s*/);
    if (bulletParts.length >= 2) {
      cleanedTitle = bulletParts[0].trim();
      cleanedArtist = bulletParts[1].trim();
    } else {
      // Separator: dash with spaces (" - ", " – ", " — ")
      const dashParts = cleanedTitle.split(/\s*[-–—]\s+/);
      if (dashParts.length === 2) {
        cleanedTitle = dashParts[0].trim();
        cleanedArtist = dashParts[1].trim();
      }
    }
  }

  if (cleanedArtist) {
    cleanedArtist = cleanedArtist
      .split(/[,&/]|(\bfeat\b)|(\bft\b)/i)[0]
      .replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "")
      .trim();
  }

  cleanedTitle = cleanedTitle.replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "").trim();

  return {
    cleanTitle: cleanedTitle || rawTitle,
    cleanArtist: isInvalidArtist(cleanedArtist) ? "" : cleanedArtist,
  };
}

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

export function useLyrics(media: MediaInfo | null) {
  const parsed = parseTrackAndArtist(media?.title || "", media?.artist || "");
  const { cleanTitle, cleanArtist } = parsed;
  const cacheKey = getLyricsCacheKey(cleanTitle, cleanArtist);

  const initialCached = getCachedLyrics(cacheKey);

  const [currentKey, setCurrentKey] = useState<string>(cacheKey);
  const [lyrics, setLyrics] = useState<LyricLine[]>(initialCached?.lyrics || []);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(initialCached?.plainLyrics ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCached && !!cacheKey);

  // Synchronously switch state when track key changes during render
  if (cacheKey !== currentKey) {
    setCurrentKey(cacheKey);
    const cached = getCachedLyrics(cacheKey);
    if (cached) {
      setLyrics(cached.lyrics);
      setPlainLyrics(cached.plainLyrics);
      setIsLoading(false);
    } else if (cacheKey) {
      setLyrics([]);
      setPlainLyrics(null);
      setIsLoading(true);
    } else {
      setLyrics([]);
      setPlainLyrics(null);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!cacheKey) {
      setIsLoading(false);
      return;
    }

    // If already in memory or localStorage cache, do not fetch
    if (getCachedLyrics(cacheKey)) {
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    fetchLyricsForTrack(cleanTitle, cleanArtist)
      .then((data) => {
        if (isCurrent) {
          setLyrics(data.lyrics);
          setPlainLyrics(data.plainLyrics);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [cacheKey]);

  // Find active line index based on current positionSec
  // The active line is the latest line whose timeSec <= curPos
  const curPos = media ? media.positionSec : 0;
  const currentLineIndex = lyrics.reduce((acc, line, i) => {
    if (curPos >= line.timeSec) {
      return i;
    }
    return acc;
  }, -1);

  return {
    lyrics,
    plainLyrics,
    currentLineIndex,
    isLoading,
    hasLyrics: lyrics.length > 0 || !!plainLyrics,
    cleanTitle,
    cleanArtist,
  };
}

export type LyricsHookResult = ReturnType<typeof useLyrics>;

