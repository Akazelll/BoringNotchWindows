import React from "react";
import { Music } from "lucide-react";

interface AppSourceBadgeProps {
  sourceApp?: string;
  showLabel?: boolean;
}

// Crisp SVG Icons for common Windows media players
const SpotifyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#1ed760" />
    <path
      d="M17.5 16.2C17.3 16.5 16.9 16.6 16.6 16.4C13.8 14.7 10.2 14.3 6 15.3C5.6 15.4 5.3 15.1 5.2 14.8C5.1 14.4 5.3 14.1 5.7 14C10.3 12.9 14.2 13.4 17.3 15.3C17.6 15.5 17.7 15.9 17.5 16.2ZM18.9 13.1C18.6 13.5 18.1 13.7 17.7 13.4C14.5 11.4 9.6 10.8 5.8 12C5.3 12.1 4.8 11.8 4.7 11.4C4.6 10.9 4.9 10.4 5.3 10.3C9.8 8.9 15.1 9.6 18.7 11.8C19.1 12.1 19.2 12.6 18.9 13.1ZM19 9.9C15.2 7.6 8.8 7.4 5.1 8.5C4.5 8.7 3.9 8.3 3.7 7.7C3.5 7.1 3.9 6.5 4.5 6.3C8.8 5 15.8 5.3 20.3 7.9C20.8 8.2 21 8.9 20.7 9.4C20.4 9.9 19.7 10.1 19 9.9Z"
      fill="#000000"
    />
  </svg>
);

const YouTubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#ff0000" />
    <polygon points="9.5,7.5 16.5,12 9.5,16.5" fill="#ffffff" />
  </svg>
);

const ChromeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#38bdf8" strokeWidth="2" fill="#181a20" />
    <circle cx="12" cy="12" r="4" fill="#38bdf8" />
  </svg>
);

const AppleMusicIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#fc3c44" />
    <path
      d="M15 6V14.5C15 15.9 13.9 17 12.5 17C11.1 17 10 15.9 10 14.5C10 13.1 11.1 12 12.5 12C12.8 12 13.2 12.1 13.5 12.2V8.5L8.5 9.8V16C8.5 17.4 7.4 18.5 6 18.5C4.6 18.5 3.5 17.4 3.5 16C3.5 14.6 4.6 13.5 6 13.5C6.3 13.5 6.7 13.6 7 13.7V7.5L15 6Z"
      fill="#ffffff"
    />
  </svg>
);

export const AppSourceBadge: React.FC<AppSourceBadgeProps> = ({
  sourceApp = "",
  showLabel = true,
}) => {
  const lower = sourceApp.toLowerCase();

  let icon = <Music className="w-3.5 h-3.5 text-[#38bdf8]" />;
  let label = "Audio";

  if (lower.includes("spotify")) {
    icon = <SpotifyIcon />;
    label = "Spotify";
  } else if (lower.includes("youtube") || lower.includes("video")) {
    icon = <YouTubeIcon />;
    label = "YouTube";
  } else if (
    lower.includes("chrome") ||
    lower.includes("edge") ||
    lower.includes("brave") ||
    lower.includes("opera") ||
    lower.includes("browser")
  ) {
    icon = <ChromeIcon />;
    label = "Browser";
  } else if (lower.includes("apple")) {
    icon = <AppleMusicIcon />;
    label = "Apple Music";
  } else if (lower.includes("vlc") || lower.includes("player")) {
    icon = <Music className="w-3.5 h-3.5 text-amber-400" />;
    label = "Media Player";
  } else if (sourceApp) {
    icon = <Music className="w-3.5 h-3.5 text-[#38bdf8]" />;
    label = sourceApp.split(".")[0] || "Media";
  }

  return (
    <div
      title={`Memutar dari ${label}`}
      className="flex items-center gap-1.5 bg-[#181a20] border border-white/15 rounded-full px-2.5 py-1 flex-shrink-0 shadow-inner select-none transition-all duration-200"
    >
      <div className="flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      {showLabel && (
        <span className="text-[11px] font-bold text-white tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
};
