import React from "react";

interface LyricsPanelProps {
  isLyricsOpen: boolean;
  isLoading: boolean;
  currentLine: string;
  nextLine1: string;
  nextLine2: string;
  lyrics: { timeSec: number; text: string }[];
  plainLines: string[];
  plainIndex: number;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  isLyricsOpen,
  isLoading,
  currentLine,
  nextLine1,
  nextLine2,
  lyrics,
  plainLines,
  plainIndex,
}) => {
  return (
    <>
    {/* ─── LYRICS PANEL (60% Grid) ─── */}
    <div
      style={{
        position: "relative",
        flex: isLyricsOpen ? "6 6 0px" : "0 0 0px",
        width: isLyricsOpen ? "60%" : "0px",
        maxWidth: isLyricsOpen ? "60%" : "0px",
        opacity: isLyricsOpen ? 1 : 0,
        transform: isLyricsOpen ? "translateX(0px)" : "translateX(35px)",
        pointerEvents: isLyricsOpen ? "auto" : "none",
        minWidth: 0,
        marginLeft: isLyricsOpen ? "24px" : "0px",
        paddingLeft: isLyricsOpen ? "24px" : "0px",
        borderLeft: isLyricsOpen ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "14px",
        overflow: "hidden",
        WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
        transition: "flex 350ms cubic-bezier(0.16, 1, 0.3, 1), max-width 350ms cubic-bezier(0.16, 1, 0.3, 1), width 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1), margin-left 350ms cubic-bezier(0.16, 1, 0.3, 1), padding-left 350ms cubic-bezier(0.16, 1, 0.3, 1), border-left-color 300ms ease",
      }}
    >
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a1a1aa", fontSize: "13px" }}>
          <span className="w-3.5 h-3.5 border-2 border-[#5AA2FF] border-t-transparent rounded-full animate-spin" />
          <span>Mencari lirik lagu...</span>
        </div>
      ) : lyrics.length > 0 ? (
        <>
          <div style={{ fontSize: "21px", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.015em", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentLine || "♪ Musik Berjalan ♪"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {nextLine1 || "• • •"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {nextLine2 || "• • •"}
          </div>
        </>
      ) : plainLines.length > 0 ? (
        <>
          <div style={{ fontSize: "21px", fontWeight: 700, lineHeight: 1.25, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {plainLines[plainIndex] || "♪ Musik Berjalan ♪"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {plainLines[plainIndex + 1] || "• • •"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {plainLines[plainIndex + 2] || "• • •"}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>Lirik tidak ditemukan</div>
          <div style={{ fontSize: "12px", color: "#8a8a93" }}>Memutar audio SMTC Windows</div>
        </div>
      )}
    </div>
    </>
  );
};
