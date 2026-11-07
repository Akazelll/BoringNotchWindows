import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CursorState } from "../types";

const NEUTRAL: CursorState = { tx: 0, ty: 0, sc: 1, isIdle: false };

export function useCursor(): CursorState {
  const [cursor, setCursor] = useState<CursorState>(NEUTRAL);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    invoke<CursorState | null>("get_cursor_state")
      .then((state) => {
        if (state) setCursor(state);
      })
      .catch(() => {});

    listen<CursorState>("cursor-state-changed", (event) => {
      if (event.payload) setCursor(event.payload);
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error("Failed to listen to cursor-state-changed:", err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return cursor;
}