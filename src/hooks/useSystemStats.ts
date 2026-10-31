import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SystemStats } from "../types";

const INITIAL_STATS: SystemStats = {
  cpuPercent: 0,
  ramUsedGb: 0,
  ramTotalGb: 16,
  ramPercent: 0,
  diskUsedGb: 0,
  diskTotalGb: 256,
  diskPercent: 0,
};

export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats>(INITIAL_STATS);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    invoke<SystemStats>("get_system_stats")
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((err) => {
        console.error("Failed to fetch system stats:", err);
      });

    listen<SystemStats>("system-stats-changed", (event) => {
      if (event.payload) {
        setStats(event.payload);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error("Failed to listen to system-stats-changed:", err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return stats;
}
