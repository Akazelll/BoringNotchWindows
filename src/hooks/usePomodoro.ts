import { useState, useEffect, useCallback, useRef } from "react";

export type PomodoroMode = "focus" | "break";

export const FOCUS_DURATION = 25 * 60; // 25 minutes = 1500s
export const BREAK_DURATION = 5 * 60; // 5 minutes = 300s

const STORAGE_KEY = "boring-notch-pomodoro-state";

interface SavedPomodoroState {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  targetEndTime: number | null;
}

export type PomodoroController = ReturnType<typeof usePomodoro>;

export function usePomodoro() {
  const [mode, setModeState] = useState<PomodoroMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedPomodoroState = JSON.parse(saved);
        if (parsed.mode) return parsed.mode;
      }
    } catch {}
    return "focus";
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedPomodoroState = JSON.parse(saved);
        if (parsed.isRunning && parsed.targetEndTime) {
          const remaining = Math.max(0, Math.round((parsed.targetEndTime - Date.now()) / 1000));
          return remaining;
        }
        if (typeof parsed.timeLeft === "number") return parsed.timeLeft;
      }
    } catch {}
    return FOCUS_DURATION;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedPomodoroState = JSON.parse(saved);
        if (parsed.isRunning && parsed.targetEndTime && parsed.targetEndTime > Date.now()) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  const targetEndTimeRef = useRef<number | null>(
    (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: SavedPomodoroState = JSON.parse(saved);
          return parsed.targetEndTime || null;
        }
      } catch {}
      return null;
    })()
  );

  const totalDuration = mode === "focus" ? FOCUS_DURATION : BREAK_DURATION;

  // Persist state to localStorage
  const saveState = useCallback(
    (m: PomodoroMode, running: boolean, target: number | null, remaining: number) => {
      try {
        const stateToSave: SavedPomodoroState = {
          mode: m,
          isRunning: running,
          targetEndTime: target,
          timeLeft: remaining,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch {}
    },
    []
  );

  // Accurate timestamp-based countdown ticker
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const target = targetEndTimeRef.current;
      if (!target) return;

      const remaining = Math.max(0, Math.round((target - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        // Mode finished! Switch mode automatically
        const nextMode = mode === "focus" ? "break" : "focus";
        const nextDuration = nextMode === "focus" ? FOCUS_DURATION : BREAK_DURATION;
        const nextTarget = Date.now() + nextDuration * 1000;

        setModeState(nextMode);
        setTimeLeft(nextDuration);
        targetEndTimeRef.current = nextTarget;
        saveState(nextMode, true, nextTarget, nextDuration);
      } else {
        saveState(mode, true, target, remaining);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, mode, saveState]);

  const togglePlayPause = useCallback(() => {
    if (isRunning) {
      // Pause
      const target = targetEndTimeRef.current;
      const remaining = target
        ? Math.max(0, Math.round((target - Date.now()) / 1000))
        : timeLeft;

      setIsRunning(false);
      targetEndTimeRef.current = null;
      setTimeLeft(remaining);
      saveState(mode, false, null, remaining);
    } else {
      // Start / Resume
      const currentRemaining = timeLeft > 0 ? timeLeft : totalDuration;
      const target = Date.now() + currentRemaining * 1000;

      targetEndTimeRef.current = target;
      setTimeLeft(currentRemaining);
      setIsRunning(true);
      saveState(mode, true, target, currentRemaining);
    }
  }, [isRunning, timeLeft, totalDuration, mode, saveState]);

  const reset = useCallback(() => {
    const duration = mode === "focus" ? FOCUS_DURATION : BREAK_DURATION;
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimeLeft(duration);
    saveState(mode, false, null, duration);
  }, [mode, saveState]);

  const setMode = useCallback(
    (newMode: PomodoroMode) => {
      const duration = newMode === "focus" ? FOCUS_DURATION : BREAK_DURATION;
      setModeState(newMode);
      setIsRunning(false);
      targetEndTimeRef.current = null;
      setTimeLeft(duration);
      saveState(newMode, false, null, duration);
    },
    [saveState]
  );

  // Format mm:ss e.g. "18:04"
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress ratio 0..1 (progress of time spent)
  const progressRatio = totalDuration > 0 ? Math.min(1, Math.max(0, (totalDuration - timeLeft) / totalDuration)) : 0;

  return {
    mode,
    timeLeft,
    totalDuration,
    isRunning,
    timeFormatted,
    progressRatio,
    togglePlayPause,
    reset,
    setMode,
  };
}
