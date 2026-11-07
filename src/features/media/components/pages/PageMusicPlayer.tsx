import React from "react";
import { BatteryInfo, MediaInfo } from "../../../../shared/types";
import { MediaPlayerPanel } from "./MediaPlayerPanel";
import { LyricsPanel } from "./LyricsPanel";

interface PageMusicPlayerProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  isLyricsOpen: boolean;
  displayTitle: string;
  displayArtist: string;
  dateStr: string;
  timeStr: string;
  lyrics: { timeSec: number; text: string }[];
  isLoading: boolean;
  currentLine: string;
  nextLine1: string;
  nextLine2: string;
  plainLines: string[];
  plainIndex: number;
  accentHex: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyrics: () => void;
}

export const PageMusicPlayer: React.FC<PageMusicPlayerProps> = ({
  media,
  battery,
  isLyricsOpen,
  displayTitle,
  displayArtist,
  dateStr,
  timeStr,
  lyrics,
  isLoading,
  currentLine,
  nextLine1,
  nextLine2,
  plainLines,
  plainIndex,
  accentHex,
  onPlayPause,
  onNext,
  onPrev,
  onToggleLyrics,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        // stretch, bukan center: panel lirik harus setinggi baris supaya garis pembatasnya
        // (borderLeft) memanjang penuh. Dengan center, panelnya mengempis ke tinggi isi
        // lirik saja sehingga garisnya cuma ~43px di tengah.
        alignItems: isLyricsOpen ? "stretch" : "center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MediaPlayerPanel
        media={media}
        battery={battery}
        isLyricsOpen={isLyricsOpen}
        displayTitle={displayTitle}
        displayArtist={displayArtist}
        dateStr={dateStr}
        timeStr={timeStr}
        accentHex={accentHex}
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrev={onPrev}
        onToggleLyrics={onToggleLyrics}
      />

      <LyricsPanel
        isLyricsOpen={isLyricsOpen}
        isLoading={isLoading}
        lyrics={lyrics}
        currentLine={currentLine}
        nextLine1={nextLine1}
        nextLine2={nextLine2}
        plainLines={plainLines}
        plainIndex={plainIndex}
      />
    </div>
  );
};
