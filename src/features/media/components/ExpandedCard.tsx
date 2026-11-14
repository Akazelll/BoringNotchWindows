import React, { useState } from "react";
import { MediaInfo, BatteryInfo } from "../../../shared/types";
import { isInvalidArtist, type LyricsHookResult } from "../hooks/useLyrics";
import { useAmbientColor } from "../hooks/useAmbientColor";
import { useLyricsView } from "../hooks/useLyricsView";
import { getAccentColor } from "../lib/accentColor";
import { useClock } from "../../../shared/hooks/useClock";
import type { PomodoroController } from "../../pomodoro";
import type { PrayerController } from "../../prayer";
import { useTodoList } from "../../todo";
import type { WeatherController } from "../../weather";
import { PageMusicPlayer } from "./pages/PageMusicPlayer";
import { PagePomodoro } from "./pages/PagePomodoro";
import { PageTodoList } from "./pages/PageTodoList";
import { PageWeather } from "./pages/PageWeather";
import { PagePrayer } from "./pages/PagePrayer";
import { NotchChevrons } from "./pages/NotchChevrons";
import { PageDots } from "./pages/PageDots";

interface ExpandedCardProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  isLyricsOpen: boolean;
  onToggleLyrics: () => void;
  pomodoro: PomodoroController;
  prayer: PrayerController;
  weather: WeatherController;
  lyricsData: LyricsHookResult;
}

export const ExpandedCard: React.FC<ExpandedCardProps> = ({
  media,
  battery,
  onPlayPause,
  onNext,
  onPrev,
  isLyricsOpen,
  onToggleLyrics,
  pomodoro,
  prayer,
  weather,
  lyricsData,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const { dateStr, timeStr } = useClock();
  const ambientColor = useAmbientColor(media?.thumbnail);
  const { accentHex, vr, vg, vb } = getAccentColor(ambientColor);

  const { lyrics, isLoading, cleanTitle, cleanArtist } = lyricsData;
  const { currentLine, nextLine1, nextLine2, plainLines, plainIndex } = useLyricsView(lyricsData, media);
  const todoList = useTodoList();

  const [isAddingTodo, setIsAddingTodo] = useState<boolean>(false);
  const [newTodoTitle, setNewTodoTitle] = useState<string>("");
  const [newTodoSchedule, setNewTodoSchedule] = useState<string>("");

  const displayTitle = cleanTitle || media?.title || "Belum ada media";
  const displayArtist = cleanArtist || (media?.artist && !isInvalidArtist(media.artist) ? media.artist : "Windows Audio");

  const totalPages = 5;
  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };
  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };


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
          <NotchChevrons onPrev={handlePrevPage} onNext={handleNextPage} />
        )}

        {currentPage === 0 && (
        <PageMusicPlayer
          media={media}
          battery={battery}
          isLyricsOpen={isLyricsOpen}
          displayTitle={displayTitle}
          displayArtist={displayArtist}
          dateStr={dateStr}
          timeStr={timeStr}
          lyrics={lyrics}
          isLoading={isLoading}
          currentLine={currentLine}
          nextLine1={nextLine1}
          nextLine2={nextLine2}
          plainLines={plainLines}
          plainIndex={plainIndex}
          accentHex={accentHex}
          onPlayPause={onPlayPause}
          onNext={onNext}
          onPrev={onPrev}
          onToggleLyrics={onToggleLyrics}
        />
        )}

        {currentPage === 1 && (
        <PagePomodoro
          battery={battery}
          dateStr={dateStr}
          timeStr={timeStr}
          pomodoro={pomodoro}
        />
        )}

        {currentPage === 2 && (
        <PageTodoList
          battery={battery}
          dateStr={dateStr}
          timeStr={timeStr}
          todoList={todoList}
          isAddingTodo={isAddingTodo}
          setIsAddingTodo={setIsAddingTodo}
          newTodoTitle={newTodoTitle}
          setNewTodoTitle={setNewTodoTitle}
          newTodoSchedule={newTodoSchedule}
          setNewTodoSchedule={setNewTodoSchedule}
        />
        )}

        {currentPage === 3 && (
          <PageWeather
            battery={battery}
            dateStr={dateStr}
            timeStr={timeStr}
            weather={weather}
          />
        )}

        {currentPage === 4 && (
          <PagePrayer
            battery={battery}
            dateStr={dateStr}
            timeStr={timeStr}
            prayer={prayer}
          />
        )}

      {/* ─── BOTTOM PAGINATION DOTS (Completely isolated, zero overlap) ─── */}
      {!isLyricsOpen && (
        <PageDots
          currentPage={currentPage}
          totalPages={totalPages}
          onSelect={setCurrentPage}
        />
      )}
      </div>
    </div>
  );
};
