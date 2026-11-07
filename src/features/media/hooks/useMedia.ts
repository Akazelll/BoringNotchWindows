import { useState, useEffect, useCallback } from "react";
import type { MediaInfo } from "../../../shared/types";
import {
  getMediaState,
  mediaPlayPause,
  mediaNext,
  mediaPrev,
  onMediaStateChanged,
} from "../services/mediaService";

export function useMedia() {
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // 1. Initial fetch and event listener from Tauri
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getMediaState()
      .then((state) => {
        if (state && state.title) {
          setMedia(state);
        } else {
          setMedia(null);
        }
      })
      .catch((err) => {
        console.error("Failed to get initial media state:", err);
      });

    onMediaStateChanged((payload) => {
      if (payload && payload.title) {
        setMedia(payload);
      } else {
        setMedia(null);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error("Failed to listen to media-state-changed:", err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // 2. Realtime ticker: smoothly advance seconds & progress bar every second while playing
  useEffect(() => {
    const timer = setInterval(() => {
      setMedia((prev) => {
        if (!prev || !prev.isPlaying) return prev;
        if (prev.durationSec > 0 && prev.positionSec >= prev.durationSec) return prev;
        return {
          ...prev,
          positionSec: prev.positionSec + 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const togglePlayPause = useCallback(async () => {
    try {
      await mediaPlayPause();
    } catch (err) {
      console.error("Failed to toggle play/pause:", err);
    }
  }, []);

  const nextTrack = useCallback(async () => {
    try {
      await mediaNext();
    } catch (err) {
      console.error("Failed to skip next:", err);
    }
  }, []);

  const prevTrack = useCallback(async () => {
    try {
      await mediaPrev();
    } catch (err) {
      console.error("Failed to skip prev:", err);
    }
  }, []);

  return { media, togglePlayPause, nextTrack, prevTrack };
}
