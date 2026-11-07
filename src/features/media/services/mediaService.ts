import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { MediaInfo } from "../../../shared/types";

export const getMediaState = () => invoke<MediaInfo | null>("get_media_state");
export const mediaPlayPause = () => invoke("media_play_pause");
export const mediaNext = () => invoke("media_next");
export const mediaPrev = () => invoke("media_prev");

export function onMediaStateChanged(handler: (media: MediaInfo | null) => void) {
  return listen<MediaInfo | null>("media-state-changed", (event) => handler(event.payload));
}