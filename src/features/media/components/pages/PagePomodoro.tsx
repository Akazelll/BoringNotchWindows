import React from "react";
import { BatteryInfo } from "../../../../shared/types";
import { modeLabelId, type PomodoroController } from "../../../pomodoro";
import { ExpandedClockHeader, HeaderPageTitle, HeaderWaveformIcon } from "../../../../shared/components/ui/ExpandedHeaderParts";
import { ProgressBar } from "../../../../shared/components/ui/ProgressBar";

interface PagePomodoroProps {
  battery: BatteryInfo;
  dateStr: string;
  timeStr: string;
  pomodoro: PomodoroController;
}

const ACCENT = "#5AA2FF";

export const PagePomodoro: React.FC<PagePomodoroProps> = ({ battery, dateStr, timeStr, pomodoro }) => {
  const { mode, isRunning, timeFormatted, sessionLabel, sessionTrack, remainingRatio, cycleSummaryLabel, endsAtLabel } =
    pomodoro;

  const breakLabel = modeLabelId(mode === "focus" ? "break" : mode);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // 8px, bukan 10: kartu 214px hanya menyisakan ~96px untuk baris tengah, dan kolom kiri
        // (label + waktu + status + bar) butuh ~101px. Selisih itu dulu memotong bar-nya.
        gap: "8px",
        width: "100%",
        flex: 1,
        minHeight: 0,
        justifyContent: "space-between",
      }}
      className="animate-in fade-in duration-200"
    >
      {/* Header: judul kiri, jam tengah, ikon aktivitas kanan */}
      <ExpandedClockHeader
        battery={battery}
        dateStr={dateStr}
        timeStr={timeStr}
        left={<HeaderPageTitle text="Pomodoro" />}
        right={<HeaderWaveformIcon />}
      />

      {/* Baris tengah: countdown + sesi kiri, kontrol + trek sesi kanan */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: "20px", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px", justifyContent: "center" }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#a1a1aa" }}>{sessionLabel}</div>
          <div
            style={{
              fontSize: "46px",
              fontWeight: 600,
              lineHeight: 1.05,
              color: "#ffffff",
              letterSpacing: "-0.035em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {timeFormatted}
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: ACCENT, paddingTop: "2px" }}>
            {isRunning ? `Selesai pukul ${endsAtLabel}` : "Dijeda"}
          </div>
          {/* Bar loading sesi berjalan, tepat di bawah teks status. Penuh saat sesi mulai lalu
              menyusut mengikuti sisa waktu (`remainingRatio`), bukan `sessionProgress` yang
              hanya melompat 0/25/50/75% per sesi. Komponennya sama dengan bar di halaman Salat. */}
          <ProgressBar value={remainingRatio} />
        </div>

        <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} aria-hidden="true" />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#a1a1aa" }}>Putaran ini</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pomodoro.togglePlayPause();
                }}
                style={{
                  height: "32px",
                  boxSizing: "border-box",
                  padding: "0 16px",
                  borderRadius: "999px",
                  border: "none",
                  background: "#ffffff",
                  color: "#09090b",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "-0.005em",
                  cursor: "pointer",
                }}
                className="active:scale-95 transition"
              >
                {isRunning ? "Jeda" : "Lanjut"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pomodoro.reset();
                }}
                aria-label="Reset timer"
                title="Reset Timer"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  cursor: "pointer",
                }}
                className="hover:bg-white/15 active:scale-90 transition"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12a8 8 0 1 0 2.6-5.9" />
                  <path d="M4 4v4.5h4.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Trek sesi: 4 sesi fokus + istirahat panjang. Fill menyatakan progres di dalam
              sesi itu. space-between supaya trek mengisi penuh kolom kanan, bukan menumpuk
              di kiri dengan lubang di kanan seperti sebelumnya. */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "4px",
              paddingTop: "6px",
            }}
            role="img"
            aria-label={`Sesi ${pomodoro.sessionIndex} dari ${pomodoro.sessionsPerCycle}`}
          >
            {sessionTrack.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 && (
                  <div
                    style={{
                      width: "6px",
                      height: "8px",
                      marginTop: "1px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background:
                          item.isLongBreak || sessionTrack[index - 1].isDone
                            ? "#64D2FF"
                            : "rgba(255,255,255,0.14)",
                      }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "24px",
                      height: "10px",
                      borderRadius: "5px",
                      background:
                        item.isDone || item.isCurrent ? ACCENT : "rgba(255,255,255,0.14)",
                    }}
                  >
                    {!item.isDone && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${item.fillPercent.toFixed(0)}%`,
                          borderRadius: "5px",
                          background: ACCENT,
                        }}
                      />
                    )}
                    {item.isCurrent && (
                      <div
                        style={{
                          position: "absolute",
                          left: `calc(${item.fillPercent.toFixed(0)}% - 5.5px)`,
                          top: "50%",
                          width: "11px",
                          height: "11px",
                          marginTop: "-5.5px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          boxShadow: `0 0 10px ${ACCENT}`,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      height: "14px",
                      lineHeight: "14px",
                      whiteSpace: "nowrap",
                      color: item.isCurrent ? "#ffffff" : item.isDone ? "#d4d4d8" : "#8a8a93",
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div style={{ fontSize: "12px", fontWeight: 500, color: "#8a8a93", fontVariantNumeric: "tabular-nums" }}>
            {cycleSummaryLabel}
          </div>
        </div>
      </div>

      {/* Baris bawah: pemilih mode + play/pause. Tidak ada di mockup, tapi tanpa ini fitur hilang. */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            pomodoro.setMode("break");
          }}
          style={{
            height: "32px",
            boxSizing: "border-box",
            padding: "0 14px 0 11px",
            borderRadius: "999px",
            border: mode === "focus" ? "none" : `1px solid ${ACCENT}`,
            background: mode === "focus" ? "rgba(255,255,255,0.07)" : "rgba(90,162,255,0.16)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: mode === "focus" ? "#e4e4e7" : "#ffffff",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
          className="active:scale-95 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
            <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M8 3v2.5M12 3v2.5" />
          </svg>
          {breakLabel}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            pomodoro.setMode("focus");
          }}
          style={{
            height: "32px",
            boxSizing: "border-box",
            padding: "0 14px 0 11px",
            borderRadius: "999px",
            border: mode === "focus" ? `1px solid ${ACCENT}` : "none",
            background: mode === "focus" ? "rgba(90,162,255,0.16)" : "rgba(255,255,255,0.07)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: mode === "focus" ? "#ffffff" : "#e4e4e7",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
          className="active:scale-95 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          </svg>
          Fokus
        </button>
      </div>
    </div>
  );
};
