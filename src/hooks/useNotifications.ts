import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AppNotification } from "../types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentToast, setCurrentToast] = useState<AppNotification | null>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<number | null>(null);

  const showToast = (notif: AppNotification) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentToast(notif);
    timerRef.current = window.setTimeout(() => {
      setCurrentToast(null);
      timerRef.current = null;
    }, 4500); // Display toast for 4.5 seconds
  };

  const dismissToast = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentToast(null);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    // Fetch initial active Windows notifications and mark as already seen so old notifications don't toast on launch
    invoke<AppNotification[]>("get_active_notifications")
      .then((notifs) => {
        if (Array.isArray(notifs)) {
          setNotifications(notifs);
          notifs.forEach((n) => seenIdsRef.current.add(n.id));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Windows notifications:", err);
      });

    // Listen to live Windows notification updates
    listen<AppNotification[]>("notifications-changed", (event) => {
      if (Array.isArray(event.payload)) {
        const notifs = event.payload;
        setNotifications(notifs);

        // Detect if any new notification ID arrived
        const newlyArrived = notifs.find((n) => !seenIdsRef.current.has(n.id));
        if (newlyArrived) {
          seenIdsRef.current.add(newlyArrived.id);
          showToast(newlyArrived);
        }

        // Keep seen set synchronized
        const activeIds = new Set(notifs.map((n) => n.id));
        seenIdsRef.current.forEach((id) => {
          if (!activeIds.has(id)) {
            seenIdsRef.current.delete(id);
          }
        });
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error("Failed to listen to notifications-changed:", err);
      });

    return () => {
      if (unlisten) unlisten();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return {
    notifications,
    currentToast,
    showToast,
    dismissToast,
    hasNotifications: notifications.length > 0,
  };
}
