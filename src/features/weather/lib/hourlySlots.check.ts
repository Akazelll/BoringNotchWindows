import { calculateY, processHourlyForecast } from "./hourlySlots.ts";
import type { HourlySlotData } from "../services/weatherService.ts";
import { getWeatherMeta, windDirectionId, uvIndexLabel } from "./weatherCode.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// 1. Test calculateY & pencegahan pembagian nol
assert(calculateY(25, 25, 35) === 23, "Suhu minimum berada di dasar y=23");
assert(calculateY(35, 25, 35) === 8, "Suhu maksimum berada di puncak y=8");
assert(calculateY(30, 25, 35) === 15.5, "Suhu tengah berada di y=15.5");
assert(calculateY(30, 30, 30) === 16, "Jika lo == hi, garis mendatar di y=16 tanpa NaN");
assert(!Number.isNaN(calculateY(30, 30, 30)), "calculateY tidak boleh mengembalikan NaN");

// 2. Test 48 jam dummy Open-Meteo
const mockHourly: HourlySlotData[] = [];
for (let h = 0; h < 48; h++) {
  mockHourly.push({
    time: `2026-11-13T${String(h % 24).padStart(2, "0")}:00`,
    temperature: 26 + (h % 8),
    precipitationProbability: (h * 5) % 100,
    weatherCode: h % 4,
    uvIndex: h >= 6 && h <= 18 ? 5 : 0,
    isDay: h >= 6 && h <= 18,
  });
}

const res = processHourlyForecast(mockHourly, "Asia/Jakarta", Date.parse("2026-11-13T09:15:00+07:00"));

assert(res.slots.length === 6, "Harus menghasilkan tepat 6 slot");
assert(res.points.length === 6, "Harus menghasilkan tepat 6 titik");
assert(res.slots[0].time === "Skrg", "Slot pertama harus berlabel 'Skrg'");
assert(res.slots[1].time === "13.00", "Slot kedua (09+4) harus 13.00");
assert(res.slots[2].time === "17.00", "Slot ketiga (13+4) harus 17.00");
assert(res.slots[3].time === "21.00", "Slot keempat (17+4) harus 21.00");
assert(res.slots[4].time === "01.00", "Slot kelima (21+4 mod 24) harus 01.00");
assert(res.slots[5].time === "05.00", "Slot keenam (01+4) harus 05.00");

// Verifikasi koordinat titik kurva
assert(res.points[0].x === 25, "Titik pertama x=25 (0.5 * 50)");
assert(res.points[5].x === 275, "Titik terakhir x=275 (5.5 * 50)");
assert(res.points[0].isCurrent === true, "Titik pertama adalah titik aktif (putih/lebih besar)");
assert(res.points[1].isCurrent === false, "Titik kedua bukan aktif");
assert(res.curvePath.startsWith("M 25 "), "Path SVG harus dimulai di titik pertama");
assert(res.curvePath.includes(" C "), "Path SVG harus berisi kurva Bézier kubik C");

// 3. Test weatherCode
assert(getWeatherMeta(0, true).kind === "sun", "Code 0 siang hari adalah sun");
assert(getWeatherMeta(0, false).kind === "night", "Code 0 malam hari adalah night");
assert(getWeatherMeta(3, true).kind === "part", "Code 3 adalah mendung/part");
assert(getWeatherMeta(61, false).kind === "rain", "Code 61 malam hari tetap rain (hujan diprioritaskan)");
assert(getWeatherMeta(2, true, 50).kind === "rain", "Precip >= 40% menghasilkan icon rain");

// 4. Test arah angin & UV
assert(windDirectionId(0) === "Utara", "0 derajat = Utara");
assert(windDirectionId(90) === "Timur", "90 derajat = Timur");
assert(windDirectionId(180) === "Selatan", "180 derajat = Selatan");
assert(windDirectionId(270) === "Barat", "270 derajat = Barat");
assert(uvIndexLabel(2).includes("Rendah"), "UV 2 = Rendah");
assert(uvIndexLabel(8).includes("Sangat tinggi"), "UV 8 = Sangat tinggi");

console.log("hourlySlots & weatherCode tests passed successfully!");
