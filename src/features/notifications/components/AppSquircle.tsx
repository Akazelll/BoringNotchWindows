import { Send, Gamepad2, Globe, Music, Bell, Phone } from "lucide-react";

// Apple Squircle Notification App Icons matching IdleNotif.dc.html (44x44px, rounded-12px)
export function AppSquircle({ appType }: { appType: string }) {
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
