/** Salinan lokal pola fetchWithTimeout dari features/media/lib/lyricsCache.ts (helper itu privat). */
export async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      // Status dilempar, bukan dikembalikan: pemanggil jadi tahu provider mana yang menolak
      // dan dengan kode apa. Tanpa ini, body error dibaca sebagai JSON, field yang dicari tidak
      // ada, dan hasilnya dilaporkan sebagai "nama kota tidak ada" padahal 429/403.
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}
