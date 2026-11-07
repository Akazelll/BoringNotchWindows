import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { CursorState } from "../../../shared/types";

export const getCursorState = () => invoke<CursorState | null>("get_cursor_state");

export function onCursorStateChanged(handler: (state: CursorState) => void) {
  return listen<CursorState>("cursor-state-changed", (event) => {
    if (event.payload) handler(event.payload);
  });
}