import { useState, useEffect, useRef, useCallback } from "react";
import { AppNotification } from "../../../shared/types";
import {
  getActiveNotifications,
  triggerNotificationTest,
  onNotificationsChanged,
} from "../services/notificationService";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentToast, setCurrentToast] = useState<AppNotification | null>(null);
  // Track notification ID -> content signature to detect both new IDs and updated messages on same ID
  const seenSignaturesRef = useRef<Map<number, string>>(new Map());
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((notif: AppNotification) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentToast(notif);
    timerRef.current = window.setTimeout(() => {
      setCurrentToast(null);
      timerRef.current = null;
    }, 3000); // Display toast for 3.0 seconds
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentToast(null);
  }, []);

  const triggerTestNotification = useCallback(
    (appName?: string, title?: string, message?: string) => {
      triggerNotificationTest(appName, title, message).catch(() => {});
    },
    []
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    // Fetch initial active Windows notifications and mark as already seen so old notifications don't toast on launch
    getActiveNotifications()
      .then((notifs) => {
        if (Array.isArray(notifs)) {
          setNotifications(notifs);
          notifs.forEach((n) => {
            seenSignaturesRef.current.set(n.id, `${n.title}::${n.message}`);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Windows notifications:", err);
      });

    // Listen to live Windows notification updates
    onNotificationsChanged((notifs) => {
        setNotifications(notifs);

        // Buang hanya noise perangkat yang benar-benar dikenal. Aplikasi yang tidak dikenali
        // (appType "") DITAMPILKAN: fitur notifikasi harus gagal ke arah menampilkan, bukan
        // menyembunyikan. Filter lama membuang appType "system" sehingga notifikasi sah dari
        // aplikasi di luar daftar putih hilang tanpa jejak.
        const isWhitelistedApp = (n: AppNotification) => {
          const text = `${n.appName} ${n.title || ""} ${n.message || ""}`.toLowerCase();
          const isHardwareAudio =
            text.includes("headset") ||
            text.includes("headphone") ||
            text.includes("earphone") ||
            text.includes("hands-free") ||
            text.includes("siap digunakan") ||
            text.includes("ready to use") ||
            text.includes("tersambung ke") ||
            text.includes("mode resume") ||
            text.includes("system mode") ||
            text.includes("mode pemulihan");

          return !isHardwareAudio;
        };

        // Detect if any new notification ID arrived OR existing notification got updated text
        const newlyArrived = notifs.find((n) => {
          if (!isWhitelistedApp(n)) return false;
          const sig = `${n.title}::${n.message}`;
          const prevSig = seenSignaturesRef.current.get(n.id);
          return prevSig !== sig;
        });

        if (newlyArrived) {
          const sig = `${newlyArrived.title}::${newlyArrived.message}`;
          seenSignaturesRef.current.set(newlyArrived.id, sig);
          showToast(newlyArrived);
        }

        // Keep seen map synchronized with currently active notification IDs
        const activeIds = new Set(notifs.map((n) => n.id));
        for (const id of Array.from(seenSignaturesRef.current.keys())) {
          if (!activeIds.has(id)) {
            seenSignaturesRef.current.delete(id);
          }
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
  }, [showToast]);

  return {
    notifications,
    currentToast,
    showToast,
    dismissToast,
    triggerTestNotification,
  };
}
