import React from "react";
import { RobotMood } from "../types";

interface RobotEyesProps {
  mood: RobotMood;
  tx: number;
  ty: number;
  sc: number;
}

// Nilai diambil dari referensi RobotEyes.dc.html, lalu dikecilkan lagi.
// Notch referensi setinggi 58px; notch proyek ini hanya 40px — jadi mata sengaja dibuat
// lebih kecil daripada sekadar skala 40/58, supaya ada napas ke tepi atas dan bawah.
const EYE_W = 17;
const EYE_H = 21;
const EYE_RADIUS = 6;
const EYE_GAP = 19;
const FACE_GRADIENT = "linear-gradient(180deg, #A9D0FF 0%, #5AA2FF 100%)";
// Glow 10px: cukup untuk efek pendar, tapi memudar sebelum kena `overflow-hidden` notch.
const FACE_GLOW = "0 0 10px rgba(90,162,255,0.65), inset 0 -2px 5px rgba(20,60,140,0.35)";

const SLEEPY_BAR_W = 19;
const SLEEPY_GAP = 17;

const SAD_SIZE = 17;
const SAD_GAP = 22;
const SAD_GRADIENT = "linear-gradient(180deg, #FFD58A 0%, #FF9F2E 100%)";
const SAD_GLOW = "0 0 10px rgba(255,159,46,0.55)";

export const RobotEyes: React.FC<RobotEyesProps> = ({ mood, tx, ty, sc }) => {
  if (mood === "sleepy") {
    // Gerakan setengah dari mode normal, sesuai referensi.
    const stx = Math.round(tx * 0.5 * 10) / 10;
    const sty = Math.round(ty * 0.5 * 10) / 10;
    const bar = (key: number) => (
      <div
        key={key}
        style={{
          width: `${SLEEPY_BAR_W}px`,
          height: "5px",
          borderRadius: "2.5px",
          background: "#6E9BD6",
          boxShadow: "0 0 7px rgba(90,162,255,0.4)",
          transform: `translate(${stx}px, ${sty}px)`,
          transition: "transform 160ms ease-out",
        }}
      />
    );

    return (
      <div style={containerStyle}>
        <div
          style={{
            position: "relative",
            height: `${EYE_H}px`,
            display: "flex",
            alignItems: "center",
            gap: `${SLEEPY_GAP}px`,
          }}
        >
          {bar(0)}
          {bar(1)}
          {/* Huruf Z mengapung naik-kanan; titik tertingginya sudah pudar (opacity 0),
              jadi tidak perlu ruang di luar kotak notch. */}
          <div
            className="animate-float-z-1"
            style={{ position: "absolute", left: "61px", top: "6px", fontSize: "13px", fontWeight: 700, color: "#a1a1aa" }}
          >
            Z
          </div>
          <div
            className="animate-float-z-2"
            style={{ position: "absolute", left: "73px", top: "13px", fontSize: "10px", fontWeight: 700, color: "#8a8a93" }}
          >
            z
          </div>
        </div>
      </div>
    );
  }

  if (mood === "sad") {
    const eye = (key: number, rotate: string) => (
      <div
        key={key}
        style={{
          width: `${SAD_SIZE}px`,
          height: `${SAD_SIZE}px`,
          transform: `translate(${tx}px, ${ty}px)`,
          transition: "transform 90ms ease-out",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: `${EYE_RADIUS}px`,
            background: SAD_GRADIENT,
            boxShadow: SAD_GLOW,
            transform: `rotate(${rotate})`,
          }}
        />
      </div>
    );

    return (
      <div style={containerStyle}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: `${SAD_GAP}px` }}>
          {eye(0, "-14deg")}
          {eye(1, "14deg")}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              // Digeser 2px ke luar dari mata kiri, tepat di bawah sudutnya.
              left: "-2px",
              // Ditahan lebih tinggi dari referensi: tinggi notch cuma 40px, kalau
              // dipakai apa adanya air mata hampir menyentuh tepi bawah.
              top: "17px",
              width: "6px",
              height: "7px",
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "#FFD58A",
              opacity: 0.9,
            }}
          />
        </div>
      </div>
    );
  }

  const eye = (key: number) => (
    // Wrapper luar memegang animasi kedip; bagian dalam memegang arah pandang,
    // supaya keduanya tidak saling menimpa `transform`.
    <div key={key} className="animate-robot-blink" style={{ width: `${EYE_W}px`, height: `${EYE_H}px` }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: `${EYE_RADIUS}px`,
          background: FACE_GRADIENT,
          boxShadow: FACE_GLOW,
          transform: `translate(${tx}px, ${ty}px) scale(${sc}, ${sc})`,
          transition: "transform 90ms ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "4px",
            top: "4px",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: `${EYE_GAP}px` }}>
        {eye(0)}
        {eye(1)}
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "visible",
};
