/**
 * Ubah warna ambient jadi aksen yang lebih pekat + string rgb untuk style.
 * Rumus dipindahkan apa adanya dari ExpandedCard ("Boost vibrancy so the ambient
 * glow is strikingly visible and rich on OLED black").
 */
export function getAccentColor(ambientColor: [number, number, number]): {
  accentHex: string;
  vr: number;
  vg: number;
  vb: number;
} {
  const [r, g, b] = ambientColor;
  const maxC = Math.max(r, g, b, 1);
  const boostFactor = Math.max(1, 210 / maxC);
  const vr = Math.min(255, Math.round(r * boostFactor));
  const vg = Math.min(255, Math.round(g * boostFactor));
  const vb = Math.min(255, Math.round(b * boostFactor));
  return { accentHex: `rgb(${vr}, ${vg}, ${vb})`, vr, vg, vb };
}