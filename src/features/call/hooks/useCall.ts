import { useState, useEffect, useCallback, useRef } from "react";
import {
  answerSystemCall,
  declineSystemCall,
  endSystemCall,
} from "../services/callService";
import { useCallDetection } from "./useCallDetection";
import { CallInfo } from "../../../shared/types";

export function useCall() {
  const [call, setCall] = useState<CallInfo | null>(null);
  const timerRef = useRef<number | null>(null);
  // Backend poll masih melaporkan panggilan sebagai "incoming" selama jendelanya terbuka.
  // Setelah user menutup overlay, abaikan laporan itu sebentar agar overlay tidak muncul lagi.
  const suppressUntilRef = useRef<number>(0);
  const isSuppressed = () => Date.now() < suppressUntilRef.current;

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

  // Listen to Windows Call detection (Rust notifications & Win32 windows)
  useCallDetection(setCall, isSuppressed, simulateIncomingCall);

  // Calling acceptCall() sends answer signal to Windows/WhatsApp and activates call state
  const acceptCall = useCallback(() => {
    answerSystemCall();
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
    suppressUntilRef.current = Date.now() + 3000;
    declineSystemCall();
    setCall(null);
  }, []);

  const endCall = useCallback(() => {
    endSystemCall()
      .then(() => {
        // Overlay hanya ditutup kalau panggilan di app sumber benar-benar berakhir.
        suppressUntilRef.current = Date.now() + 3000;
        setCall((prev) => (prev ? { ...prev, state: "ended" } : null));
        // Return smoothly to normal after 600ms
        setTimeout(() => {
          setCall(null);
        }, 600);
      })
      .catch((err) => {
        // Gagal menutup: overlay tetap aktif + tampilkan alasan, jangan diam-diam no-op.
        console.error("end_system_call:", err);
        const msg = "Gagal mengakhiri. Tutup manual di aplikasi.";
        setCall((prev) => (prev ? { ...prev, errorText: msg } : null));
        setTimeout(() => {
          setCall((prev) => (prev && prev.errorText === msg ? { ...prev, errorText: undefined } : prev));
        }, 4000);
      });
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
