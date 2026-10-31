import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { MediaInfo } from "../types";

export function useMedia() {
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // 1. Initial fetch and event listener from Tauri
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    invoke<MediaInfo | null>("get_media_state")
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

    listen<MediaInfo | null>("media-state-changed", (event) => {
      if (event.payload && event.payload.title) {
        setMedia(event.payload);
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
        if (!prev || !prev.isPlaying || prev.durationSec === 0) return prev;
        if (prev.positionSec >= prev.durationSec) return prev;
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
      await invoke("media_play_pause");
    } catch (err) {
      console.error("Failed to toggle play/pause:", err);
    }
  }, []);

  const nextTrack = useCallback(async () => {
    try {
      await invoke("media_next");
    } catch (err) {
      console.error("Failed to skip next:", err);
    }
  }, []);

  const prevTrack = useCallback(async () => {
    try {
      await invoke("media_prev");
    } catch (err) {
      console.error("Failed to skip prev:", err);
    }
  }, []);

  return { media, togglePlayPause, nextTrack, prevTrack };
}
