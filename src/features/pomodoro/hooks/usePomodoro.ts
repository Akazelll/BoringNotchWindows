import { useState, useEffect, useCallback, useRef } from "react";
import {
  FOCUS_DURATION,
  SESSIONS_PER_CYCLE,
  buildSessionTrack,
  cycleSummaryLabel,
  durationFor,
  modeLabelId,
  nextSession,
  sessionProgress,
  type PomodoroMode,
} from "../lib/sessionCycle";

const STORAGE_KEY = "boring-notch-pomodoro-state";

interface SavedPomodoroState {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  targetEndTime: number | null;
  sessionIndex?: number;
  completedFocus?: number;
}

export type PomodoroController = ReturnType<typeof usePomodoro>;

function readSaved(): SavedPomodoroState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPomodoroState;
    return parsed?.mode ? parsed : null;
  } catch {
    return null;
  }
}

function clampSessionIndex(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 1;
  return Math.min(SESSIONS_PER_CYCLE, Math.max(1, n));
}

function clampCompleted(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(SESSIONS_PER_CYCLE, Math.max(0, n));
}

export function usePomodoro() {
  const [mode, setModeState] = useState<PomodoroMode>(() => readSaved()?.mode ?? "focus");
  const [sessionIndex, setSessionIndex] = useState<number>(() => clampSessionIndex(readSaved()?.sessionIndex ?? 1));
  const [completedFocus, setCompletedFocus] = useState<number>(() => clampCompleted(readSaved()?.completedFocus ?? 0));

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = readSaved();
    if (saved?.isRunning && saved.targetEndTime) {
      return Math.max(0, Math.round((saved.targetEndTime - Date.now()) / 1000));
    }
    if (typeof saved?.timeLeft === "number") return saved.timeLeft;
    return FOCUS_DURATION;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const saved = readSaved();
    return !!saved?.isRunning && !!saved.targetEndTime && saved.targetEndTime > Date.now();
  });

  const targetEndTimeRef = useRef<number | null>(readSaved()?.targetEndTime ?? null);

  const totalDuration = durationFor(mode);

  const saveState = useCallback(
    (
      m: PomodoroMode,
      running: boolean,
      target: number | null,
      remaining: number,
      session: number,
      focusDone: number
    ) => {
      try {
        const stateToSave: SavedPomodoroState = {
          mode: m,
          isRunning: running,
          targetEndTime: target,
          timeLeft: remaining,
          sessionIndex: session,
          completedFocus: focusDone,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch {}
    },
    []
  );

  // Timestamp-based countdown: state pulih utuh setelah reload karena sisa waktu
  // selalu dihitung dari targetEndTime, bukan dari decrement.
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const target = targetEndTimeRef.current;
      if (!target) return;

      const remaining = Math.max(0, Math.round((target - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining > 0) {
        saveState(mode, true, target, remaining, sessionIndex, completedFocus);
        return;
      }

      const next = nextSession({ mode, sessionIndex, completedFocus });
      const nextDuration = durationFor(next.mode);
      const nextTarget = Date.now() + nextDuration * 1000;

      setModeState(next.mode);
      setSessionIndex(next.sessionIndex);
      setCompletedFocus(next.completedFocus);
      setTimeLeft(nextDuration);
      targetEndTimeRef.current = nextTarget;
      saveState(next.mode, true, nextTarget, nextDuration, next.sessionIndex, next.completedFocus);
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, mode, sessionIndex, completedFocus, saveState]);

  const togglePlayPause = useCallback(() => {
    if (isRunning) {
      const target = targetEndTimeRef.current;
      const remaining = target ? Math.max(0, Math.round((target - Date.now()) / 1000)) : timeLeft;

      setIsRunning(false);
      targetEndTimeRef.current = null;
      setTimeLeft(remaining);
      saveState(mode, false, null, remaining, sessionIndex, completedFocus);
    } else {
      const currentRemaining = timeLeft > 0 ? timeLeft : totalDuration;
      const target = Date.now() + currentRemaining * 1000;

      targetEndTimeRef.current = target;
      setTimeLeft(currentRemaining);
      setIsRunning(true);
      saveState(mode, true, target, currentRemaining, sessionIndex, completedFocus);
    }
  }, [isRunning, timeLeft, totalDuration, mode, sessionIndex, completedFocus, saveState]);

  const reset = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimeLeft(totalDuration);
    saveState(mode, false, null, totalDuration, sessionIndex, completedFocus);
  }, [totalDuration, mode, sessionIndex, completedFocus, saveState]);

  const setMode = useCallback(
    (newMode: PomodoroMode) => {
      const duration = durationFor(newMode);
      setModeState(newMode);
      setIsRunning(false);
      targetEndTimeRef.current = null;
      setTimeLeft(duration);
      saveState(newMode, false, null, duration, sessionIndex, completedFocus);
    },
    [sessionIndex, completedFocus, saveState]
  );

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progressRatio =
    totalDuration > 0 ? Math.min(1, Math.max(0, (totalDuration - timeLeft) / totalDuration)) : 0;

  // Jam selesai sesi berjalan, format "15.15" mengikuti jam Indonesia di halaman lain.
  const endsAt = new Date(Date.now() + timeLeft * 1000);
  const endsAtLabel = `${String(endsAt.getHours()).padStart(2, "0")}.${String(endsAt.getMinutes()).padStart(2, "0")}`;

  const sessionLabel =
    mode === "focus" ? `Fokus · ${sessionIndex} dari ${SESSIONS_PER_CYCLE}` : modeLabelId(mode);

  return {
    mode,
    timeLeft,
    totalDuration,
    isRunning,
    timeFormatted,
    progressRatio,
    sessionIndex,
    completedFocus,
    sessionsPerCycle: SESSIONS_PER_CYCLE,
    sessionLabel,
    sessionProgress: sessionProgress(sessionIndex),
    sessionTrack: buildSessionTrack({ mode, sessionIndex, completedFocus }, progressRatio),
    cycleSummaryLabel: cycleSummaryLabel(),
    endsAtLabel,
    togglePlayPause,
    reset,
    setMode,
  };
}
