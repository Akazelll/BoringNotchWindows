export type PomodoroMode = "focus" | "break" | "longBreak";

export const FOCUS_DURATION = 25 * 60;
export const SHORT_BREAK_DURATION = 5 * 60;
export const LONG_BREAK_DURATION = 15 * 60;
export const SESSIONS_PER_CYCLE = 4;

export function durationFor(mode: PomodoroMode): number {
  if (mode === "focus") return FOCUS_DURATION;
  return mode === "longBreak" ? LONG_BREAK_DURATION : SHORT_BREAK_DURATION;
}

export interface SessionState {
  mode: PomodoroMode;
  sessionIndex: number;
  completedFocus: number;
}

/**
 * Sesi berikutnya saat waktu habis.
 * Fokus 1..3 lanjut istirahat pendek, fokus ke-4 istirahat panjang, istirahat apa pun
 * kembali ke fokus dan menaikkan nomor sesi. Setelah istirahat panjang siklus mulai dari 1.
 */
export function nextSession({ mode, sessionIndex, completedFocus }: SessionState): SessionState {
  if (mode === "focus") {
    return {
      mode: sessionIndex >= SESSIONS_PER_CYCLE ? "longBreak" : "break",
      sessionIndex,
      completedFocus: Math.min(SESSIONS_PER_CYCLE, completedFocus + 1),
    };
  }
  return {
    mode: "focus",
    sessionIndex: sessionIndex >= SESSIONS_PER_CYCLE ? 1 : sessionIndex + 1,
    completedFocus: mode === "longBreak" ? 0 : completedFocus,
  };
}

/** Bagian dalam siklus yang sudah tuntas, untuk bar progres 5px di halaman Pomodoro. */
export function sessionProgress(sessionIndex: number): number {
  if (sessionIndex <= 0) return 0;
  return (sessionIndex - 1) / SESSIONS_PER_CYCLE;
}

/**
 * Sisa waktu sesi sebagai 0..1 — arah bar di halaman Pomodoro.
 * 1 = baru mulai / setelah reset, 0 = waktu habis. Kebalikan dari `progressRatio` di hook,
 * yang justru dipakai trek sesi dan harus tetap naik.
 */
export function sessionRemainingRatio(timeLeft: number, totalDuration: number): number {
  if (totalDuration <= 0) return 0;
  return Math.min(1, Math.max(0, timeLeft / totalDuration));
}

/** `2 j 10 mnt · 4 sesi`, dihitung dari konstanta sehingga tidak bisa melenceng dari durasi nyata. */
export function cycleSummaryLabel(): string {
  const totalMin =
    (FOCUS_DURATION * SESSIONS_PER_CYCLE +
      SHORT_BREAK_DURATION * (SESSIONS_PER_CYCLE - 1) +
      LONG_BREAK_DURATION) /
    60;
  return `${Math.floor(totalMin / 60)} j ${Math.round(totalMin % 60)} mnt · ${SESSIONS_PER_CYCLE} sesi`;
}

export function modeLabelId(mode: PomodoroMode): string {
  if (mode === "focus") return "Fokus";
  return mode === "longBreak" ? "Istirahat panjang" : "Istirahat";
}

export interface SessionTrackItem {
  key: string;
  label: string;
  fillPercent: number;
  isCurrent: boolean;
  isDone: boolean;
  isLongBreak: boolean;
}

/**
 * Trek sesi: 4 sesi fokus + istirahat panjang. `fillPercent` menyatakan progres di dalam
 * sesi itu (0% belum mulai, 100% selesai), bukan posisi sesi dalam siklus.
 */
export function buildSessionTrack(
  state: SessionState,
  progressInSession: number
): SessionTrackItem[] {
  const { mode, sessionIndex } = state;
  const doneCount = mode === "focus" ? sessionIndex - 1 : sessionIndex;

  return Array.from({ length: SESSIONS_PER_CYCLE + 1 }, (_, i) => {
    const isLongBreak = i === SESSIONS_PER_CYCLE;
    const isDone = isLongBreak ? false : i + 1 <= doneCount;
    const isCurrent = isLongBreak
      ? mode === "longBreak" && sessionIndex >= SESSIONS_PER_CYCLE
      : mode === "focus" && i + 1 === sessionIndex;

    return {
      key: isLongBreak ? "long" : `s${i + 1}`,
      label: isLongBreak ? "Panjang" : String(i + 1),
      fillPercent: isDone ? 100 : isCurrent ? progressInSession * 100 : 0,
      isCurrent,
      isDone,
      isLongBreak,
    };
  });
}
