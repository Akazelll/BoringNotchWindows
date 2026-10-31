import { useState, useEffect } from "react";
import { LyricLine, MediaInfo } from "../types";

function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const timeSec = minutes * 60 + seconds;
      const text = match[4].trim();
      if (text) {
        result.push({ timeSec, text });
      }
    }
  }

  return result.sort((a, b) => a.timeSec - b.timeSec);
}

// Smart cleaner for noisy YouTube/Spotify video & audio titles
function cleanTrackTitle(title: string): string {
  let cleaned = title
    // Remove bracketed or parenthesized info like (Official Music Video), [MV], (Lyric Video)
    .replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/gi, "")
    // Remove common buzzwords
    .replace(
      /\b(official\s*(music)?\s*video|official\s*audio|lyric\s*video|lirik|audio|visualizer|remastered|remix|hd|4k|mv)\b/gi,
      ""
    )
    // Remove "feat." or "ft."
    .replace(/\b(feat|ft)\.?\s+[\w\s&]+/gi, "")
    .trim();

  // If title was formatted as "Artist - Title", strip the artist prefix if dash is present
  if (cleaned.includes(" - ")) {
    const parts = cleaned.split(" - ");
    cleaned = parts[parts.length - 1].trim();
  }

  // Remove trailing punctuations
  cleaned = cleaned.replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "").trim();

  return cleaned || title;
}

function cleanArtistName(artist: string): string {
  return artist
    .split(/[,&/]|(\bfeat\b)|(\bft\b)/i)[0]
    .replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "")
    .trim();
}

interface LrcLibResponse {
  id?: number;
  trackName?: string;
  artistName?: string;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
}

export function useLyrics(media: MediaInfo | null) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);

  useEffect(() => {
    if (!media || !media.title) {
      setLyrics([]);
      setPlainLyrics(null);
      setIsLoading(false);
      return;
    }

    const cleanTitle = cleanTrackTitle(media.title);
    const cleanArtist = cleanArtistName(media.artist || "");

    setIsLoading(true);

    const controller = new AbortController();
    let isCancelled = false;

    async function fetchLyricsWithFallback() {
      const headers = {
        "User-Agent": "BoringNotch-Windows/1.0",
      };

      // Attempt 1: Exact match via /api/get
      try {
        if (cleanTitle && cleanArtist) {
          const directUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
            cleanTitle
          )}&artist_name=${encodeURIComponent(cleanArtist)}`;

          const res = await fetch(directUrl, { signal: controller.signal, headers });
          if (res.ok) {
            const data: LrcLibResponse = await res.json();
            if (applyLyricsData(data)) return;
          }
        }
      } catch {
        // Fallthrough to search
      }

      if (isCancelled) return;

      // Attempt 2: Search with title + artist via /api/search?q=
      try {
        const searchQuery = `${cleanTitle} ${cleanArtist}`.trim();
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(searchUrl, { signal: controller.signal, headers });
        if (res.ok) {
          const list: LrcLibResponse[] = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            // Find best matching track with lyrics
            const withLyrics = list.filter((item) => item.syncedLyrics || item.plainLyrics);
            if (withLyrics.length > 0) {
              if (applyLyricsData(withLyrics[0])) return;
            }
          }
        }
      } catch {
        // Fallthrough to title-only search
      }

      if (isCancelled) return;

      // Attempt 3: Search with cleanTitle only
      try {
        const titleUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(titleUrl, { signal: controller.signal, headers });
        if (res.ok) {
          const list: LrcLibResponse[] = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const withLyrics = list.filter((item) => item.syncedLyrics || item.plainLyrics);
            if (withLyrics.length > 0) {
              if (applyLyricsData(withLyrics[0])) return;
            }
          }
        }
      } catch {
        // Handled below
      }

      if (!isCancelled) {
        setIsLoading(false);
        setLyrics([]);
        setPlainLyrics(null);
      }
    }

    function applyLyricsData(data: LrcLibResponse): boolean {
      if (isCancelled) return false;
      if (data.syncedLyrics) {
        const parsed = parseLrc(data.syncedLyrics);
        if (parsed.length > 0) {
          setLyrics(parsed);
          setPlainLyrics(null);
          setIsLoading(false);
          return true;
        }
      }
      if (data.plainLyrics) {
        setPlainLyrics(data.plainLyrics);
        setLyrics([]);
        setIsLoading(false);
        return true;
      }
      return false;
    }

    fetchLyricsWithFallback();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [media?.title, media?.artist]);

  // Find active line index based on current positionSec
  const currentLineIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    const curPos = media ? media.positionSec : 0;
    if (curPos >= line.timeSec && (!nextLine || curPos < nextLine.timeSec)) {
      return true;
    }
    return false;
  });

  return {
    lyrics,
    plainLyrics,
    currentLineIndex,
    isLoading,
    hasLyrics: lyrics.length > 0 || !!plainLyrics,
  };
}
