import React from "react";
import { CallInfo } from "../types";
import { Phone, PhoneOff, MessageCircle, Gamepad2 } from "lucide-react";

interface CallCompactPillProps {
  call: CallInfo;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export const CallCompactPill: React.FC<CallCompactPillProps> = ({
  call,
  onAccept,
  onDecline,
  onEnd,
}) => {
  const isIncoming = call.state === "incoming";
  const isActive = call.state === "active";

  // App logo helper
  const getAppIcon = () => {
    if (call.appSource === "whatsapp") {
      return <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-current" />;
    }
    if (call.appSource === "discord") {
      return <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />;
    }
    return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
  };

  if (isIncoming) {
    return (
      <div className="w-full h-full flex items-center justify-between px-3 text-white select-none bg-transparent animate-in fade-in duration-200">
        {/* Left: Caller info with ringing icon */}
        <div className="flex items-center gap-2 min-w-0 max-w-[170px]">
          <div className="relative w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            {getAppIcon()}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div className="flex flex-col min-w-0 leading-tight justify-center">
            <span className="text-[11px] font-bold truncate text-white tracking-tight">
              {call.callerName}
            </span>
            <span className="text-[9px] text-emerald-400 font-medium truncate">
              Panggilan Masuk...
            </span>
          </div>
        </div>

        {/* Right: Accept & Decline Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Decline (Red) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDecline();
            }}
            className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm"
            title="Tolak Panggilan"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>

          {/* Accept (Green) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm animate-pulse"
            title="Terima Panggilan"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="w-full h-full flex items-center justify-between px-3 text-white select-none bg-transparent">
        {/* Left: Caller info */}
        <div className="flex items-center gap-2 min-w-0 max-w-[150px]">
          <div className="w-6 h-6 rounded-full bg-[#16181f] border border-white/20 flex items-center justify-center flex-shrink-0">
            {getAppIcon()}
          </div>
          <span className="text-[11px] font-bold truncate text-white tracking-tight">
            {call.callerName}
          </span>
        </div>

        {/* Center: Live Call Duration Ticker */}
        <div className="flex items-center gap-1.5 font-mono text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{formatDuration(call.durationSec)}</span>
        </div>

        {/* Right: End Call Button */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm"
            title="Akhiri Panggilan"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400 bg-transparent">
      <span>Panggilan Berakhir</span>
    </div>
  );
};
