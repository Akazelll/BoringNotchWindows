import {
  SESSIONS_PER_CYCLE,
  buildSessionTrack,
  cycleSummaryLabel,
  durationFor,
  nextSession,
  sessionProgress,
  sessionRemainingRatio,
  type SessionState,
} from "./sessionCycle.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const focus = (sessionIndex: number, completedFocus = sessionIndex - 1): SessionState => ({
  mode: "focus",
  sessionIndex,
  completedFocus,
});

// Fokus 1..3 -> istirahat pendek, fokus ke-4 -> istirahat panjang.
for (const index of [1, 2, 3]) {
  const next = nextSession(focus(index));
  assert(next.mode === "break", `fokus ${index} lanjut istirahat pendek, dapat ${next.mode}`);
  assert(next.sessionIndex === index, `fokus ${index} tidak menaikkan nomor sesi`);
  assert(next.completedFocus === index, `fokus ${index} menaikkan completedFocus`);
}
const fourth = nextSession(focus(4, 3));
assert(fourth.mode === "longBreak", `fokus ke-4 lanjut istirahat panjang, dapat ${fourth.mode}`);
assert(fourth.completedFocus === SESSIONS_PER_CYCLE, "fokus ke-4 menutup siklus");

// Istirahat pendek -> sesi berikutnya, completedFocus tidak berubah.
const afterShort = nextSession({ mode: "break", sessionIndex: 2, completedFocus: 2 });
assert(afterShort.mode === "focus", "istirahat pendek kembali ke fokus");
assert(afterShort.sessionIndex === 3, `istirahat sesi 2 lanjut sesi 3, dapat ${afterShort.sessionIndex}`);
assert(afterShort.completedFocus === 2, "completedFocus tidak direset oleh istirahat pendek");

// Istirahat panjang -> siklus baru dari sesi 1 dan hitungan direset.
const afterLong = nextSession({ mode: "longBreak", sessionIndex: 4, completedFocus: 4 });
assert(afterLong.mode === "focus", "istirahat panjang kembali ke fokus");
assert(afterLong.sessionIndex === 1, `istirahat panjang memulai siklus baru, dapat ${afterLong.sessionIndex}`);
assert(afterLong.completedFocus === 0, "istirahat panjang mereset completedFocus");

assert(durationFor("focus") === 1500, "durasi fokus 25 menit");
assert(durationFor("break") === 300, "durasi istirahat 5 menit");
assert(durationFor("longBreak") === 900, "durasi istirahat panjang 15 menit");
assert(cycleSummaryLabel() === "2 j 10 mnt · 4 sesi", `ringkasan siklus, dapat ${cycleSummaryLabel()}`);

assert(sessionProgress(1) === 0, "sesi 1 belum ada progres siklus");
assert(sessionProgress(3) === 0.5, "sesi 3 setengah siklus");
assert(sessionProgress(0) === 0, "nomor sesi 0 aman");

// Trek sesi: 5 item (4 sesi + Panjang), hanya sesi berjalan yang berisi progres.
const track = buildSessionTrack(focus(2, 1), 0.25);
assert(track.length === SESSIONS_PER_CYCLE + 1, "trek memuat 4 sesi + istirahat panjang");
assert(track[0].isDone && track[0].fillPercent === 100, "sesi 1 selesai penuh");
assert(track[1].isCurrent && !track[1].isDone, "sesi 2 sedang berjalan");
assert(Math.abs(track[1].fillPercent - 25) < 0.001, "sesi berjalan memakai progres dalam sesi");
assert(!track[2].isCurrent && track[2].fillPercent === 0, "sesi 3 belum mulai");
assert(track[4].isLongBreak && track[4].label === "Panjang", "item terakhir istirahat panjang");
assert(track[4].fillPercent === 0, "istirahat panjang belum terisi saat fokus");

const longTrack = buildSessionTrack({ mode: "longBreak", sessionIndex: 4, completedFocus: 4 }, 0.5);
assert(longTrack[4].isCurrent, "istirahat panjang jadi sesi berjalan");
assert(Math.abs(longTrack[4].fillPercent - 50) < 0.001, "istirahat panjang memakai progres dalam sesi");
assert(longTrack[0].isDone && longTrack[3].isDone, "keempat sesi fokus selesai sebelum istirahat panjang");

// Bar countdown: penuh saat sesi baru mulai, kosong saat waktu habis.
assert(sessionRemainingRatio(1500, 1500) === 1, "bar penuh tepat setelah sesi mulai/reset");
assert(Math.abs(sessionRemainingRatio(750, 1500) - 0.5) < 0.001, "bar setengah saat sisa separuh");
assert(sessionRemainingRatio(0, 1500) === 0, "bar kosong saat waktu habis");
assert(sessionRemainingRatio(1500, 0) === 0, "durasi 0 tidak membagi nol");
assert(sessionRemainingRatio(-5, 1500) === 0, "sisa negatif dijepit ke 0");
assert(sessionRemainingRatio(9999, 1500) === 1, "sisa melebihi durasi dijepit ke 1");

console.log("sessionCycle: ok");
