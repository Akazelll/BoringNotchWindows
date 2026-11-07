import React from "react";
import type { MediaInfo } from "../../../../shared/types";
import { AppleLyricsIcon } from "../../../../shared/components/ui/ExpandedHeaderParts";

interface Props {
  media: MediaInfo | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyrics: () => void;
}

export const MediaControlsCompact: React.FC<Props> = ({
  media,
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
        height: "44px",
      }}
    >
      {/* Lyrics Button */}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLyrics();
          }}
          aria-label="Tampilkan lirik"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            cursor: "pointer",
            color: "#ffffff",
            transition: "all 250ms ease",
          }}
          className="hover:bg-white/15 active:scale-95"
          title="Buka Lirik"
        >
          <AppleLyricsIcon size={17} />
        </button>
      </div>

      {/* Playback Controls (Prev, Play/Pause, Next) */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Mundur"
          style={{
            width: "38px",
            height: "38px",
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
          aria-label={media?.isPlaying ? "Jeda" : "Putar"}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            boxShadow: "0 0 0 4px rgba(255,255,255,0.08), 0 6px 18px rgba(90,162,255,0.25)",
            cursor: "pointer",
          }}
          className="active:scale-95 transition"
          title={media?.isPlaying ? "Pause" : "Play"}
        >
          {media?.isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#09090b" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#09090b" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Maju"
          style={{
            width: "38px",
            height: "38px",
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

      {/* Right spacer for balance */}
      <div style={{ flex: 1 }} />
    </div>
  );
};
