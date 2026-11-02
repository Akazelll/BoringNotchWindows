import React, { useState } from "react";
import { CallInfo } from "../types";

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
  username: _username = "User",
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
}) => {
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const isIncoming = call.state === "incoming";
  const initials = getInitials(call.callerName);
  const appHeader = getAppHeader(call.appSource);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "24px 28px 24px 28px",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="animate-in fade-in duration-200 select-none"
    >
      {/* ─── 1. TOP ROW: AVATAR + CALLER DETAIL + STATUS PILL ─── */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "14px" }}>
        {/* Avatar 48x48px with Initials */}
        <div
          style={{
            width: "48px",
            height: "48px",
            flexShrink: 0,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #3a3f4b 0%, #1d2028 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "17px",
            fontWeight: 600,
            color: "#e4e4e7",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
          }}
          aria-hidden="true"
        >
          {initials}
        </div>

        {/* Caller Name & Subtitle */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1.2,
              color: "#ffffff",
              letterSpacing: "-0.015em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {call.callerName || "Andi Pratama"}
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#30D158",
            }}
          >
            {appHeader}
          </div>
        </div>

        {/* Status Pill: Terhubung (Active) or Memanggil (Incoming) */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            height: "30px",
            boxSizing: "border-box",
            padding: "0 13px 0 11px",
            borderRadius: "999px",
            background: "rgba(48,209,88,0.16)",
            fontSize: "13px",
            fontWeight: 600,
            color: "#30D158",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#30D158",
            }}
            className="animate-pulse"
            aria-hidden="true"
          />
          <span>{isIncoming ? "Memanggil..." : "Terhubung"}</span>
        </div>
      </div>

      {/* ─── 2. CENTER SECTION: GIANT 60PX DURATION DISPLAY + SUBTEXT ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          padding: "14px 0 12px 0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: "60px",
            fontWeight: 600,
            lineHeight: 1.05,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isIncoming ? "00:00" : formatDuration(call.durationSec)}
        </div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>
          {isIncoming
            ? "Panggilan suara masuk"
            : call.isMuted
            ? "Mikrofon dimatikan"
            : "Panggilan suara aktif"}
        </div>
      </div>

      {/* ─── 3. BOTTOM SECTION: 56PX ACTION BUTTONS ─── */}
      {isIncoming ? (
        /* INCOMING CALL BUTTONS: Tolak (56px bulat merah) + Terima (210px pill hijau) */
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          {/* Tolak Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDecline();
            }}
            aria-label="Tolak panggilan"
            style={{
              width: "56px",
              height: "56px",
              flexShrink: 0,
              borderRadius: "50%",
              border: "none",
              background: "#FF453A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              boxShadow: "0 8px 24px rgba(255,69,58,0.32)",
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title="Tolak Panggilan"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
            </svg>
          </button>

          {/* Terima Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            aria-label="Terima panggilan"
            style={{
              flex: "0 0 210px",
              height: "56px",
              borderRadius: "999px",
              border: "none",
              background: "#30D158",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: 0,
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              boxShadow: "0 8px 24px rgba(48,209,88,0.32)",
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title="Terima Panggilan"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
            </svg>
            Terima
          </button>
        </div>
      ) : (
        /* ACTIVE CALL BUTTONS: Bisukan (56px) + Akhiri (190px pill merah) + Speaker (56px) */
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          {/* Mute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-label={call.isMuted ? "Aktifkan mikrofon" : "Bisukan mikrofon"}
            style={{
              width: "56px",
              height: "56px",
              flexShrink: 0,
              borderRadius: "50%",
              border: call.isMuted ? "1px solid rgba(255,69,58,0.4)" : "none",
              background: call.isMuted ? "rgba(255,69,58,0.2)" : "rgba(255,255,255,0.09)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title={call.isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={call.isMuted ? "#FF453A" : "#ffffff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
          </button>

          {/* Akhiri Call Button Pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            aria-label="Akhiri panggilan"
            style={{
              flex: "0 0 190px",
              height: "56px",
              borderRadius: "999px",
              border: "none",
              background: "#FF453A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: 0,
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              boxShadow: "0 8px 24px rgba(255,69,58,0.32)",
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title="Akhiri Panggilan"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
            </svg>
            Akhiri
          </button>

          {/* Speaker Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSpeakerOn((prev) => !prev);
            }}
            aria-label="Pengeras suara"
            style={{
              width: "56px",
              height: "56px",
              flexShrink: 0,
              borderRadius: "50%",
              border: isSpeakerOn ? "1px solid rgba(48,209,88,0.4)" : "none",
              background: isSpeakerOn ? "rgba(48,209,88,0.2)" : "rgba(255,255,255,0.09)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
            }}
            className="active:scale-95 transition"
            title={isSpeakerOn ? "Speaker Aktif" : "Aktifkan Speaker"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isSpeakerOn ? "#30D158" : "#ffffff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
              <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
