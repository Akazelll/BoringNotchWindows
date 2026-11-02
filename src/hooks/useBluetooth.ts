import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { BluetoothDeviceEvent } from "../types";

export function useBluetooth() {
  const [bluetoothEvent, setBluetoothEvent] = useState<BluetoothDeviceEvent | null>(null);
  const timerRef = useRef<number | null>(null);

  const showBanner = useCallback((device: BluetoothDeviceEvent) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    setBluetoothEvent(device);
    // Auto-dismiss banner after 5.5 seconds
    timerRef.current = window.setTimeout(() => {
      setBluetoothEvent(null);
      timerRef.current = null;
    }, 5500);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setBluetoothEvent(null);
  }, []);

  // Listen to live Bluetooth connected events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<BluetoothDeviceEvent>("bluetooth-connected", (event) => {
      if (event.payload && event.payload.name) {
        showBanner(event.payload);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error("Failed to listen to bluetooth-connected:", err);
      });

    return () => {
      if (unlisten) unlisten();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showBanner]);

  return {
    bluetoothEvent,
    isBluetoothBannerActive: !!bluetoothEvent,
    dismiss,
    showBanner,
  };
}
