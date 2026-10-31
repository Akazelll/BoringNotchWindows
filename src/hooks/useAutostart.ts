import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useAutostart() {
  const [autostart, setAutostart] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    invoke<boolean>("is_autostart_enabled")
      .then((enabled) => {
        setAutostart(enabled);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to check autostart status:", err);
        setIsLoading(false);
      });
  }, []);

  const toggleAutostart = useCallback(async () => {
    const nextState = !autostart;
    try {
      await invoke("set_autostart_enabled", { enabled: nextState });
      setAutostart(nextState);
    } catch (err) {
      console.error("Failed to toggle autostart:", err);
    }
  }, [autostart]);

  return { autostart, toggleAutostart, isLoading };
}
