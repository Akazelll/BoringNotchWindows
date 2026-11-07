import React from "react";
import { CallInfo } from "../types";
import { getInitials, getAppMeta } from "../utils/callDisplay";

interface CallCompactPillProps {
  call: CallInfo;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

const PHONE_PATH =
  "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z";

// Tinggi + animasi tiap bar gelombang suara. Referensi memakai 5 bar dari 3 keyframe.
const WAVE_BARS: { anim: string; cls: string }[] = [
  { anim: "8px", cls: "animate-call-wv-1" },
  { anim: "8px", cls: "animate-call-wv-2" },
  { anim: "8px", cls: "animate-call-wv-3" },
  { anim: "8px", cls: "animate-call-wv-2" },
  { anim: "8px", cls: "animate-call-wv-1" },
];

const smallBtnStyle = (background: string): React.CSSProperties => ({
  width: "30px",
  height: "30px",
  flexShrink: 0,
  borderRadius: "50%",
  border: "none",
  background,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: "pointer",
});

// Referensi: CallStates.dc.html — state "Ringkas" (220x46).
export const CallCompactPill: React.FC<CallCompactPillProps> = ({
  call,
  onAccept,
  onDecline,
  onEnd,
}) => {
  const isIncoming = call.state === "incoming";
  const isActive = call.state === "active";
  const initials = getInitials(call.callerName);
  const app = getAppMeta(call.appSource);

  const avatar = (size: number, fontSize: number) => (
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #3a3f4b 0%, #1d2028 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          color: "#e4e4e7",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
        }}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div
        style={{
          position: "absolute",
          right: "-3px",
          bottom: "-3px",
          width: "14px",
          height: "14px",
          boxSizing: "border-box",
          borderRadius: "50%",
          background: isIncoming || !call.isMuted ? app.color : "#FF9F0A",
          border: "2px solid #09090b",
        }}
        className={isIncoming ? "animate-pulse" : undefined}
        aria-hidden="true"
      />
    </div>
  );

  if (isIncoming) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: "0 14px 0 9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        className="select-none"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {avatar(30, 12)}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {call.callerName}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDecline();
            }}
            aria-label="Tolak panggilan"
            title="Tolak Panggilan"
            style={smallBtnStyle("#FF453A")}
            className="active:scale-90 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
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
            style={smallBtnStyle("#30D158")}
            className="active:scale-90 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
              <path d={PHONE_PATH} />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (isActive) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: "0 14px 0 9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
        className="select-none"
      >
        {avatar(30, 12)}

        {/* Gelombang suara: 5 bar seperti referensi; saat bisu berhenti bergerak. */}
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", height: "22px", flex: 1 }}
          aria-hidden="true"
        >
          {WAVE_BARS.map((bar, i) => (
            <div
              key={i}
              className={call.isMuted ? undefined : bar.cls}
              style={{
                width: "3px",
                borderRadius: "2px",
                background: call.isMuted ? "#6E9BD6" : "#30D158",
                height: call.isMuted ? "6px" : bar.anim,
              }}
            />
          ))}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnd();
          }}
          aria-label="Akhiri panggilan"
          title="Akhiri Panggilan"
          style={smallBtnStyle("#FF453A")}
          className="active:scale-90 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
            <path d={PHONE_PATH} />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        color: "#a1a1aa",
      }}
      className="select-none"
    >
      <span>Panggilan Berakhir</span>
    </div>
  );
};
