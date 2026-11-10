import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CallInfo } from "../../../shared/types";
import type { ActiveCallPayload } from "../services/callService";
import {
  getActiveCall,
  onCallStateChanged,
  onNotificationsChanged,
} from "../services/callService";

/**
 * Mendeteksi panggilan dari dua sumber Rust (event call-state-changed dan
 * entri isCall di notifications-changed) lalu menyinkronkannya ke state.
 * Isi body dipindahkan apa adanya dari useCall.
 */
export function useCallDetection(
  setCall: Dispatch<SetStateAction<CallInfo | null>>,
  isSuppressed: () => boolean,
  simulateIncomingCall: (
    name?: string,
    appSource?: CallInfo["appSource"],
    state?: CallInfo["state"]
  ) => void
) {
  useEffect(() => {
    let unlistenNotifs: (() => void) | undefined;
    let unlistenCall: (() => void) | undefined;

    // 1. Initial check for any active call
    getActiveCall()
      .then((activeCall) => {
        if (activeCall) {
          setCall({
            callerName: activeCall.callerName || "Panggilan Masuk",
            callerNumber: activeCall.callerNumber || undefined,
            appSource: (activeCall.appSource as CallInfo["appSource"]) || "whatsapp",
            state: activeCall.state ?? "incoming",
            durationSec: 0,
            isMuted: false,
            notifId: activeCall.notifId,
          });
        }
      })
      .catch(() => {});

    // 2. Listen to direct call-state-changed event from Rust backend
    onCallStateChanged((raw) => {
      const payload = raw as ActiveCallPayload | null;
      if (payload) {
        if (isSuppressed()) return;
        setCall((prev) => {
          // If the user already accepted the call locally in bento, keep it active
          if (prev && (prev.state === "active" || prev.state === "outgoing")) {
            return prev;
          }
          return {
            callerName: payload.callerName || "Panggilan Masuk",
            callerNumber: payload.callerNumber || undefined,
            appSource: (payload.appSource as CallInfo["appSource"]) || "whatsapp",
            state: payload.state ?? "incoming",
            durationSec: 0,
            isMuted: false,
            notifId: payload.notifId,
          };
        });
      } else {
        // When backend reports call ended / dismissed:
        setCall((prev) => {
          if (!prev) return null;
          if (prev.state === "incoming" || prev.state === "outgoing") {
            return null;
          }
          if (prev.state === "active") {
            // Call was ended remotely or by application
            setTimeout(() => {
              setCall(null);
            }, 600);
            return {
              ...prev,
              state: "ended",
            };
          }
          return prev;
        });
      }
    })
      .then((fn) => {
        unlistenCall = fn;
      })
      .catch(() => {});

    // 3. Listen to notifications-changed
    onNotificationsChanged((notifs) => {
      const callNotif = notifs.find((n) => n.isCall);

      if (callNotif) {
        if (isSuppressed()) return;
        setCall((prev) => {
          // Panggilan yang sedang berjalan tidak boleh ditimpa toast: panggilan keluar
          // tidak pernah menghasilkan toast, sehingga toast lama bisa menyetel ulang
          // overlay menjadi "Panggilan masuk" di tengah percakapan.
          if (prev && (prev.state === "active" || prev.state === "outgoing")) {
            return prev;
          }
          return {
            callerName: callNotif.title || callNotif.appName,
            callerNumber: callNotif.message || undefined,
            appSource: (callNotif.appType as CallInfo["appSource"]) || "whatsapp",
            // Toast panggilan selalu datang dari pihak pemanggil masuk.
            state: "incoming",
            durationSec: 0,
            isMuted: false,
            notifId: callNotif.id,
          };
        });
      } else {
        // If the call notification disappeared (caller hung up / missed call):
        setCall((prev) => {
          if (prev && prev.state === "incoming") {
            return null; // Telepon tidak diangkat: jangan masuk ke durasi, kembali ke mode normal
          }
          return prev;
        });
      }
    })
      .then((fn) => {
        unlistenNotifs = fn;
      })
      .catch(() => {});

    // 4. Shortcut uji: Ctrl+Shift+C = panggilan masuk, Ctrl+Shift+O = panggilan keluar.
    // Keduanya butuh perangkat nyata karena jalur deteksi Rust membaca window asli.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        simulateIncomingCall("Tim Developer", "whatsapp", "incoming");
      } else if (key === "o") {
        e.preventDefault();
        simulateIncomingCall("Tim Developer", "whatsapp", "outgoing");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (unlistenNotifs) unlistenNotifs();
      if (unlistenCall) unlistenCall();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}