import React from "react";
import { AppNotification } from "../types";
import { MessageCircle, Globe, Gamepad2, Bell, Music } from "lucide-react";

interface NotificationBadgesProps {
  notifications: AppNotification[];
}

export const NotificationBadges: React.FC<NotificationBadgesProps> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {notifications.slice(0, 3).map((n) => {
        let icon = <Bell className="w-2.5 h-2.5 text-neutral-400" />;
        let badgeColor = "bg-[#38bdf8]";

        if (n.appType === "whatsapp") {
          icon = <MessageCircle className="w-2.5 h-2.5 text-emerald-400 fill-current" />;
          badgeColor = "bg-emerald-400";
        } else if (n.appType === "discord") {
          icon = <Gamepad2 className="w-2.5 h-2.5 text-indigo-400" />;
          badgeColor = "bg-indigo-400";
        } else if (n.appType === "chrome") {
          icon = <Globe className="w-2.5 h-2.5 text-amber-400" />;
          badgeColor = "bg-amber-400";
        } else if (n.appType === "spotify") {
          icon = <Music className="w-2.5 h-2.5 text-emerald-400" />;
          badgeColor = "bg-emerald-400";
        }

        return (
          <div
            key={n.id}
            title={`Notifikasi dari ${n.appName}`}
            className="relative w-5 h-5 rounded-full flex items-center justify-center bg-[#000000] border border-white/20 shadow-sm"
          >
            {icon}
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${badgeColor} rounded-full ring-1 ring-black`}
            />
          </div>
        );
      })}
    </div>
  );
};
