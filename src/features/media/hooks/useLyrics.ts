import { useState, useEffect } from "react";
import type { LyricLine, MediaInfo } from "../../../shared/types";
import { parseTrackAndArtist, isInvalidArtist } from "../lib/trackMeta";
import {
  getLyricsCacheKey,
  getCachedLyrics,
  fetchLyricsForTrack,
} from "../lib/lyricsCache";

export { isInvalidArtist };

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

    // Sudah ada di cache (L1, hasil hidrasi SQLite), tidak perlu fetch
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