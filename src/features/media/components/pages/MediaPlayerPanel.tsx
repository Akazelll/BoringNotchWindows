import React from "react";
import { BatteryInfo, MediaInfo } from "../../../../shared/types";
import { LinearScrubber } from "../LinearScrubber";
import { MediaControlsRow } from "./MediaControlsRow";
import { ExpandedClockHeader, HeaderWaveformIcon } from "../../../../shared/components/ui/ExpandedHeaderParts";

interface MediaPlayerPanelProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  isLyricsOpen: boolean;
  displayTitle: string;
  displayArtist: string;
  dateStr: string;
  timeStr: string;
  accentHex: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyrics: () => void;
}

export const MediaPlayerPanel: React.FC<MediaPlayerPanelProps> = ({
  media,
  battery,
  isLyricsOpen,
  displayTitle,
  displayArtist,
  dateStr,
  timeStr,
  accentHex,
  onPlayPause,
  onNext,
  onPrev,
  onToggleLyrics,
}) => {
  return (
    <>
    {/* ─── MEDIA PLAYER PANEL (40% Grid) ─── */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // 4px, bukan 8px: di kartu 540x214 isi panel (18+68+20+44 = 150) plus 3 celah
        // 8px butuh 174px, sementara slot halaman hanya 171px. Kelebihannya memotong
        // cincin glow tombol play. 4px menyisakan 9px untuk space-between.
        gap: isLyricsOpen ? "10px" : "4px",
        width: isLyricsOpen ? "40%" : "100%",
        flex: isLyricsOpen ? "4 4 0px" : "0 0 100%",
        maxWidth: isLyricsOpen ? "40%" : "100%",
        flexShrink: 0,
        minHeight: 0,
        minWidth: 0,
        justifyContent: "space-between",
        // PageMusicPlayer centers its children, jadi panel (161.5px) mengambang di tengah
        // halaman 170.6px dan headernya meleset 4.5px dari halaman lain. Rata-atas supaya
        // header persis sejajar; mode lirik tetap tengah seperti sebelumnya.
        alignSelf: isLyricsOpen ? "center" : "flex-start",
        position: "relative",
        zIndex: 2,
        transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header: Battery Circle + Date & Time + Soundwave.
          Di mode lirik seluruh header disembunyikan: jam dan visualizer sudah tidak
          relevan di panel sempit ini, dan ruangnya dipakai lirik. */}
      {!isLyricsOpen && (
        <ExpandedClockHeader battery={battery} dateStr={dateStr} timeStr={timeStr} right={<HeaderWaveformIcon />} />
      )}

      {/* Track Info Row: Album Art 76x76 + Title & Artist */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "14px" }}>
        <div style={{ position: "relative", width: isLyricsOpen ? "76px" : "68px", height: isLyricsOpen ? "76px" : "68px", flexShrink: 0, transition: "all 350ms ease" }}>
          <div
            style={{
              position: "absolute",
              left: "4px",
              top: "10px",
              width: isLyricsOpen ? "68px" : "60px",
              height: isLyricsOpen ? "68px" : "60px",
              borderRadius: "18px",
              background: accentHex,
              filter: "blur(16px)",
              opacity: 0.4,
            }}
          />
          <div
            style={{
              position: "relative",
              width: isLyricsOpen ? "76px" : "68px",
              height: isLyricsOpen ? "76px" : "68px",
              borderRadius: "18px",
              background: "linear-gradient(145deg, #7E9BFF 0%, #4A3FD0 55%, #1B1457 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 10px 26px rgba(0,0,0,0.45)",
              overflow: "hidden",
            }}
          >
            {media?.thumbnail ? (
              <img src={media.thumbnail} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18V6l11-2v12" />
                <circle cx="6.5" cy="18" r="2.5" />
                <circle cx="17.5" cy="16" r="2.5" />
              </svg>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: isLyricsOpen ? "17px" : "18px", fontWeight: 700, lineHeight: 1.2, color: "#ffffff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displayTitle}
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: isLyricsOpen ? "#c4c4cc" : "#a1a1aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displayArtist}
          </div>
        </div>
      </div>

      {/* Scrubber (Stacked layout when lyrics is open) */}
      <LinearScrubber
        positionSec={media ? media.positionSec : 0}
        durationSec={media ? media.durationSec : 0}
        stacked={isLyricsOpen}
      />

      <MediaControlsRow
        media={media}
        isLyricsOpen={isLyricsOpen}
        accentHex={accentHex}
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrev={onPrev}
        onToggleLyrics={onToggleLyrics}
      />
    </div>
    </>
  );
};
