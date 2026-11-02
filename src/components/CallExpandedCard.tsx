import React from "react";
import { CallInfo } from "../types";
import { Mic, MicOff, PhoneOff } from "lucide-react";

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

function getInitials(name: string): string {
  if (!name) return "AP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAppHeader(appSource: string): string {
  const s = (appSource || "").toLowerCase();
  if (s.includes("whatsapp")) return "WhatsApp · Panggilan suara";
  if (s.includes("telegram")) return "Telegram · Panggilan suara";
  if (s.includes("discord")) return "Discord · Panggilan suara";
  if (s.includes("teams")) return "Teams · Panggilan suara";
  return "Telepon · Panggilan suara";
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

  const initials = getInitials(call.callerName);
  const appHeader = getAppHeader(call.appSource);
  const callerDetail = call.callerNumber
    ? (call.callerNumber.startsWith("+") || call.callerNumber.startsWith("08")
        ? `Seluler · ${call.callerNumber}`
        : call.callerNumber)
    : "Seluler · +62 812-3456-7890";

  // ═══ 1. INCOMING CALL (460x225px) ═══
  if (isIncoming) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: "18px 24px 14px 24px",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
        }}
        className="animate-in fade-in duration-200 select-none"
      >
        {/* Top Info Row: Caller Avatar + Text Info + Soundwave */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "14px" }}>
          {/* Avatar with Ring & Telephone Badge */}
          <div style={{ position: "relative", width: "56px", height: "56px", flexShrink: 0 }}>
            <div
              style={{
                position: "relative",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(145deg, #3a3f4b 0%, #1d2028 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: 600, color: "#e4e4e7", letterSpacing: "-0.01em" }}>
                {initials}
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                right: "-2px",
                bottom: "-2px",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "#30D158",
                border: "2px solid #09090b",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#04210d" aria-hidden="true">
                <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
              </svg>
            </div>
          </div>

          {/* Caller Text Detail */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#30D158" }}>
              {appHeader}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.15, color: "#ffffff", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {call.callerName || "Andi Pratama"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>
              {callerDetail}
            </div>
          </div>

          {/* Green Soundwave Equalizer */}
          <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "28px", flexShrink: 0 }} aria-hidden="true">
            <div style={{ width: "3.5px", borderRadius: "2px", background: "#30D158", height: "12px" }} className="animate-sound-bar-1" />
            <div style={{ width: "3.5px", borderRadius: "2px", background: "#30D158", height: "22px" }} className="animate-sound-bar-2" />
            <div style={{ width: "3.5px", borderRadius: "2px", background: "#30D158", height: "15px" }} className="animate-sound-bar-3" />
            <div style={{ width: "3.5px", borderRadius: "2px", background: "#30D158", height: "20px" }} className="animate-sound-bar-4" />
            <div style={{ width: "3.5px", borderRadius: "2px", background: "#30D158", height: "10px" }} className="animate-sound-bar-1" />
          </div>
        </div>

        {/* Action Buttons: Tolak & Terima Pills (46px height) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: "12px" }}>
            {/* Tolak Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDecline();
              }}
              style={{
                flex: 1,
                height: "46px",
                borderRadius: "999px",
                border: "none",
                background: "#FF453A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: 0,
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                boxShadow: "0 6px 18px rgba(255,69,58,0.25)",
                cursor: "pointer",
              }}
              className="active:scale-95 transition-all duration-150"
              aria-label="Tolak panggilan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
                <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
              </svg>
              Tolak
            </button>

            {/* Terima Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAccept();
              }}
              style={{
                flex: 1,
                height: "46px",
                borderRadius: "999px",
                border: "none",
                background: "#30D158",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: 0,
                color: "#04210d",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                boxShadow: "0 6px 18px rgba(48,209,88,0.25)",
                cursor: "pointer",
              }}
              className="active:scale-95 transition-all duration-150"
              aria-label="Terima panggilan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#04210d" aria-hidden="true">
                <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
              </svg>
              Terima
            </button>
          </div>

          {/* Footer Hint */}
          <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 500, color: "#8a8a93" }}>
            Klik untuk merespons
          </div>
        </div>
      </div>
    );
  }

  // ═══ 2. ACTIVE CALL (Ongoing Call UI) ═══
  if (isActive) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: "20px 24px 16px 24px",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
        }}
        className="animate-in fade-in duration-200 select-none"
      >
        {/* Header Row: Caller Avatar, Name, App Source */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(145deg, #3a3f4b 0%, #1d2028 100%)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>{initials}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>{call.callerName}</h3>
              <p style={{ fontSize: "11px", color: "#30D158", fontWeight: 600 }}>{appHeader}</p>
            </div>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", padding: "4px 12px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#30D158" }} className="animate-pulse" />
            <span style={{ fontSize: "11px", color: "#d4d4d8", fontWeight: 500 }}>Terhubung</span>
          </div>
        </div>

        {/* Center: Live Large Duration Timer Display */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
          <div style={{ fontSize: "36px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#ffffff", letterSpacing: "-0.02em" }}>
            {formatDuration(call.durationSec)}
          </div>
          <p style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "1px" }}>
            {call.isMuted ? "Mikrofon Dimatikan (Muted)" : "Panggilan Suara Aktif"}
          </p>
        </div>

        {/* Bottom Control Actions: Mute, Red End Call Pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 14px",
              height: "38px",
              borderRadius: "999px",
              border: call.isMuted ? "1px solid rgba(255,69,58,0.4)" : "1px solid rgba(255,255,255,0.12)",
              background: call.isMuted ? "rgba(255,69,58,0.16)" : "rgba(255,255,255,0.08)",
              color: call.isMuted ? "#FF453A" : "#e4e4e7",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title={call.isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
          >
            {call.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{call.isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* End Call Button Pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            style={{
              height: "38px",
              padding: "0 22px",
              borderRadius: "999px",
              background: "#FF453A",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(255,69,58,0.3)",
              border: "none",
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title="Akhiri Panggilan"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Akhiri</span>
          </button>

          <div style={{ fontSize: "11px", color: "#8a8a93", fontWeight: 600, letterSpacing: "0.08em" }}>{username}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a1a1aa" }}>
      <PhoneOff className="w-8 h-8 text-neutral-500 mb-2" />
      <span style={{ fontSize: "15px", fontWeight: 600, color: "#d4d4d8" }}>Panggilan Berakhir</span>
    </div>
  );
};
