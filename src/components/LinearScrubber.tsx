import React from "react";

interface LinearScrubberProps {
  positionSec: number;
  durationSec: number;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const LinearScrubber: React.FC<LinearScrubberProps> = ({
  positionSec,
  durationSec,
}) => {
  const safeDuration = durationSec > 0 ? durationSec : 0;
  const safePosition = Math.min(positionSec, safeDuration || positionSec);
  const percent = safeDuration > 0 ? Math.min(100, Math.max(0, (safePosition / safeDuration) * 100)) : 0;
  const remainingSec = Math.max(0, safeDuration - safePosition);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "14px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#a1a1aa",
        fontVariantNumeric: "tabular-nums",
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* Current Position (Left) */}
      <span style={{ width: "40px" }}>{formatTime(safePosition)}</span>

      {/* Progress Track & Thumb (Center) */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.14)",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percent}%`,
            borderRadius: "2px",
            background: "#ffffff",
            transition: "width 0.2s linear",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${percent}%`,
            top: "-3px",
            width: "10px",
            height: "10px",
            marginLeft: "-5px",
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            transition: "left 0.2s linear",
          }}
        />
      </div>

      {/* Remaining Time (Right) */}
      <span style={{ width: "40px", textAlign: "right" }}>
        {safeDuration > 0 ? `-${formatTime(remainingSec)}` : "0:00"}
      </span>
    </div>
  );
};
