export type WeatherIconKind = "sun" | "part" | "rain" | "night";

/**
 * Pemetaan WMO Weather Interpretation Codes (0..99) ke icon kind & label Bahasa Indonesia.
 * Referensi: Open-Meteo Documentation (WMO table).
 */
export function getWeatherMeta(
  code: number,
  isDay: boolean = true,
  precipProb: number = 0
): { kind: WeatherIconKind; label: string } {
  const label = getWmoLabel(code);

  // Hujan selalu diprioritaskan: jika hujan/badai atau peluang hujan tinggi (>= 40%),
  // tampilkan icon hujan walau malam hari (petir/hujan lebih penting).
  const isRainy = isRainCode(code) || precipProb >= 40;
  if (isRainy) {
    return { kind: "rain", label };
  }

  // Jika malam dan tidak hujan, gunakan ikon malam (bulan/bintang)
  if (!isDay) {
    return { kind: "night", label };
  }

  // Siang hari: cerah vs berawan
  if (code <= 1) {
    return { kind: "sun", label };
  }
  return { kind: "part", label };
}

function isRainCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) || // gerimis & hujan
    (code >= 71 && code <= 77) || // salju / butiran salju
    (code >= 80 && code <= 86) || // hujan lokal / shower
    (code >= 95 && code <= 99) // badai petir
  );
}

function getWmoLabel(code: number): string {
  switch (code) {
    case 0:
      return "Cerah";
    case 1:
      return "Cerah berawan";
    case 2:
      return "Berawan sebagian";
    case 3:
      return "Mendung";
    case 45:
      return "Berkabut";
    case 48:
      return "Kabut beku";
    case 51:
      return "Gerimis ringan";
    case 53:
      return "Gerimis";
    case 55:
      return "Gerimis lebat";
    case 56:
    case 57:
      return "Gerimis beku";
    case 61:
      return "Hujan ringan";
    case 63:
      return "Hujan";
    case 65:
      return "Hujan lebat";
    case 66:
    case 67:
      return "Hujan beku";
    case 71:
      return "Salju ringan";
    case 73:
      return "Salju";
    case 75:
      return "Salju lebat";
    case 77:
      return "Butiran salju";
    case 80:
      return "Hujan lokal";
    case 81:
      return "Hujan lokal sedang";
    case 82:
      return "Hujan lokal lebat";
    case 85:
    case 86:
      return "Hujan salju";
    case 95:
      return "Badai petir";
    case 96:
    case 97:
    case 99:
      return "Badai petir lebat";
    default:
      return "Cerah berawan";
  }
}

/**
 * Konversi derajat sudut angin ke 8 mata angin Bahasa Indonesia.
 */
export function windDirectionId(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const directions = [
    "Utara",
    "Timur Laut",
    "Timur",
    "Tenggara",
    "Selatan",
    "Barat Daya",
    "Barat",
    "Barat Laut",
  ];
  const index = Math.round(normalized / 45) % 8;
  return directions[index] || "Utara";
}

/**
 * Label kategori UV Index menurut standar WHO / BMKG.
 */
export function uvIndexLabel(uv: number): string {
  if (uv < 3) return `${Math.round(uv)} · Rendah`;
  if (uv < 6) return `${Math.round(uv)} · Sedang`;
  if (uv < 8) return `${Math.round(uv)} · Tinggi`;
  if (uv < 11) return `${Math.round(uv)} · Sangat tinggi`;
  return `${Math.round(uv)} · Ekstrem`;
}
