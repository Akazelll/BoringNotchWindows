import React, { useState } from "react";
import { PHONE_PATH } from "../lib/phoneIcons";

interface CallExpandedAvatarProps {
  initials: string;
  appColor: string;
  appLogo?: string;
  isIncoming: boolean;
  isMuted: boolean;
}

/**
 * Avatar 46px + badge status aplikasi untuk kartu panggilan expanded.
 *
 * Sama seperti versi pill: logo aplikasi menggantikan bulatan inisial bila tersedia,
 * dan nama pemanggil tetap terbaca sebagai teks di sebelahnya.
 */
export const CallExpandedAvatar: React.FC<CallExpandedAvatarProps> = ({
  initials,
  appColor,
  appLogo,
  isIncoming,
  isMuted,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!appLogo && !logoFailed;

  return (
    <>
    {/* Logo aplikasi, atau avatar inisial 46px + badge status aplikasi */}
<div style={{ position: "relative", width: "46px", height: "46px", flexShrink: 0 }}>
  {showLogo ? (
    <img
      src={appLogo}
      alt=""
      aria-hidden="true"
      onError={() => setLogoFailed(true)}
      style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "contain" }}
    />
  ) : (
  <div
    style={{
      width: "46px",
      height: "46px",
      borderRadius: "50%",
      background: "linear-gradient(145deg, #3a3f4b 0%, #1d2028 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      fontWeight: 600,
      color: "#e4e4e7",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
    }}
    aria-hidden="true"
  >
    {initials}
  </div>
  )}

  <div
    style={{
      position: "absolute",
      right: "-3px",
      bottom: "-3px",
      width: "20px",
      height: "20px",
      boxSizing: "border-box",
      borderRadius: "50%",
      background: isIncoming || !isMuted ? appColor : "#FF9F0A",
      border: "2.5px solid #09090b",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    className={isIncoming ? "animate-pulse" : undefined}
    aria-hidden="true"
  >
    {isMuted && !isIncoming ? (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2a1700" strokeWidth="3.2" strokeLinecap="round">
        <path d="M4 4l16 16" />
        <rect x="9" y="3" width="6" height="11" rx="3" />
      </svg>
    ) : (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="#04210d">
        <path d={PHONE_PATH} />
      </svg>
    )}
  </div>
</div>
    </>
  );
};
