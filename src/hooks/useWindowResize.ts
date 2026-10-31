import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { NotchViewMode, NotchState } from "../types";

export const COMPACT_WIDTH = 375;
export const COMPACT_HEIGHT = 42;
export const EXPANDED_WIDTH = 420;
export const EXPANDED_HEIGHT = 220;

export function useWindowResize(state: NotchState, _viewMode?: NotchViewMode) {
  useEffect(() => {
    const targetWidth = state === "expanded" ? EXPANDED_WIDTH : COMPACT_WIDTH;
    const targetHeight = state === "expanded" ? EXPANDED_HEIGHT : COMPACT_HEIGHT;

    invoke("set_notch_size", { width: targetWidth, height: targetHeight }).catch((err) => {
      console.error("Failed to resize notch window:", err);
    });
  }, [state]);
}
