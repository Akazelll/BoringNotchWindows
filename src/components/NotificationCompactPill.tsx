import React from "react";
import { AppNotification } from "../types";
import { Send, Gamepad2, Globe, Music, Bell, Phone } from "lucide-react";

interface NotificationCompactPillProps {
  notification: AppNotification;
  onDismiss?: () => void;
}

// Apple Squircle Notification App Icons matching IdleNotif.dc.html (44x44px, rounded-12px)
function AppSquircle({ appType }: { appType: string }) {
  switch (appType) {
    case "whatsapp":
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #4ADE80 0%, #1FAA59 60%, #0E6B36 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
          role="img"
          aria-label="WhatsApp"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
            <path d="M9 9.5c.3 2.5 2.5 4.7 5 5l1.2-1.4-1.9-1-.8.7c-.9-.4-1.6-1.1-2-2l.7-.8-1-1.9z" fill="#ffffff" stroke="none" />
          </svg>
        </div>
      );
    case "telegram":
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #2AABEE 0%, #229ED9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
          role="img"
          aria-label="Telegram"
        >
          <Send className="w-5 h-5 text-white -translate-x-[1px] translate-y-[1px]" />
        </div>
      );
    case "discord":
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #5865F2 0%, #4752C4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
          role="img"
          aria-label="Discord"
        >
          <Gamepad2 className="w-5 h-5 text-white" />
        </div>
      );
    case "chrome":
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
          }}
          role="img"
          aria-label="Browser"
        >
          <Globe className="w-5 h-5 text-amber-400" />
        </div>
      );
    case "spotify":
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #1ed760 0%, #159e44 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
          role="img"
          aria-label="Spotify"
        >
          <Music className="w-5 h-5 text-black" />
        </div>
      );
    case "phone":
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #0ea5e9 0%, #0284c7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
          role="img"
          aria-label="Telepon"
        >
          <Phone className="w-5 h-5 text-white" />
        </div>
      );
    default:
      return (
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "linear-gradient(145deg, #272a34 0%, #181a20 100%)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          role="img"
          aria-label="Notifikasi"
        >
          <Bell className="w-5 h-5 text-[#5AA2FF]" />
        </div>
      );
  }
}

export const NotificationCompactPill: React.FC<NotificationCompactPillProps> = ({
  notification,
  onDismiss,
}) => {
  return (
    <div
      onClick={onDismiss}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "0 22px 0 18px",
        background: "#09090b",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "14px",
        cursor: "pointer",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="animate-in fade-in duration-200 select-none"
      title="Klik untuk menutup notifikasi"
    >
      {/* Sisi Kiri: App Squircle 44x44px */}
      <AppSquircle appType={notification.appType} />

      {/* Sisi Tengah: Judul/Pengirim & Cuplikan Pesan */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {notification.title || notification.appName}
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#b4b4bc",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {notification.message || "Pesan baru"}
        </div>
      </div>

      {/* Sisi Kanan: Penanda Waktu "Sekarang" */}
      <div
        style={{
          alignSelf: "flex-start",
          paddingTop: "15px",
          fontSize: "11px",
          fontWeight: 500,
          color: "#8a8a93",
          flexShrink: 0,
        }}
      >
        Sekarang
      </div>
    </div>
  );
};
