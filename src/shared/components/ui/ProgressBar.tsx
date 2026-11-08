import React from "react";

/**
 * Bar progres 5px bergradient — dipakai halaman Salat dan Pomodoro.
 *
 * Satu komponen untuk keduanya dengan sengaja: dua salinan inline sempat melenceng
 * (margin 6 vs 10px, fill biru solid vs gradient). Ini satu-satunya sumber kebenaran gayanya.
 */
export const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.min(1, Math.max(0, value)) * 100;

  return (
    <div
      style={{
        position: "relative",
        height: "5px",
        borderRadius: "3px",
        background: "rgba(255,255,255,0.12)",
        marginTop: "10px",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct.toFixed(1)}%`,
          borderRadius: "3px",
          background: "linear-gradient(90deg, #2F7BFF 0%, #7FB7FF 100%)",
        }}
      />
    </div>
  );
};
