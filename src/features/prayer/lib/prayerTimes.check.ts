import {
  LABEL_WIDTH,
  arcFraction,
  arcPointBetweenDots,
  arcPointForLabelPx,
  arcPointForViewX,
  formatHHMMId,
  formatRelative,
  formatCoords,
  haversineKm,
  loadFired,
  minutesUntil,
  nextPrayerIndex,
  parseHHMM,
  resolveDue,
  saveFired,
  spreadLabelPositions,
  sunArcXY,
  zoneWallClock,
  type PrayerTimes,
} from "./prayerTimes.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Node murni tidak punya localStorage; guard harian diuji di atas stub kecil ini.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

// Data referensi dari Prayer.dc.html (Subuh 04:32 ... Isya 19:01).
const TIMES: PrayerTimes = {
  Fajr: "04:32",
  Dhuhr: "11:52",
  Asr: "15:12",
  Maghrib: "17:48",
  Isha: "19:01",
};

assert(parseHHMM("04:04") === 244, "parseHHMM 04:04");
assert(parseHHMM("19:00") === 1140, "parseHHMM 19:00");
assert(formatHHMMId("17:47") === "17.47", "formatHHMMId memakai titik");

// Timezone lokasi yang dipakai, bukan timezone perangkat: 17:30Z = 00:30 di Jakarta (hari berikutnya).
const jakarta = zoneWallClock(Date.UTC(2026, 10, 7, 17, 30), "Asia/Jakarta");
assert(jakarta.dateKey === "2026-11-08", `dateKey Jakarta, dapat ${jakarta.dateKey}`);
assert(jakarta.minutes === 30, `menit Jakarta, dapat ${jakarta.minutes}`);
const newYork = zoneWallClock(Date.UTC(2026, 10, 7, 17, 30), "America/New_York");
assert(newYork.dateKey === "2026-11-07", `dateKey New York, dapat ${newYork.dateKey}`);
assert(newYork.minutes === 12 * 60 + 30, `menit New York, dapat ${newYork.minutes}`);

// Grace window: tepat waktu dan telat 3 menit muncul, telat 6 menit hangus tanpa banner.
const before = resolveDue(parseHHMM("17:47"), TIMES, []);
assert(before.due === null, "sebelum waktunya tidak memicu");
assert(!before.expired.includes("Maghrib"), "yang belum tiba tidak dihanguskan");
assert(before.expired.includes("Asr"), "salat yang sudah lama lewat dihanguskan");

const onTime = resolveDue(parseHHMM("17:48"), TIMES, []);
assert(onTime.due === "Maghrib", "tepat waktu memicu");
// Yang memicu belum ditandai: penanda ditulis hanya setelah banner benar-benar tampil,
// supaya reminder tidak hilang saat notch sedang expanded.
assert(!onTime.expired.includes("Maghrib" as never), "yang memicu belum dihanguskan");

const late = resolveDue(parseHHMM("17:51"), TIMES, []);
assert(late.due === "Maghrib", "telat 3 menit masih memicu");

const tooLate = resolveDue(parseHHMM("17:54"), TIMES, []);
assert(tooLate.due === null, "telat 6 menit tidak memicu");
assert(tooLate.expired.includes("Maghrib"), "yang terlewat dihanguskan tanpa banner");

const already = resolveDue(parseHHMM("17:48"), TIMES, ["Maghrib"]);
assert(already.due === null, "tidak memicu dua kali");
assert(!already.expired.includes("Maghrib"), "yang sudah tampil tidak dihanguskan lagi");

const multiLate = resolveDue(parseHHMM("15:14"), TIMES, []);
assert(multiLate.due === "Asr", "hanya salat dalam grace yang memicu");
assert(multiLate.expired.includes("Dhuhr"), "salat yang lebih tua dihanguskan diam-diam");
assert(!multiLate.expired.includes("Asr"), "yang memicu tidak dihanguskan");

// Busur matahari dikunci ke nilai artboard.
const start = sunArcXY(0);
assert(start.x === 12 && start.y === 78, "ujung kiri busur");
const mid = sunArcXY(0.5);
assert(mid.x === 130 && mid.y === 12, `puncak busur, dapat ${mid.x},${mid.y}`);
const quarter = sunArcXY(0.25);
assert(quarter.y === 28.5, `busur pada t=0.25, dapat ${quarter.y}`);
const end = sunArcXY(1);
assert(end.x === 248 && end.y === 78, "ujung kanan busur");
assert(sunArcXY(-0.3).x === 12 && sunArcXY(1.4).x === 248, "fraction dijepit ke ujung");

// Posisi salat naik monoton dan tetap di dalam viewBox.
let previousX = -1;
for (const key of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const) {
  const { x } = sunArcXY(arcFraction(parseHHMM(TIMES[key]), TIMES));
  assert(x > previousX, `posisi ${key} harus naik`);
  assert(x >= 0 && x <= 260, `posisi ${key} di dalam viewBox`);
  previousX = x;
}

// Dot mengikuti label, bukan posisi jamnya: px label dibalik ke viewBox lalu diambil y busur.
assert(arcPointForLabelPx(12, 1, 0).x === 12, "label di ujung kiri");
assert(arcPointForLabelPx(130, 1, 0).y === 12, "label di puncak busur");
assert(arcPointForLabelPx(248, 1, 0).x === 248, "label di ujung kanan");
assert(
  arcPointForLabelPx(-500, 1, 0).x === 12 && arcPointForLabelPx(999, 1, 0).x === 248,
  "px di luar panel dijepit ke ujung busur"
);
assert(arcPointForLabelPx(100, 0, 0).x === 12, "scale 0 tidak menghasilkan NaN");

// Matahari mengikuti dot: di waktu salat ia duduk tepat di dot itu, di tengah segmen di titik
// tengah kedua dot, dan selalu di atas busur.
const f0 = 0.2;
const f1 = 0.6;
assert(arcPointBetweenDots(f0, f0, f1, 80, 126).x === 80, "matahari di dot kiri");
assert(arcPointBetweenDots(f1, f0, f1, 80, 126).x === 126, "matahari di dot kanan");
assert(arcPointBetweenDots((f0 + f1) / 2, f0, f1, 80, 126).x === 103, "matahari di tengah segmen");
assert(arcPointBetweenDots(-1, f0, f1, 80, 126).x === 80, "sebelum segmen dijepit ke kiri");
assert(arcPointBetweenDots(9, f0, f1, 80, 126).x === 126, "sesudah segmen dijepit ke kanan");
assert(arcPointBetweenDots(f0, f0, f0, 80, 126).x === 80, "segmen kosong tidak NaN");
for (const now of [f0, (f0 + f1) / 2, f1]) {
  const sun = arcPointBetweenDots(now, f0, f1, 80, 126);
  assert(Math.abs(sun.y - arcPointForViewX(sun.x).y) < 1e-9, "matahari tetap di atas busur");
}

// Posisi label: hanya yang berdesakan yang bergeser, selalu ke kiri, tidak ada yang bertumpuk.
// Panel 241px adalah keadaan nyata di kartu 540px; tikungan busur px-nya 11,122,170,212,230.
const spread = spreadLabelPositions([11, 122, 170, 212, 230], 241);
assert(
  spread.map((v) => Math.round(v)).join() === "23,80,126,172,218",
  `spread panel 241, dapat ${spread.map((v) => Math.round(v)).join()}`
);
for (let i = 1; i < spread.length; i += 1) {
  assert(spread[i] - spread[i - 1] >= LABEL_WIDTH, `label ${i} harus berjarak >= ${LABEL_WIDTH}px`);
}
assert(spread[0] < spread[1] && spread[1] < spread[2], "urutan label tetap naik");
assert(
  spread.every((x) => x >= LABEL_WIDTH / 2 && x <= 241 - LABEL_WIDTH / 2),
  "semua label di dalam panel"
);

// Invarian yang paling penting: px label -> dot -> px kembali harus identik, jadi kelima dot
// benar-benar duduk di atas kotak labelnya (panel 241, sama seperti blok spread di atas).
const arcScale = 241 / 260;
for (const px of spread) {
  const dot = arcPointForLabelPx(px, arcScale, 0);
  assert(Math.abs(dot.x * arcScale - px) < 1e-9, `dot ${dot.x} tidak di atas label ${px}px`);
  assert(dot.y > 0 && dot.y < 78, "dot di dalam busur");
}

// Label yang sudah cukup di kiri tidak ikut bergeser.
const alreadyLeft = spreadLabelPositions([23, 122, 172, 212, 230], 241);
assert(Math.round(alreadyLeft[0]) === 23, "label paling kiri tidak digeser kalau sudah pas");

// Posisi marker yang sudah rapi tidak diubah sama sekali.
const roomy = spreadLabelPositions([60, 120, 180, 240, 300], 400);
assert(roomy.join() === "60,120,180,240,300", `posisi lega tidak diubah, dapat ${roomy.join()}`);

// Panel sempit: tidak boleh ada posisi di luar panel (bertumpuk tidak terhindarkan,
// 5 kotak 46px butuh 230px).
const narrow = spreadLabelPositions([11, 122, 170, 212, 230], 120);
assert(
  narrow.every((x) => x >= 0 && x <= 120),
  `panel sempit tetap di dalam panel, dapat ${narrow.join()}`
);

assert(formatRelative(68) === "dalam 1 j 8 mnt", "formatRelative 68 menit");
assert(formatRelative(45) === "dalam 45 mnt", "formatRelative 45 menit");
assert(formatRelative(0) === "sekarang", "formatRelative 0 menit");
assert(formatRelative(120) === "dalam 2 j", "formatRelative 2 jam pas");

// Hitung mundur setelah Isya menuju Subuh BESOK, bukan 0. Inilah bug yang diperbaiki: dulu
// selisihnya negatif lalu dijepit ke 0 oleh Math.max, sehingga labelnya macet di "sekarang".
// 23:30 -> 04:32 besok = 5 j 2 mnt = 302 menit.
assert(minutesUntil(TIMES, parseHHMM("23:30")) === 302, "23:30 menuju Subuh besok");
assert(minutesUntil(TIMES, parseHHMM("20:00")) === 512, "20:00 menuju Subuh besok");
assert(minutesUntil(TIMES, parseHHMM("19:02")) === 570, "tepat sesudah Isya");
assert(minutesUntil(TIMES, parseHHMM("23:59")) > 0, "tidak pernah macet di nol");
// Jalur normal tidak berubah.
assert(minutesUntil(TIMES, parseHHMM("17:47")) === 1, "satu menit menuju Maghrib");
assert(minutesUntil(TIMES, parseHHMM("10:00")) === 112, "pagi menuju Dzuhur");
assert(minutesUntil(TIMES, parseHHMM("04:31")) === 1, "satu menit menuju Subuh");
// Label setelah Isya harus berupa durasi, bukan "sekarang".
assert(
  formatRelative(minutesUntil(TIMES, parseHHMM("23:30"))) === "dalam 5 j 2 mnt",
  "label malam berupa hitung mundur"
);

// Label lokasi cadangan: dua desimal, dan kosong untuk koordinat tak valid supaya pemanggil
// bisa memakai `||` tanpa menghasilkan label sampah.
assert(formatCoords(-6.8041, 110.8512) === "-6.80, 110.85", "formatCoords membulatkan 2 desimal");
assert(formatCoords(0, 0) === "0.00, 0.00", "formatCoords nol tetap sah");
assert(formatCoords(NaN, 110.85) === "", "formatCoords menolak NaN");
assert(formatCoords(-6.8, Infinity) === "", "formatCoords menolak Infinity");

// Jarak untuk ambang "nama kota lama masih relevan": koordinat sama -> 0, Demak ke Semarang
// masih dekat, Demak ke Surabaya jauh sehingga nama lama tidak boleh dipakai.
const demak: [number, number] = [-6.8509, 110.6809];
assert(haversineKm(demak[0], demak[1], demak[0], demak[1]) === 0, "jarak ke titik sendiri nol");
const semarang = haversineKm(demak[0], demak[1], -6.9929, 110.4138);
assert(semarang > 15 && semarang < 40, `Demak-Semarang ${semarang.toFixed(1)} km`);
const surabaya = haversineKm(demak[0], demak[1], -7.2578, 112.7521);
assert(surabaya > 200 && surabaya < 300, `Demak-Surabaya ${surabaya.toFixed(1)} km`);
assert(!Number.isFinite(haversineKm(NaN, 110.68, -6.85, 110.68)), "jarak menolak NaN");

assert(nextPrayerIndex(TIMES, parseHHMM("16:40")) === 3, "16:40 berikutnya Maghrib");
assert(nextPrayerIndex(TIMES, parseHHMM("23:30")) === 0, "setelah Isya membungkus ke Subuh");

// Guard harian: tanggal sama memakai daftar tersimpan, tanggal lain mereset.
saveFired("2026-11-07", ["Fajr"]);
assert(loadFired("2026-11-07").join() === "Fajr", "daftar hari ini dibaca kembali");
assert(loadFired("2026-11-08").length === 0, "tanggal berbeda mereset daftar");

console.log("prayerTimes: ok");
