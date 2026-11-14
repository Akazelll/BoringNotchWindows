import React from "react";

interface PageDotsProps {
  currentPage: number;
  totalPages?: number;
  onSelect: (idx: number) => void;
}

/** Titik pagination bawah. Guard `!isLyricsOpen` tetap di ExpandedCard. */
export const PageDots: React.FC<PageDotsProps> = ({
  currentPage,
  totalPages = 5,
  onSelect,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px",
        width: "100%",
        height: "14px",
        marginTop: "4px",
        zIndex: 10,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: totalPages }, (_, idx) => {
        const isActive = currentPage === idx;
        return (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(idx);
            }}
            style={{
              width: isActive ? "16px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: isActive ? "#ffffff" : "rgba(255,255,255,0.25)",
              transition: "all 0.25s ease-out",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            aria-label={`Halaman ${idx + 1}`}
          />
        );
      })}
    </div>
  );
};
