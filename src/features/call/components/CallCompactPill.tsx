import React from "react";
import { CallInfo } from "../../../shared/types";
import { getInitials, getAppMeta } from "../lib/callDisplay";
import { PHONE_PATH, iconBtnStyle } from "../lib/phoneIcons";
import { CallAvatar } from "./CallAvatar";

// Pill ringkas hanya 43px tinggi, jadi tombol 42px milik kartu expanded akan mentok
// tepi notch begitu panggilan tersambung (mouse pergi, notch menyusut). 30px menyisakan
// sekitar 6,5px di atas dan di bawah.
const PILL_BTN = 30;
const pillBtn = (background: string) => iconBtnStyle(background, undefined, PILL_BTN);

interface CallCompactPillProps {
  call: CallInfo;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

// Tinggi + animasi tiap bar gelombang suara. Referensi memakai 5 bar dari 3 keyframe.
const WAVE_BARS: { anim: string; cls: string }[] = [
  { anim: "8px", cls: "animate-call-wv-1" },
  { anim: "8px", cls: "animate-call-wv-2" },
  { anim: "8px", cls: "animate-call-wv-3" },
  { anim: "8px", cls: "animate-call-wv-2" },
  { anim: "8px", cls: "animate-call-wv-1" },
];


// Referensi: CallStates.dc.html — state "Ringkas" (220x46).
export const CallCompactPill: React.FC<CallCompactPillProps> = ({
  call,
  onAccept,
  onDecline,
  onEnd,
}) => {
  const isRinging = call.state === "incoming";
  const isDialing = call.state === "outgoing";
  const isActive = call.state === "active";
  const initials = getInitials(call.callerName);
  const app = getAppMeta(call.appSource);

  const avatar = (size: number, fontSize: number) => (
    <CallAvatar
      initials={initials}
      appColor={app.color}
      isIncoming={isRinging}
      isMuted={call.isMuted}
      size={size}
      fontSize={fontSize}
    />
  );

  if (isRinging || isDialing) {
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

        {/* Panggilan keluar sedang memanggil: tidak ada aksi yang berarti di sini,
            jadi tidak ada tombol sama sekali. */}
        {isDialing ? (
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#a1a1aa", flexShrink: 0 }}>
            Memanggil...
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDecline();
              }}
              aria-label="Tolak panggilan"
              title="Tolak Panggilan"
              style={pillBtn("#FF453A")}
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
              style={pillBtn("#30D158")}
              className="active:scale-90 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                <path d={PHONE_PATH} />
              </svg>
            </button>
          </div>
        )}
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
          style={pillBtn("#FF453A")}
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
