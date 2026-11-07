import React from "react";

interface CallAvatarProps {
  initials: string;
  appColor: string;
  isIncoming: boolean;
  isMuted: boolean;
  size: number;
  fontSize: number;
}

/** Avatar bundar + badge status aplikasi untuk pill panggilan ringkas. */
export const CallAvatar: React.FC<CallAvatarProps> = ({
  initials,
  appColor,
  isIncoming,
  isMuted,
  size,
  fontSize,
}) => (
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
        background: isIncoming || !isMuted ? appColor : "#FF9F0A",
        border: "2px solid #09090b",
      }}
      className={isIncoming ? "animate-pulse" : undefined}
      aria-hidden="true"
    />
  </div>
);
