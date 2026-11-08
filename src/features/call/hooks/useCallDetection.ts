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
  simulateIncomingCall: (name?: string, appSource?: CallInfo["appSource"]) => void
) {
  useEffect(() => {
    let unlistenNotifs: (() => void) | undefined;
    let unlistenCall: (() => void) | undefined;

    // 1. Initial check for any active incoming call
    getActiveCall()
      .then((activeCall) => {
        if (activeCall) {
          // ANY newly detected call must start in 'incoming' state
          setCall({
            callerName: activeCall.callerName || "Panggilan Masuk",
            callerNumber: activeCall.callerNumber || undefined,
            appSource: (activeCall.appSource as CallInfo["appSource"]) || "whatsapp",
            state: "incoming",
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
          if (prev && prev.state === "active") {
            return prev;
          }
          // Incoming calls must always be 'incoming'
          return {
            callerName: payload.callerName || "Panggilan Masuk",
            callerNumber: payload.callerNumber || undefined,
            appSource: (payload.appSource as CallInfo["appSource"]) || "whatsapp",
            state: "incoming",
            durationSec: 0,
            isMuted: false,
            notifId: payload.notifId,
          };
        });
      } else {
        // When backend reports call ended / dismissed:
        setCall((prev) => {
          if (!prev) return null;
          if (prev.state === "incoming") {
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
          // Keep active if user already accepted
          if (prev && prev.state === "active") {
            return prev;
          }
          return {
            callerName: callNotif.title || callNotif.appName,
            callerNumber: callNotif.message || undefined,
            appSource: (callNotif.appType as CallInfo["appSource"]) || "whatsapp",
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

    // 4. Quick testing shortcut: Ctrl + Shift + C
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        simulateIncomingCall("Tim Developer", "whatsapp");
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