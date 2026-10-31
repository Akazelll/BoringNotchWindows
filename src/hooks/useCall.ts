import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CallInfo, AppNotification } from "../types";

export function useCall() {
  const [call, setCall] = useState<CallInfo | null>(null);
  const timerRef = useRef<number | null>(null);

  // Active call duration timer: ONLY runs if user explicitly accepted the call (state === "active")
  useEffect(() => {
    if (call && call.state === "active") {
      timerRef.current = window.setInterval(() => {
        setCall((prev) => {
          if (!prev || prev.state !== "active") return prev;
          return {
            ...prev,
            durationSec: prev.durationSec + 1,
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [call?.state]);

  // Listen to Windows Call detection (Rust notifications & Win32 windows)
  useEffect(() => {
    let unlistenNotifs: (() => void) | undefined;
    let unlistenCall: (() => void) | undefined;

    // 1. Initial check for any active incoming call
    invoke<any>("get_active_call")
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
    listen<any>("call-state-changed", (event) => {
      if (event.payload) {
        const payload = event.payload;
        setCall((prev) => {
          // If the user already accepted the call locally in Boring Notch, keep it active
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
          // If user didn't pick up (state was 'incoming'), dismiss immediately
          if (prev && prev.state === "incoming") {
            return null;
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
    listen<AppNotification[]>("notifications-changed", (event) => {
      if (Array.isArray(event.payload)) {
        const notifs = event.payload;
        const callNotif = notifs.find((n) => n.isCall);

        if (callNotif) {
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

  const simulateIncomingCall = useCallback(
    (name = "Ibu", appSource: CallInfo["appSource"] = "whatsapp") => {
      setCall({
        callerName: name,
        callerNumber: "Panggilan Suara Masuk...",
        appSource,
        state: "incoming",
        durationSec: 0,
        isMuted: false,
      });
    },
    []
  );

  // ONLY calling acceptCall() can put the call into 'active' state
  const acceptCall = useCallback(() => {
    setCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        state: "active",
        durationSec: 0,
      };
    });
  }, []);

  const declineCall = useCallback(() => {
    setCall(null);
  }, []);

  const endCall = useCallback(() => {
    setCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        state: "ended",
      };
    });
    // Return smoothly to normal after 600ms
    setTimeout(() => {
      setCall(null);
    }, 600);
  }, []);

  const toggleMute = useCallback(() => {
    setCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isMuted: !prev.isMuted,
      };
    });
  }, []);

  return {
    call,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    simulateIncomingCall,
  };
}
