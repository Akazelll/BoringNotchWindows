import React from "react";
import { CallInfo } from "../types";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  MessageCircle,
  Gamepad2,
  User,
} from "lucide-react";

interface CallExpandedCardProps {
  call: CallInfo;
  username?: string;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export const CallExpandedCard: React.FC<CallExpandedCardProps> = ({
  call,
  username = "User",
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
}) => {
  const isIncoming = call.state === "incoming";
  const isActive = call.state === "active";

  const getAppLabel = () => {
    switch (call.appSource) {
      case "whatsapp":
        return "WhatsApp Voice Call";
      case "discord":
        return "Discord Voice Call";
      case "telegram":
        return "Telegram Call";
      case "teams":
        return "Microsoft Teams";
      default:
        return "Incoming Voice Call";
    }
  };

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
      <div className="w-full h-full flex flex-col justify-between p-3 text-white box-border select-none bg-[#000000]">
        {/* Top: Caller Info with animated avatar */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center flex-shrink-0 shadow-lg border border-emerald-500/30">
            <User className="w-6 h-6 text-white" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <Phone className="w-2.5 h-2.5 text-black fill-current" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-[#000000] border border-white/20 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 tracking-wider uppercase mb-0.5">
              {getAppIcon()}
              <span>{getAppLabel()}</span>
            </div>
            <h3 className="text-base font-bold truncate text-white leading-tight">
              {call.callerName}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {call.callerNumber || "Panggilan suara masuk..."}
            </p>
          </div>
        </div>

        {/* Middle: Sound wave ringing animation */}
        <div className="flex items-center justify-center gap-1 h-6 my-1">
          <span className="w-1 bg-emerald-400 rounded-full h-3 animate-pulse" />
          <span className="w-1 bg-emerald-400 rounded-full h-5 animate-pulse delay-75" />
          <span className="w-1 bg-emerald-400 rounded-full h-4 animate-pulse delay-150" />
          <span className="w-1 bg-emerald-400 rounded-full h-6 animate-pulse delay-100" />
          <span className="w-1 bg-emerald-400 rounded-full h-3 animate-pulse delay-200" />
        </div>

        {/* Bottom Row: Large Decline & Accept Action Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <div className="text-[10px] text-neutral-500">Geser / Klik untuk merespon</div>

          <div className="flex items-center gap-4">
            {/* Decline (Red) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDecline();
              }}
              className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-md"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Tolak</span>
            </button>

            {/* Accept (Green) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAccept();
              }}
              className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-md animate-pulse"
            >
              <Phone className="w-4 h-4" />
              <span>Terima</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-400 font-semibold">{username}</div>
        </div>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-3 text-white box-border select-none bg-[#000000]">
        {/* Header Row: Caller Avatar, Name, App Source */}
        <div className="flex items-center justify-between pb-1 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="leading-tight">
              <h3 className="text-sm font-bold text-white tracking-tight">{call.callerName}</h3>
              <p className="text-[10px] text-emerald-400 font-medium">{getAppLabel()}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#000000] border border-white/20 rounded-full px-2.5 py-0.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-neutral-400 font-medium">Terhubung</span>
          </div>
        </div>

        {/* Center: Live Large Duration Timer Display */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="text-2xl font-bold font-mono text-white tracking-wider drop-shadow-sm">
            {formatDuration(call.durationSec)}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {call.isMuted ? "Mikrofon Dimatikan (Muted)" : "Panggilan Suara Aktif"}
          </p>
        </div>

        {/* Bottom Control Actions: Mute, Red End Call, Speaker */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          {/* Mute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer active:scale-95 ${
              call.isMuted
                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                : "bg-[#000000] text-neutral-300 border-white/20 hover:border-white/40"
            }`}
            title={call.isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
          >
            {call.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{call.isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Center End Call Button (Prominent Red) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-lg shadow-rose-950"
            title="Akhiri Panggilan"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          {/* Right: Windows Username */}
          <div className="text-[10px] text-neutral-400 font-semibold">{username}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-white select-none bg-[#000000]">
      <PhoneOff className="w-7 h-7 text-neutral-500 mb-1" />
      <span className="text-sm font-bold text-neutral-300">Panggilan Berakhir</span>
    </div>
  );
};
