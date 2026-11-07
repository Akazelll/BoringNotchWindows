import { useState, useEffect } from "react";
import { CursorState } from "../../../shared/types";
import { getCursorState, onCursorStateChanged } from "../services/cursorService";

const NEUTRAL: CursorState = { tx: 0, ty: 0, sc: 1, isIdle: false };

export function useCursor(): CursorState {
  const [cursor, setCursor] = useState<CursorState>(NEUTRAL);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCursorState()
      .then((state) => {
        if (state) setCursor(state);
      })
      .catch(() => {});

    onCursorStateChanged((state) => {
      setCursor(state);
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