import type React from "react";

// Path gagang telepon yang sama dipakai di semua tombol panggilan; rotasi yang membedakan.
export const PHONE_PATH =
  "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z";

/**
 * Tombol ikon bulat. `size` wajib disetel per pemanggil: kartu expanded tingginya 74px
 * dan memakai 42px, sedangkan pill ringkas hanya 43px sehingga 42px akan mentok tepi.
 */
export const iconBtnStyle = (
  background: string,
  boxShadow?: string,
  size: number = 42
): React.CSSProperties => ({
  width: `${size}px`,
  height: `${size}px`,
  flexShrink: 0,
  borderRadius: "50%",
  border: "none",
  background,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: "pointer",
  boxShadow,
});

