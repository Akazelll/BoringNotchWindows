/** Helper tampilan panggilan, dipakai bersama oleh CallExpandedCard dan CallCompactPill. */

/** Detik → "MM:SS". */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

/** "Andi Pratama" → "AP"; satu kata → dua huruf pertama. */
export function getInitials(name: string): string {
  if (!name) return "AP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Label + warna aksen per aplikasi sumber. Warna dipakai untuk badge di avatar
 * supaya WhatsApp/Telegram/Discord/Phone Link bisa dibedakan sekilas.
 */
export function getAppMeta(appSource: string): { label: string; color: string } {
  const s = (appSource || "").toLowerCase();
  if (s.includes("whatsapp")) return { label: "WhatsApp", color: "#25D366" };
  if (s.includes("telegram")) return { label: "Telegram", color: "#2AABEE" };
  if (s.includes("discord")) return { label: "Discord", color: "#5865F2" };
  if (s.includes("teams")) return { label: "Teams", color: "#6264A7" };
  return { label: "Telepon", color: "#30D158" };
}
