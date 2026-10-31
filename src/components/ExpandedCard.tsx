import React, { useState, useEffect } from "react";
import { MediaInfo, BatteryInfo, NotchViewMode, SystemStats, AppNotification } from "../types";
import { WaveformScrubber } from "./WaveformScrubber";
import { useLyrics } from "../hooks/useLyrics";
import { CircularProgress, CustomBatteryPill } from "./CircularProgress";
import { AppSourceBadge } from "./AppSourceBadge";
import {
  Music,
  Mic2,
  ChevronLeft,
  Activity,
} from "lucide-react";

interface ExpandedCardProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  stats: SystemStats;
  notifications: AppNotification[];
  username?: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  viewMode: NotchViewMode;
  onToggleViewMode: (mode: NotchViewMode) => void;
}

// Pixel-perfect pause icon matching reference image (two thick rounded pill bars)
const PauseIcon: React.FC<{ color?: string; size?: number }> = ({
  color = "#000000",
  size = 18,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5.5" y="3" width="4.5" height="18" rx="2.25" fill={color} />
    <rect x="14" y="3" width="4.5" height="18" rx="2.25" fill={color} />
  </svg>
);

// Pixel-perfect play icon matching reference image (thick rounded triangle)
const PlayIcon: React.FC<{ color?: string; size?: number }> = ({
  color = "#000000",
  size = 18,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="ml-0.5">
    <path
      d="M6 3.8C6 2.7 7.2 2.1 8.1 2.7L20.2 10.9C21.1 11.5 21.1 12.5 20.2 13.1L8.1 21.3C7.2 21.9 6 21.3 6 20.2V3.8Z"
      fill={color}
    />
  </svg>
);

// Pixel-perfect previous icon matching reference image (|◀)
const PrevIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3.5" width="3" height="17" rx="1.5" fill="#ffffff" />
    <path
      d="M20 4.3C20 3.3 18.8 2.8 18 3.4L8.5 10.9C7.8 11.5 7.8 12.5 8.5 13.1L18 20.6C18.8 21.2 20 20.7 20 19.7V4.3Z"
      fill="#ffffff"
    />
  </svg>
);

// Pixel-perfect next icon matching reference image (▶|)
const NextIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 4.3C4 3.3 5.2 2.8 6 3.4L15.5 10.9C16.2 11.5 16.2 12.5 15.5 13.1L6 20.6C5.2 21.2 4 20.7 4 19.7V4.3Z"
      fill="#ffffff"
    />
    <rect x="18" y="3.5" width="3" height="17" rx="1.5" fill="#ffffff" />
  </svg>
);

export const ExpandedCard: React.FC<ExpandedCardProps> = ({
  media,
  battery,
  stats,
  notifications: _notifications,
  username = "User",
  onPlayPause,
  onNext,
  onPrev,
  viewMode,
  onToggleViewMode,
}) => {
  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");

  const { lyrics, plainLyrics, currentLineIndex, isLoading } = useLyrics(media);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hours}.${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute the 3 lines of lyrics: Previous, Active, Next
  const activeIndex = currentLineIndex >= 0 ? currentLineIndex : 0;
  const prevLine = activeIndex > 0 ? lyrics[activeIndex - 1]?.text : "";
  const currentLine = lyrics[activeIndex]?.text || "";
  const nextLine = lyrics[activeIndex + 1]?.text || "";

  const plainLines = plainLyrics
    ? plainLyrics.split("\n").filter((l) => l.trim().length > 0)
    : [];

  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 text-white box-border select-none bg-[#000000]">
      {media ? (
        viewMode === "lyrics" ? (
          /* Lyrics View (Matching Player View with 3-line display and controls) */
          <div className="w-full h-full flex flex-col justify-between">
            {/* Lyrics Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleViewMode("player");
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#38bdf8] hover:text-sky-300 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Player</span>
              </button>

              <div className="text-xs text-neutral-400 font-medium truncate max-w-[240px]">
                {media.title} — {media.artist}
              </div>
            </div>

            {/* Exactly 3 Lines of Lyrics: Previous, Current, Next */}
            <div className="flex-1 flex flex-col justify-center items-center text-center px-3 py-1 space-y-2 overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center text-neutral-400 text-xs py-2">
                  <span className="w-5 h-5 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin mb-1.5" />
                  <span className="text-xs">Mencari lirik lagu...</span>
                </div>
              ) : lyrics.length > 0 ? (
                <>
                  {/* Line 1: Previous line (faded) */}
                  <p className="text-xs text-neutral-500 font-medium truncate w-full h-5 transition-all duration-300">
                    {prevLine || "• • •"}
                  </p>
                  {/* Line 2: Active / Current singing line (bright blue & highlighted) */}
                  <p className="text-sm font-bold text-[#38bdf8] truncate w-full transition-all duration-300 scale-105 drop-shadow-sm px-1">
                    {currentLine || "♪ Musik Berjalan ♪"}
                  </p>
                  {/* Line 3: Next line (faded) */}
                  <p className="text-xs text-neutral-500 font-medium truncate w-full h-5 transition-all duration-300">
                    {nextLine || "• • •"}
                  </p>
                </>
              ) : plainLines.length > 0 ? (
                <>
                  <p className="text-xs text-neutral-500 font-medium truncate w-full h-5">
                    {plainLines[0] || ""}
                  </p>
                  <p className="text-sm font-bold text-[#38bdf8] truncate w-full scale-105">
                    {plainLines[1] || plainLines[0]}
                  </p>
                  <p className="text-xs text-neutral-500 font-medium truncate w-full h-5">
                    {plainLines[2] || ""}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400 text-xs text-center px-4 py-2">
                  <Mic2 className="w-5 h-5 text-neutral-600 mb-1" />
                  <span className="font-medium text-neutral-300 text-xs">Lirik tidak ditemukan</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Mendukung lagu Spotify & YouTube Music</span>
                </div>
              )}
            </div>

            {/* Bottom Controls Row in Lyrics */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <AppSourceBadge sourceApp={media.sourceApp} />

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrev();
                  }}
                  className="w-9 h-9 rounded-full bg-[#181a20] hover:bg-neutral-800 border border-white/15 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm"
                  title="Previous"
                >
                  <PrevIcon size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPause();
                  }}
                  className="w-12 h-12 rounded-full bg-white text-black hover:bg-neutral-100 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition active:scale-95 cursor-pointer"
                  title={media.isPlaying ? "Pause" : "Play"}
                >
                  {media.isPlaying ? (
                    <PauseIcon color="#000000" size={18} />
                  ) : (
                    <PlayIcon color="#000000" size={18} />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="w-9 h-9 rounded-full bg-[#181a20] hover:bg-neutral-800 border border-white/15 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm"
                  title="Next"
                >
                  <NextIcon size={14} />
                </button>
              </div>

              <div className="text-xs text-[#8e94a4] font-bold tracking-wider uppercase">
                {username}
              </div>
            </div>
          </div>
        ) : (
          /* Main Player View */
          <>
            {/* Top Section: Album Cover & Track Title */}
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-white/20 group bg-[#000000] shadow-md">
                {media.thumbnail ? (
                  <img
                    src={media.thumbnail}
                    alt="album cover"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-[#000000] flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="inline-flex items-center gap-1.5 bg-[#181a20] border border-white/15 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#38bdf8] tracking-wider uppercase mb-1">
                  <span className="flex items-center gap-[2px]">
                    <span className="w-0.5 h-2 bg-[#38bdf8] rounded-full animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#38bdf8] rounded-full animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-[#38bdf8] rounded-full animate-pulse delay-150" />
                  </span>
                  <span>NOW PLAYING</span>
                </div>

                <h3 className="text-base font-bold truncate text-white leading-tight tracking-tight">
                  {media.title}
                </h3>
                <p className="text-xs font-medium text-neutral-400 truncate mt-0.5">
                  {media.artist || "Windows Audio"}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleViewMode("lyrics");
                }}
                className="p-2.5 rounded-xl bg-[#181a20] hover:bg-neutral-800 border border-white/15 text-neutral-400 hover:text-[#38bdf8] transition cursor-pointer flex-shrink-0 shadow-sm"
                title="Lihat Lirik"
              >
                <Mic2 className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Section: Waveform Audio Scrubber */}
            <WaveformScrubber
              positionSec={media.positionSec}
              durationSec={media.durationSec}
            />

            {/* Bottom Controls Row: App Badge, Controls, Branding */}
            <div className="flex items-center justify-between pt-1">
              <AppSourceBadge sourceApp={media.sourceApp} />

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrev();
                  }}
                  className="w-9 h-9 rounded-full bg-[#181a20] hover:bg-neutral-800 border border-white/15 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm"
                  title="Previous"
                >
                  <PrevIcon size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPause();
                  }}
                  className="w-12 h-12 rounded-full bg-white text-black hover:bg-neutral-100 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition active:scale-95 cursor-pointer"
                  title={media.isPlaying ? "Pause" : "Play"}
                >
                  {media.isPlaying ? (
                    <PauseIcon color="#000000" size={18} />
                  ) : (
                    <PlayIcon color="#000000" size={18} />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="w-9 h-9 rounded-full bg-[#181a20] hover:bg-neutral-800 border border-white/15 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm"
                  title="Next"
                >
                  <NextIcon size={14} />
                </button>
              </div>

              <div className="text-xs text-[#8e94a4] font-bold tracking-wider uppercase">
                {username}
              </div>
            </div>
          </>
        )
      ) : (
        /* Standby System Resource Dashboard (Matching Reference Image 9 with Guaranteed Unclipped Footer) */
        <div className="flex flex-col justify-between h-full bg-[#000000] py-0.5">
          {/* Header Row: Large Bold Time, Subtitle Date & Battery Capsule */}
          <div className="flex items-start justify-between pb-1">
            <div className="leading-none">
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-none">
                {timeStr}
              </h2>
              <p className="text-[11px] text-[#8e94a4] mt-1 capitalize font-medium">
                {dateStr}
              </p>
            </div>

            <CustomBatteryPill level={battery.level} isCharging={battery.isCharging} />
          </div>

          {/* Center: 3 Circular Progress Meter Cards (CPU, RAM, Disk C:) */}
          <div className="grid grid-cols-3 gap-2.5 my-2">
            {/* CPU Card */}
            <div className="bg-[#13141a] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center justify-between shadow-sm">
              <CircularProgress
                percent={stats.cpuPercent}
                size={48}
                strokeWidth={4.5}
                strokeColor="#38bdf8"
                trackColor="#222530"
              >
                <span className="text-xs font-bold text-white font-mono">
                  {stats.cpuPercent}%
                </span>
              </CircularProgress>
              <span className="text-[11px] font-bold text-white mt-1.5 leading-none">CPU</span>
              <span className="text-[10px] text-[#8e94a4] font-medium mt-0.5 leading-none">Live</span>
            </div>

            {/* RAM Card */}
            <div className="bg-[#13141a] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center justify-between shadow-sm">
              <CircularProgress
                percent={stats.ramPercent}
                size={48}
                strokeWidth={4.5}
                strokeColor="#38bdf8"
                trackColor="#222530"
              >
                <span className="text-xs font-bold text-white font-mono">
                  {stats.ramPercent}%
                </span>
              </CircularProgress>
              <span className="text-[11px] font-bold text-white mt-1.5 leading-none">RAM</span>
              <span className="text-[10px] text-[#8e94a4] font-medium mt-0.5 leading-none truncate max-w-full">
                {stats.ramUsedGb} / {stats.ramTotalGb} GB
              </span>
            </div>

            {/* Disk Card */}
            <div className="bg-[#13141a] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center justify-between shadow-sm">
              <CircularProgress
                percent={stats.diskPercent}
                size={48}
                strokeWidth={4.5}
                strokeColor="#38bdf8"
                trackColor="#222530"
              >
                <span className="text-xs font-bold text-white font-mono">
                  {stats.diskPercent}%
                </span>
              </CircularProgress>
              <span className="text-[11px] font-bold text-white mt-1.5 leading-none">Disk C:</span>
              <span className="text-[10px] text-[#8e94a4] font-medium mt-0.5 leading-none truncate max-w-full">
                {stats.diskUsedGb} / {stats.diskTotalGb} GB
              </span>
            </div>
          </div>

          {/* Footer: Activity Status & Windows Username (Guaranteed Clean, Padded, and 100% Visible) */}
          <div className="flex items-center justify-between pt-1.5 pb-0.5 px-1 border-t border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="text-xs text-[#d1d5db] font-medium">Normal</span>
            </div>
            <span className="text-xs text-[#8e94a4] font-bold uppercase tracking-wider">{username}</span>
          </div>
        </div>
      )}
    </div>
  );
};
