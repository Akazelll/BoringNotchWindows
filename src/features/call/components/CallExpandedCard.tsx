import React from "react";
import { CallInfo } from "../../../shared/types";
import { formatDuration, getInitials, getAppMeta } from "../lib/callDisplay";
import { PHONE_PATH, iconBtnStyle } from "../lib/phoneIcons";
import { CallExpandedAvatar } from "./CallExpandedAvatar";

interface CallExpandedCardProps {
  call: CallInfo;
  username?: string;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}
// Referensi: CallStates.dc.html — state "Standar" dan "Standar, dibisukan" (380x74).
export const CallExpandedCard: React.FC<CallExpandedCardProps> = ({
  call,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
}) => {
  const isIncoming = call.state === "incoming";
  const initials = getInitials(call.callerName);
  const app = getAppMeta(call.appSource);

  // Baris kedua: prioritas error > dering > bisu > durasi biasa.
  const subtitle = call.errorText ? (
    <span style={{ color: "#FF453A" }}>{call.errorText}</span>
  ) : isIncoming ? (
    <span style={{ color: "#30D158" }}>Panggilan masuk</span>
  ) : call.isMuted ? (
    <span style={{ color: "#FF9F0A" }}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(call.durationSec)}</span>
      {" · Mikrofon mati"}
    </span>
  ) : (
    <span style={{ color: "#30D158", fontVariantNumeric: "tabular-nums" }}>
      {formatDuration(call.durationSec)}
    </span>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "0 16px 0 14px",
        background: "#09090b",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "12px",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="select-none"
    >
      <CallExpandedAvatar
        initials={initials}
        appColor={app.color}
        isIncoming={isIncoming}
        isMuted={call.isMuted}
      />

      {/* Nama + baris status */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {call.callerName || "Panggilan"}
        </div>
        <div style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>{subtitle}</div>
      </div>

      {isIncoming ? (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDecline();
            }}
            aria-label="Tolak panggilan"
            title="Tolak Panggilan"
            style={iconBtnStyle("#FF453A")}
            className="active:scale-95 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
              <path d={PHONE_PATH} />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            aria-label="Terima panggilan"
            title="Terima Panggilan"
            style={iconBtnStyle("#30D158")}
            className="active:scale-95 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
              <path d={PHONE_PATH} />
            </svg>
          </button>
        </>
      ) : (
        <>
          {/* Saat bisu tombol jadi putih — motif referensi, bukan tombol terpisah */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-label={call.isMuted ? "Aktifkan mikrofon" : "Bisukan mikrofon"}
            aria-pressed={call.isMuted}
            title={call.isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
            style={iconBtnStyle(call.isMuted ? "#ffffff" : "rgba(255,255,255,0.1)")}
            className="active:scale-95 transition"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={call.isMuted ? "#09090b" : "#ffffff"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              {call.isMuted ? (
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M3.5 3.5l17 17" />
              ) : (
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
              )}
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            aria-label="Akhiri panggilan"
            title="Akhiri Panggilan"
            style={iconBtnStyle("#FF453A", "0 6px 16px rgba(255,69,58,0.32)")}
            className="active:scale-95 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
              <path d={PHONE_PATH} />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};
