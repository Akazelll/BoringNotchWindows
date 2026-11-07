import { useState, useEffect } from "react";
import { extractDominantColor, DEFAULT_ALBUM_COLOR } from "../lib/colorExtractor";

/** Warna ambient dari thumbnail album. Body dipindahkan apa adanya dari ExpandedCard. */
export function useAmbientColor(thumbnail: string | null | undefined) {
  const [ambientColor, setAmbientColor] = useState<[number, number, number]>(DEFAULT_ALBUM_COLOR);

  // Extract dynamic color from album thumbnail
  useEffect(() => {
    extractDominantColor(thumbnail || null).then((color) => {
      setAmbientColor(color);
    });
  }, [thumbnail]);

  return ambientColor;
}