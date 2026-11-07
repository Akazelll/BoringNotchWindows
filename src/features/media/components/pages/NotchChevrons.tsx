import React from "react";

interface NotchChevronsProps {
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}

/** Dua tombol chevron kiri/kanan. Guard `!isLyricsOpen` tetap di ExpandedCard. */
export const NotchChevrons: React.FC<NotchChevronsProps> = ({ onPrev, onNext }) => {
  return (
    <>
    <button
      onClick={onPrev}
      aria-label="Halaman sebelumnya"
      style={{
        position: "absolute",
        left: "10px",
        top: "50%",
        marginTop: "-13px",
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        cursor: "pointer",
        zIndex: 20,
      }}
      className="hover:bg-white/20 active:scale-90 transition"
      title="Halaman Sebelumnya"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>

    <button
      onClick={onNext}
      aria-label="Halaman berikutnya"
      style={{
        position: "absolute",
        right: "10px",
        top: "50%",
        marginTop: "-13px",
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        cursor: "pointer",
        zIndex: 20,
      }}
      className="hover:bg-white/20 active:scale-90 transition"
      title="Halaman Berikutnya"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
    </>
  );
};
