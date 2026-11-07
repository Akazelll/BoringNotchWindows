import type { LyricsHookResult } from "./useLyrics";
import type { MediaInfo } from "../../../shared/types";

/**
 * Turunan tampilan lirik untuk mode split: 3 baris sinkron + baris plain
 * (lirik tanpa timestamp). Rumus dipindahkan apa adanya dari ExpandedCard.
 */
export function useLyricsView(lyricsData: LyricsHookResult, media: MediaInfo | null) {
  const { lyrics, plainLyrics, currentLineIndex } = lyricsData;

  // Synced 3 lines of lyrics for Split View
  const isIntro = currentLineIndex < 0;
  const currentLine = isIntro ? "♪ Musik Berjalan ♪" : lyrics[currentLineIndex]?.text || "";
  const nextLine1 = isIntro
    ? lyrics[0]?.text || "• • •"
    : lyrics[currentLineIndex + 1]?.text || "• • •";
  const nextLine2 = isIntro
    ? lyrics[1]?.text || "• • •"
    : lyrics[currentLineIndex + 2]?.text || "• • •";

  const plainLines = plainLyrics
    ? plainLyrics
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !/^\[.*\]$/.test(l))
    : [];

  const plainIndex =
    media && media.durationSec > 0 && plainLines.length > 0
      ? Math.min(
          Math.floor((media.positionSec / media.durationSec) * plainLines.length),
          Math.max(0, plainLines.length - 1)
        )
      : 0;

  return { currentLine, nextLine1, nextLine2, plainLines, plainIndex };
}