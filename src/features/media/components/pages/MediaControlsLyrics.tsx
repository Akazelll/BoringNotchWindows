import React from "react";
import type { MediaInfo } from "../../../../shared/types";
import { AppleLyricsIcon } from "../../../../shared/components/ui/ExpandedHeaderParts";

interface Props {
  media: MediaInfo | null;
  accentHex: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyrics: () => void;
}

export const MediaControlsLyrics: React.FC<Props> = ({
  media,
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
        alignItems: "center",
        justifyContent: "space-between",
        height: "50px",
        width: "100%",
        boxSizing: "border-box",
        padding: "0 2px",
      }}
    >
      {/* 1. Lyrics Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLyrics();
        }}
        aria-label="Tutup lirik"
        aria-pressed="true"
        style={{
          width: "38px",
          height: "38px",
          flexShrink: 0,
          borderRadius: "50%",
          border: `1px solid ${accentHex}`,
          background: "rgba(90,162,255,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          cursor: "pointer",
          color: accentHex,
          transition: "all 250ms ease",
        }}
        className="hover:bg-white/15 active:scale-95"
        title="Tutup Lirik"
      >
        <AppleLyricsIcon size={18} />
      </button>

      {/* 2. Previous Track Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        aria-label="Mundur"
        style={{
          width: "40px",
          height: "40px",
          flexShrink: 0,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          cursor: "pointer",
        }}
        className="hover:text-white text-white/80 active:scale-90 transition"
        title="Previous Track"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
          <path d="M11 6v12L3 12zM21 6v12l-8-6z" />
        </svg>
      </button>

      {/* 3. Play / Pause Button with White Ring Shadow */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
        aria-label={media?.isPlaying ? "Jeda" : "Putar"}
        style={{
          width: "46px",
          height: "46px",
          flexShrink: 0,
          borderRadius: "50%",
          border: "none",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          boxShadow: "0 0 0 5px rgba(255,255,255,0.1)",
          cursor: "pointer",
        }}
        className="active:scale-95 transition"
        title={media?.isPlaying ? "Pause" : "Play"}
      >
        {media?.isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#09090b" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#09090b" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
          </svg>
        )}
      </button>

      {/* 4. Next Track Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        aria-label="Maju"
        style={{
          width: "40px",
          height: "40px",
          flexShrink: 0,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          cursor: "pointer",
        }}
        className="hover:text-white text-white/80 active:scale-90 transition"
        title="Next Track"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
          <path d="M13 6v12l8-6zM3 6v12l8-6z" />
        </svg>
      </button>
    </div>
  );
};
