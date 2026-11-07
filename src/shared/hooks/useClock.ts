import { useState, useEffect } from "react";

/**
 * Tanggal & jam format Indonesia (mis. "Sabtu, 31 Okt 20.55"), update tiap detik.
 * Isi body dipindahkan apa adanya dari ExpandedCard.
 */
export function useClock() {
  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");

  // Date & Time in Indonesian format (e.g. "Sabtu, 31 Okt 20.55")
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dayName = now.toLocaleDateString("id-ID", { weekday: "short" });
      const dayNum = now.getDate();
      const monthName = now.toLocaleDateString("id-ID", { month: "short" });
      setDateStr(`${dayName}, ${dayNum} ${monthName}`);

      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hours}.${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return { dateStr, timeStr };
}