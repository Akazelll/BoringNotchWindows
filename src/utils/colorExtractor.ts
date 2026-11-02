// Cache color extraction results so we don't recalculate on every re-render
const colorCache = new Map<string, [number, number, number]>();

// Default fallback color: elegant deep purple-blue from reference image
export const DEFAULT_ALBUM_COLOR: [number, number, number] = [45, 65, 140];

/**
 * Extracts the dominant/average color from an image URL or data URI.
 * Uses an offscreen HTML5 Canvas.
 */
export function extractDominantColor(
  imageUrl: string | null
): Promise<[number, number, number]> {
  if (!imageUrl) {
    return Promise.resolve(DEFAULT_ALBUM_COLOR);
  }

  if (colorCache.has(imageUrl)) {
    return Promise.resolve(colorCache.get(imageUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(DEFAULT_ALBUM_COLOR);
          return;
        }

        // Downscale to 16x16 to get fast average sampling
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);

        const imgData = ctx.getImageData(0, 0, 16, 16).data;
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let count = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Skip almost transparent or pitch black pixels
          if (a > 128 && (r > 20 || g > 20 || b > 20)) {
            rTotal += r;
            gTotal += g;
            bTotal += b;
            count++;
          }
        }

        if (count > 0) {
          let r = Math.round(rTotal / count);
          let g = Math.round(gTotal / count);
          let b = Math.round(bTotal / count);

          // Boost saturation/vibrancy slightly if it's too washed out
          const max = Math.max(r, g, b);
          if (max > 0 && max < 80) {
            const factor = 100 / max;
            r = Math.min(255, Math.round(r * factor));
            g = Math.min(255, Math.round(g * factor));
            b = Math.min(255, Math.round(b * factor));
          }

          const result: [number, number, number] = [r, g, b];
          colorCache.set(imageUrl, result);
          resolve(result);
        } else {
          resolve(DEFAULT_ALBUM_COLOR);
        }
      } catch {
        resolve(DEFAULT_ALBUM_COLOR);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_ALBUM_COLOR);
    };

    img.src = imageUrl;
  });
}
