import React from "react";
import type { MediaInfo } from "../../../../shared/types";
import { MediaControlsLyrics } from "./MediaControlsLyrics";
import { MediaControlsCompact } from "./MediaControlsCompact";

interface MediaControlsRowProps {
  media: MediaInfo | null;
  isLyricsOpen: boolean;
  accentHex: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyrics: () => void;
}

export const MediaControlsRow: React.FC<MediaControlsRowProps> = ({
  media,
  isLyricsOpen,
  accentHex,
  onPlayPause,
  onNext,
  onPrev,
  onToggleLyrics,
}) => {
  return (
    <>
      {/* Bottom Controls Row */}
      {isLyricsOpen ? (
        <MediaControlsLyrics
          media={media}
          accentHex={accentHex}
          onPlayPause={onPlayPause}
          onNext={onNext}
          onPrev={onPrev}
          onToggleLyrics={onToggleLyrics}
        />
      ) : (
        <MediaControlsCompact
          media={media}
          onPlayPause={onPlayPause}
          onNext={onNext}
          onPrev={onPrev}
          onToggleLyrics={onToggleLyrics}
        />
      )}
    </>
  );
};
