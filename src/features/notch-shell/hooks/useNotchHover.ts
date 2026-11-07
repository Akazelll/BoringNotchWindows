import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CallInfo, NotchState } from "../../../shared/types";

/**
 * Logika hover/klik notch: expand saat masuk, collapse 180ms setelah keluar,
 * tetap terbuka selama panggilan berdering. Body dipindahkan apa adanya dari App.
 */
export function useNotchHover(
  state: NotchState,
  call: CallInfo | null,
  setState: Dispatch<SetStateAction<NotchState>>,
  setIsLyricsOpen: Dispatch<SetStateAction<boolean>>
) {
  const enterTimerRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    setState("expanded");
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }

    // If incoming call is ringing, stay expanded until answered or declined
    if (call && call.state === "incoming") return;

    leaveTimerRef.current = window.setTimeout(() => {
      setState("compact");
      setIsLyricsOpen(false);
      leaveTimerRef.current = null;
    }, 180);
  };

  const handlePillClick = () => {
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (state === "compact") {
      setState("expanded");
    }
  };

  return { handleMouseEnter, handleMouseLeave, handlePillClick };
}