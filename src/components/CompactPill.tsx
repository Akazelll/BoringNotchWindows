import React, { useState, useEffect } from "react";
import { MediaInfo, BatteryInfo, AppNotification, SystemStats } from "../types";
import { Visualizer } from "./Visualizer";
import { CircularProgress, CustomBatteryPill } from "./CircularProgress";
import { AppSourceBadge } from "./AppSourceBadge";
import {
  Music,
  Clock,
  MessageCircle,
  Globe,
  Gamepad2,
  Send,
  Bell,
  X,
} from "lucide-react";

interface CompactPillProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  stats: SystemStats;
  currentToast: AppNotification | null;
  onDismissToast?: () => void;
}

function getAppNotificationIcon(appType: string) {
  switch (appType) {
    case "whatsapp":
      return <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-current" />;
    case "discord":
      return <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />;
    case "chrome":
      return <Globe className="w-3.5 h-3.5 text-amber-400" />;
    case "telegram":
      return <Send className="w-3.5 h-3.5 text-sky-400" />;
    case "spotify":
      return <Music className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return <Bell className="w-3.5 h-3.5 text-[#38bdf8]" />;
  }
}

export const CompactPill: React.FC<CompactPillProps> = ({
  media,
  battery,
  stats,
  currentToast,
  onDismissToast,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hours}.${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Temporary Notification Toast Mode (Overlays the pill for a few seconds)
  // Layout: App Icon (Kiri), Pengirim (Atas Tengah), Pesan (Bawah Tengah)
  if (currentToast) {
    return (
      <div className="w-full h-full flex items-center justify-between px-3.5 text-white select-none bg-transparent animate-in fade-in duration-200">
        <div className="flex items-center gap-3 min-w-0 flex-1 pl-0.5">
          {/* KIRI: Ikon Aplikasi */}
          <div className="relative w-7 h-7 rounded-full flex items-center justify-center bg-[#181a20] border border-white/20 flex-shrink-0 shadow-sm">
            {getAppNotificationIcon(currentToast.appType)}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#38bdf8] rounded-full animate-ping" />
          </div>

          {/* TENGAH: Pengirim (Atas) & Pesan (Bawah) */}
          <div className="flex flex-col min-w-0 justify-center leading-tight flex-1">
            {currentToast.title && currentToast.message ? (
              <>
                <span className="text-[11px] font-bold truncate text-white tracking-tight">
                  {currentToast.title}
                </span>
                <span className="text-[10px] font-normal truncate text-[#8e94a4]">
                  {currentToast.message}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-semibold text-[#8e94a4] tracking-tight">
                  {currentToast.appName}
                </span>
                <span className="text-[11px] font-medium truncate text-white">
                  {currentToast.title || currentToast.message || "Notifikasi baru masuk"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* KANAN: Tombol Dismiss X */}
        <div className="flex items-center gap-2 flex-shrink-0 pl-1">
          <span className="text-[9px] font-semibold text-neutral-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
            Baru
          </span>
          {onDismissToast && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissToast();
              }}
              className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Normal Activity Mode
  return (
    <div className="w-full h-full flex items-center justify-between px-3.5 text-white select-none bg-transparent">
      {media ? (
        /* Media Mode: Cover + Title + Artist + Visualizer + App Source Icon (NO BATTERY) */
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5 max-w-[260px] overflow-hidden">
            {media.thumbnail ? (
              <div className="relative w-7 h-7 rounded-[7px] overflow-hidden flex-shrink-0 border border-white/20 shadow-sm bg-[#000000]">
                <img
                  src={media.thumbnail}
                  alt="cover"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-[7px] bg-[#000000] border border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Music className="w-3.5 h-3.5 text-white" />
              </div>
            )}

            <div className="flex flex-col min-w-0 max-w-[190px] justify-center leading-tight">
              <span className="text-[12px] font-bold truncate text-white tracking-tight">
                {media.title}
              </span>
              <span className="text-[10px] font-medium truncate text-neutral-400">
                {media.artist || "Windows Audio"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Visualizer isPlaying={media.isPlaying} />
            {/* Replace battery with App Source Badge (Spotify, YouTube, etc.) */}
            <AppSourceBadge sourceApp={media.sourceApp} />
          </div>
        </div>
      ) : (
        /* Standby / Idle Mode: Clock + CPU Pill + RAM Pill + Battery Pill */
        <div className="flex items-center justify-between w-full">
          {/* Left: Clock Icon + Time (e.g. 14.06) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock className="w-4 h-4 text-white stroke-[1.75]" />
            <span className="text-sm font-bold tracking-tight text-white leading-none">
              {timeStr}
            </span>
          </div>

          {/* Center: CPU & RAM Capsule Pills with Mini Progress Rings */}
          <div className="flex items-center gap-2">
            {/* CPU Capsule */}
            <div className="flex items-center gap-2 bg-[#181a20] border border-white/[0.08] rounded-full px-2.5 py-1 shadow-inner">
              <CircularProgress
                percent={stats.cpuPercent}
                size={14}
                strokeWidth={2.5}
                strokeColor="#38bdf8"
                trackColor="#262936"
              />
              <span className="text-[10px] font-semibold text-[#8e94a4]">CPU</span>
              <span className="text-[11px] font-bold text-white tracking-tight font-mono">
                {stats.cpuPercent}%
              </span>
            </div>

            {/* RAM Capsule */}
            <div className="flex items-center gap-2 bg-[#181a20] border border-white/[0.08] rounded-full px-2.5 py-1 shadow-inner">
              <CircularProgress
                percent={stats.ramPercent}
                size={14}
                strokeWidth={2.5}
                strokeColor="#38bdf8"
                trackColor="#262936"
              />
              <span className="text-[10px] font-semibold text-[#8e94a4]">RAM</span>
              <span className="text-[11px] font-bold text-white tracking-tight font-mono">
                {stats.ramPercent}%
              </span>
            </div>
          </div>

          {/* Right: Custom Blue-Filled Battery Capsule (Only in Standby) */}
          <CustomBatteryPill level={battery.level} isCharging={battery.isCharging} />
        </div>
      )}
    </div>
  );
};
