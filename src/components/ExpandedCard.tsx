import React, { useState, useEffect } from "react";
import { MediaInfo, BatteryInfo, SystemStats, AppNotification } from "../types";
import { isInvalidArtist, type LyricsHookResult } from "../hooks/useLyrics";
import { PomodoroController } from "../hooks/usePomodoro";
import { useTodoList } from "../hooks/useTodoList";
import { LinearScrubber } from "./LinearScrubber";
import { extractDominantColor, DEFAULT_ALBUM_COLOR } from "../utils/colorExtractor";
import {
  Activity,
  Plus,
  Pencil,
  Check,
  Trash2,
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
  isLyricsOpen: boolean;
  onToggleLyrics: () => void;
  pomodoro: PomodoroController;
  lyricsData: LyricsHookResult;
}

// Apple SF Symbol quote.bubble.fill matching Music_with_header.html
const AppleLyricsIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 4h10a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-5.5L7.5 20.5V17H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" />
    <circle cx="9" cy="9.8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="9.8" r="1.2" fill="currentColor" stroke="none" />
    <path d="M9 11.2c0 1.1-.4 1.8-1.1 2.3M14.5 11.2c0 1.1-.4 1.8-1.1 2.3" strokeWidth="1.7" />
  </svg>
);

// Header Battery Donut with dynamic charging animation (matching Charging.dc.html)
const HeaderBatteryDonut: React.FC<{ battery: BatteryInfo }> = ({ battery }) => {
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius; // ~47.1
  const offset = ((battery.level / 100) * circumference).toFixed(1);
  const isCharging = battery.isCharging;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
      title={isCharging ? `Mengisi daya · ${battery.level}%` : `Baterai ${battery.level}%`}
    >
      <div style={{ position: "relative", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 22 22"
          fill="none"
          aria-hidden="true"
          style={{
            filter: isCharging ? "drop-shadow(0 0 4px rgba(48, 209, 88, 0.7))" : "none",
          }}
          className={isCharging ? "animate-pulse" : ""}
        >
          <circle cx="11" cy="11" r={radius} stroke="rgba(255,255,255,0.14)" strokeWidth="2.6" />
          <circle
            cx="11"
            cy="11"
            r={radius}
            stroke={isCharging ? "#30D158" : "#5AA2FF"}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={`${offset} ${circumference.toFixed(1)}`}
            transform="rotate(-90 11 11)"
          />
        </svg>
        {isCharging && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#30D158" aria-hidden="true">
              <path d="M13.5 2.5L5.5 13.2a.6.6 0 0 0 .5.95H10.5l-1 7.35a.4.4 0 0 0 .72.28l8.1-10.9a.6.6 0 0 0-.48-.96H13.3l.9-7.1a.4.4 0 0 0-.7-.32z" />
            </svg>
          </div>
        )}
      </div>
      {isCharging && (
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#30D158", fontVariantNumeric: "tabular-nums" }}>
          {battery.level}%
        </span>
      )}
    </div>
  );
};

export const ExpandedCard: React.FC<ExpandedCardProps> = ({
  media,
  battery,
  stats,
  notifications: _notifications,
  username = "User",
  onPlayPause,
  onNext,
  onPrev,
  isLyricsOpen,
  onToggleLyrics,
  pomodoro,
  lyricsData,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");
  const [ambientColor, setAmbientColor] = useState<[number, number, number]>(DEFAULT_ALBUM_COLOR);

  const { lyrics, plainLyrics, currentLineIndex, isLoading, cleanTitle, cleanArtist } = lyricsData;
  const todoList = useTodoList();

  const [isAddingTodo, setIsAddingTodo] = useState<boolean>(false);
  const [newTodoTitle, setNewTodoTitle] = useState<string>("");
  const [newTodoSchedule, setNewTodoSchedule] = useState<string>("");

  const displayTitle = cleanTitle || media?.title || "Belum ada media";
  const displayArtist = cleanArtist || (media?.artist && !isInvalidArtist(media.artist) ? media.artist : "Windows Audio");

  // Extract dynamic color from album thumbnail
  useEffect(() => {
    extractDominantColor(media?.thumbnail || null).then((color) => {
      setAmbientColor(color);
    });
  }, [media?.thumbnail]);

  // Date & Time in Indonesian format (e.g. "Sabtu, 31 Okt 20.55")
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dayName = now.toLocaleDateString("id-ID", { weekday: "short" });
      const dayNum = now.getDate();
      const monthName = now.toLocaleDateString("id-ID", { month: "short" });
      setDateStr(`${dayName}, ${dayNum} ${monthName}`);

      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hours}.${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalPages = 4;
  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };
  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

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

  const [r, g, b] = ambientColor;
  // Boost vibrancy so the ambient glow is strikingly visible and rich on OLED black
  const maxC = Math.max(r, g, b, 1);
  const boostFactor = Math.max(1, 210 / maxC);
  const vr = Math.min(255, Math.round(r * boostFactor));
  const vg = Math.min(255, Math.round(g * boostFactor));
  const vb = Math.min(255, Math.round(b * boostFactor));
  const accentHex = `rgb(${vr}, ${vg}, ${vb})`;

  // Pomodoro Progress Ring calculations
  const pomodoroRadius = 30;
  const pomodoroCircumference = 2 * Math.PI * pomodoroRadius; // ~188.5
  const pomodoroDash = (pomodoro.progressRatio * pomodoroCircumference).toFixed(1);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: "#09090b",
        position: "relative",
        overflow: "hidden",
        borderRadius: "inherit",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="select-none"
    >
      {/* ─── FULL-CARD SEAMLESS AMBIENT GRADIENT (Touches every edge, 0px cut-off) ─── */}
      {isLyricsOpen && currentPage === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, rgba(${vr}, ${vg}, ${vb}, 0.55) 0%, rgba(9, 9, 11, 0) 65%)`,
            opacity: 0.55,
            pointerEvents: "none",
            borderRadius: "inherit",
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      )}

      {/* ─── INNER CONTENT WRAPPER WITH MARGINS ─── */}
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: isLyricsOpen && currentPage === 0 ? "18px 36px 14px 36px" : "14px 44px 10px 44px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ─── NAVIGATION CHEVRONS (Safe outer gutters at 10px) ─── */}
        {!isLyricsOpen && (
          <>
            <button
              onClick={handlePrevPage}
              aria-label="Halaman sebelumnya"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                marginTop: "-13px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                cursor: "pointer",
                zIndex: 20,
              }}
              className="hover:bg-white/20 active:scale-90 transition"
              title="Halaman Sebelumnya"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>

            <button
              onClick={handleNextPage}
              aria-label="Halaman berikutnya"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                marginTop: "-13px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                cursor: "pointer",
                zIndex: 20,
              }}
              className="hover:bg-white/20 active:scale-90 transition"
              title="Halaman Berikutnya"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 0: MUSIC PLAYER (Unified Smooth Sliding Layout)
            ══════════════════════════════════════════════════════════════════ */}
        {currentPage === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* ─── MEDIA PLAYER PANEL (40% Grid) ─── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: isLyricsOpen ? "10px" : "8px",
                width: isLyricsOpen ? "40%" : "100%",
                flex: isLyricsOpen ? "4 4 0px" : "0 0 100%",
                maxWidth: isLyricsOpen ? "40%" : "100%",
                flexShrink: 0,
                minHeight: 0,
                minWidth: 0,
                justifyContent: "space-between",
                position: "relative",
                zIndex: 2,
                transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Header: Battery Circle + Date & Time + Soundwave */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: "18px" }}>
                <div style={{ flex: 1 }} />
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <HeaderBatteryDonut battery={battery} />
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>{dateStr}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
                </div>
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                  <svg width="18" height="15" viewBox="0 0 22 18" fill="none" stroke="#5AA2FF" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 7v4M7 4v10M11 1v16M15 5v8M19 7v4" />
                  </svg>
                </div>
              </div>

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

              {/* Bottom Controls Row */}
              {isLyricsOpen ? (
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
              ) : (
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
              )}
            </div>

            {/* ─── LYRICS PANEL (60% Grid) ─── */}
            <div
              style={{
                position: "relative",
                flex: isLyricsOpen ? "6 6 0px" : "0 0 0px",
                width: isLyricsOpen ? "60%" : "0px",
                maxWidth: isLyricsOpen ? "60%" : "0px",
                opacity: isLyricsOpen ? 1 : 0,
                transform: isLyricsOpen ? "translateX(0px)" : "translateX(35px)",
                pointerEvents: isLyricsOpen ? "auto" : "none",
                minWidth: 0,
                marginLeft: isLyricsOpen ? "24px" : "0px",
                paddingLeft: isLyricsOpen ? "24px" : "0px",
                borderLeft: isLyricsOpen ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "14px",
                overflow: "hidden",
                WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
                transition: "flex 350ms cubic-bezier(0.16, 1, 0.3, 1), max-width 350ms cubic-bezier(0.16, 1, 0.3, 1), width 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1), margin-left 350ms cubic-bezier(0.16, 1, 0.3, 1), padding-left 350ms cubic-bezier(0.16, 1, 0.3, 1), border-left-color 300ms ease",
              }}
            >
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a1a1aa", fontSize: "13px" }}>
                  <span className="w-3.5 h-3.5 border-2 border-[#5AA2FF] border-t-transparent rounded-full animate-spin" />
                  <span>Mencari lirik lagu...</span>
                </div>
              ) : lyrics.length > 0 ? (
                <>
                  <div style={{ fontSize: "21px", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.015em", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentLine || "♪ Musik Berjalan ♪"}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {nextLine1 || "• • •"}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {nextLine2 || "• • •"}
                  </div>
                </>
              ) : plainLines.length > 0 ? (
                <>
                  <div style={{ fontSize: "21px", fontWeight: 700, lineHeight: 1.25, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {plainLines[plainIndex] || "♪ Musik Berjalan ♪"}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {plainLines[plainIndex + 1] || "• • •"}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {plainLines[plainIndex + 2] || "• • •"}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>Lirik tidak ditemukan</div>
                  <div style={{ fontSize: "12px", color: "#8a8a93" }}>Memutar audio SMTC Windows</div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1: POMODORO TIMER (Matching 460x225px)
          ══════════════════════════════════════════════════════════════════ */}
      {currentPage === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", flex: 1, minHeight: 0, justifyContent: "space-between" }} className="animate-in fade-in duration-200">
          {/* Header Row: Date & Time Center, Session Dots Right */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: "18px" }}>
            <div style={{ flex: 1 }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <HeaderBatteryDonut battery={battery} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>{dateStr}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px" }} role="img" aria-label="Sesi Pomodoro">
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#5AA2FF" }} />
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#5AA2FF" }} />
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
            </div>
          </div>

          {/* Middle Row: Left Circular Ring 68x68 + Center Countdown 44px + Reset */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div style={{ width: "95px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>Pomodoro</div>
              <div style={{ position: "relative", width: "68px", height: "68px" }}>
                <svg width="68" height="68" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                  <circle cx="50" cy="50" r={pomodoroRadius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="50" cy="50" r={pomodoroRadius} stroke="#5AA2FF" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pomodoroDash} ${pomodoroCircumference.toFixed(1)}`} transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: "absolute", left: 0, top: 0, width: "68px", height: "68px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 2h4M12 2v3" />
                    <circle cx="12" cy="14" r="8" />
                    <path d="M12 14l3-3" />
                  </svg>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ fontSize: "44px", fontWeight: 600, lineHeight: 1.05, color: "#ffffff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
                  {pomodoro.timeFormatted}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    pomodoro.reset();
                  }}
                  aria-label="Reset timer"
                  style={{ position: "absolute", left: "100%", marginLeft: "10px", width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer" }}
                  className="hover:bg-white/15 active:scale-90 transition"
                  title="Reset Timer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
                    <path d="M4 4v4.5h4.5" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#a1a1aa" }}>
                {pomodoro.mode === "focus" ? "Waktu fokus" : "Waktu istirahat"}
              </div>
            </div>

            <div style={{ width: "95px" }} />
          </div>

          {/* Bottom Actions: Istirahat Pill + Play/Pause Pill + Fokus Pill */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                pomodoro.setMode("break");
              }}
              style={{
                height: "36px",
                boxSizing: "border-box",
                padding: "0 14px 0 11px",
                borderRadius: "999px",
                border: pomodoro.mode === "break" ? "1px solid #5AA2FF" : "none",
                background: pomodoro.mode === "break" ? "rgba(90,162,255,0.16)" : "rgba(255,255,255,0.07)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: pomodoro.mode === "break" ? "#ffffff" : "#e4e4e7",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              className="active:scale-95 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
                <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M8 3v2.5M12 3v2.5" />
              </svg>
              Istirahat
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                pomodoro.togglePlayPause();
              }}
              style={{
                width: "56px",
                height: "38px",
                borderRadius: "999px",
                border: "none",
                background: "#5AA2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                boxShadow: "0 6px 18px rgba(90,162,255,0.3)",
                cursor: "pointer",
              }}
              className="active:scale-95 transition"
              title={pomodoro.isRunning ? "Pause Pomodoro" : "Mulai Pomodoro"}
            >
              {pomodoro.isRunning ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#07101f" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1.2" />
                  <rect x="14" y="5" width="4" height="14" rx="1.2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#07101f" aria-hidden="true" style={{ marginLeft: "2px" }}>
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                </svg>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                pomodoro.setMode("focus");
              }}
              style={{
                height: "36px",
                boxSizing: "border-box",
                padding: "0 14px 0 11px",
                borderRadius: "999px",
                border: pomodoro.mode === "focus" ? "1px solid #5AA2FF" : "none",
                background: pomodoro.mode === "focus" ? "rgba(90,162,255,0.16)" : "rgba(255,255,255,0.07)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: pomodoro.mode === "focus" ? "#ffffff" : "#e4e4e7",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              className="active:scale-95 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
              </svg>
              Fokus
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2: TO-DO LIST (Matching 460x225px)
          ══════════════════════════════════════════════════════════════════ */}
      {currentPage === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", flex: 1, minHeight: 0, justifyContent: "space-between" }} className="animate-in fade-in duration-200">
          {/* Header Row */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: "18px" }}>
            <div style={{ flex: 1 }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <HeaderBatteryDonut battery={battery} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>{dateStr}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ padding: "3px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", fontSize: "11px", fontWeight: 600, color: "#d4d4d8" }}>
                {todoList.remainingCount} tersisa
              </div>
            </div>
          </div>

          {/* Middle Body */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: "16px", flex: 1, minHeight: 0 }}>
            {/* Left Column (140px) */}
            <div style={{ width: "140px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>To-do</div>
              <div style={{ fontSize: "40px", fontWeight: 600, lineHeight: 1.05, color: "#ffffff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
                {todoList.completedCount}/{todoList.totalCount}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#a1a1aa" }}>Tugas selesai hari ini</div>

              <div style={{ display: "flex", flexDirection: "row", gap: "6px", paddingTop: "6px" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingTodo(true);
                  }}
                  style={{ height: "30px", boxSizing: "border-box", padding: "0 10px 0 8px", borderRadius: "999px", border: "none", background: "rgba(90,162,255,0.16)", display: "inline-flex", alignItems: "center", gap: "4px", color: "#ffffff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  className="active:scale-95 transition"
                  title="Tambah tugas"
                >
                  <Plus className="w-3.5 h-3.5 text-[#5AA2FF]" />
                  <span>Tambah</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    todoList.setIsEditing(!todoList.isEditing);
                  }}
                  style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: todoList.isEditing ? "rgba(90,162,255,0.25)" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer", color: todoList.isEditing ? "#5AA2FF" : "#e4e4e7" }}
                  className="active:scale-95 transition"
                  title="Kelola tugas"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Task List Column */}
            <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "row", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", maxHeight: "115px" }}>
                {isAddingTodo && (
                  <div style={{ padding: "6px 10px", borderRadius: "12px", background: "rgba(90,162,255,0.12)", border: "1px solid rgba(90,162,255,0.25)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <input
                      type="text"
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      placeholder="Nama tugas..."
                      autoFocus
                      style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#ffffff" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <input
                        type="text"
                        value={newTodoSchedule}
                        onChange={(e) => setNewTodoSchedule(e.target.value)}
                        placeholder="Jadwal (e.g. 19.00 - 20.00)"
                        style={{ background: "transparent", border: "none", outline: "none", fontSize: "10px", color: "#a1a1aa" }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (newTodoTitle.trim()) {
                              todoList.addTodo(newTodoTitle, newTodoSchedule || undefined);
                              setNewTodoTitle("");
                              setNewTodoSchedule("");
                              setIsAddingTodo(false);
                            }
                          }}
                          style={{ fontSize: "11px", fontWeight: 700, color: "#5AA2FF", padding: "1px 6px", background: "rgba(90,162,255,0.15)", borderRadius: "4px" }}
                        >
                          Simpan
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddingTodo(false);
                          }}
                          style={{ fontSize: "11px", color: "#a1a1aa" }}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {todoList.todos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      todoList.toggleTodo(todo.id);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "10px",
                      height: "36px",
                      boxSizing: "border-box",
                      padding: "0 10px",
                      borderRadius: "10px",
                      background: todo.completed ? "rgba(90,162,255,0.14)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                    }}
                    className="hover:bg-white/10 transition"
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        flexShrink: 0,
                        borderRadius: "50%",
                        background: todo.completed ? "#5AA2FF" : "transparent",
                        border: todo.completed ? "none" : "1.8px solid rgba(255,255,255,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {todo.completed && <Check className="w-3 h-3 text-[#07101f] stroke-[3.2]" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: todo.completed ? "#a1a1aa" : "#ffffff",
                          textDecoration: todo.completed ? "line-through" : "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {todo.title}
                      </div>
                      {todo.timeSchedule && (
                        <div style={{ fontSize: "10px", fontWeight: 500, color: "#a1a1aa", fontVariantNumeric: "tabular-nums" }}>
                          {todo.timeSchedule}
                        </div>
                      )}
                    </div>

                    {todoList.isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          todoList.deleteTodo(todo.id);
                        }}
                        className="text-neutral-500 hover:text-rose-400 p-0.5"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Custom Scrollbar */}
              <div style={{ width: "3px", alignSelf: "stretch", margin: "2px 0", borderRadius: "1.5px", background: "rgba(255,255,255,0.12)" }} aria-hidden="true">
                <div style={{ width: "3px", height: "62%", borderRadius: "1.5px", background: "rgba(255,255,255,0.7)" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3: HARDWARE MONITOR (Matching 460x225px)
          ══════════════════════════════════════════════════════════════════ */}
      {currentPage === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", flex: 1, minHeight: 0, justifyContent: "space-between" }} className="animate-in fade-in duration-200">
          {/* Header Row */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {timeStr}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#a1a1aa" }}>
                {dateStr}
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: battery.isCharging ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.07)",
                border: battery.isCharging ? "1px solid rgba(48,209,88,0.3)" : "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {battery.isCharging ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#30D158" aria-hidden="true" className="animate-pulse">
                  <path d="M13.5 2.5L5.5 13.2a.6.6 0 0 0 .5.95H10.5l-1 7.35a.4.4 0 0 0 .72.28l8.1-10.9a.6.6 0 0 0-.48-.96H13.3l.9-7.1a.4.4 0 0 0-.7-.32z" />
                </svg>
              ) : (
                <svg width="18" height="10" viewBox="0 0 20 12" fill="none" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="16" height="11" rx="3" stroke="#a1a1aa" />
                  <rect x="2" y="2" width={`${Math.min(10.5, (battery.level / 100) * 10.5)}`} height="8" rx="1.8" fill="#5AA2FF" />
                  <rect x="17.5" y="4" width="2" height="4" rx="1" fill="#a1a1aa" />
                </svg>
              )}
              <span className={battery.isCharging ? "text-[#30D158]" : ""}>{battery.level}%</span>
            </div>
          </div>

          {/* 3 Circular Gauge Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
            {/* CPU */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "12px 6px 10px 6px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ position: "relative", width: "62px", height: "62px" }}>
                <svg width="62" height="62" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                  <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" stroke="#5AA2FF" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${((stats.cpuPercent / 100) * 188.5).toFixed(1)} 188.5`} transform="rotate(-90 40 40)" />
                </svg>
                <div style={{ position: "absolute", left: 0, top: 0, width: "62px", height: "62px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {stats.cpuPercent}%
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>CPU</div>
                <div style={{ fontSize: "10px", fontWeight: 500, color: "#a1a1aa" }}>Live</div>
              </div>
            </div>

            {/* RAM */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "12px 6px 10px 6px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ position: "relative", width: "62px", height: "62px" }}>
                <svg width="62" height="62" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                  <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" stroke="#7FB7FF" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${((stats.ramPercent / 100) * 188.5).toFixed(1)} 188.5`} transform="rotate(-90 40 40)" />
                </svg>
                <div style={{ position: "absolute", left: 0, top: 0, width: "62px", height: "62px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {stats.ramPercent}%
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>RAM</div>
                <div style={{ fontSize: "10px", fontWeight: 500, color: "#a1a1aa" }}>{stats.ramUsedGb} / {stats.ramTotalGb} GB</div>
              </div>
            </div>

            {/* DISK C: */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "12px 6px 10px 6px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ position: "relative", width: "62px", height: "62px" }}>
                <svg width="62" height="62" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                  <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" stroke="#64D2FF" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${((stats.diskPercent / 100) * 188.5).toFixed(1)} 188.5`} transform="rotate(-90 40 40)" />
                </svg>
                <div style={{ position: "absolute", left: 0, top: 0, width: "62px", height: "62px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {stats.diskPercent}%
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>Disk C:</div>
                <div style={{ fontSize: "10px", fontWeight: 500, color: "#a1a1aa" }}>{stats.diskUsedGb} / {stats.diskTotalGb} GB</div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#d4d4d8" }}>
              <Activity className="w-3.5 h-3.5 text-[#5AA2FF]" />
              <span>Normal</span>
            </div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8a8a93", letterSpacing: "0.1em" }}>{username}</div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM PAGINATION DOTS (Completely isolated, zero overlap) ─── */}
      {!isLyricsOpen && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "6px",
            width: "100%",
            height: "14px",
            marginTop: "6px",
            zIndex: 10,
          }}
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isActive = currentPage === idx;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage(idx);
                }}
                style={{
                  width: isActive ? "16px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: isActive ? "#ffffff" : "rgba(255,255,255,0.25)",
                  transition: "all 0.25s ease-out",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
                aria-label={`Halaman ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
