import React from "react";
import { AppNotification } from "../../../shared/types";
import { AppSquircle } from "./AppSquircle";

interface NotificationCompactPillProps {
  notification: AppNotification;
  onDismiss?: () => void;
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
