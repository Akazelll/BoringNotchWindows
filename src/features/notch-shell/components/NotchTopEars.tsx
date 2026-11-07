import React from "react";

interface NotchTopEarsProps {
  fillColor?: string;
  radius?: number;
  isExpanded?: boolean;
}

/**
 * Top inverted rounded corners (concave fillets / "rounded terbalik ke dalam notch")
 * Supports dynamic radius (e.g. 12px in compact mode, 16px in expanded mode).
 * Colors match .notch-solid (background #09090b and hairline stroke rgba(255,255,255,0.08)).
 */
export const NotchTopEars: React.FC<NotchTopEarsProps> = ({
  fillColor = "rgba(9, 9, 11, var(--notch-opacity, 1.0))",
  radius = 12,
  isExpanded = false,
}) => {
  const transitionClass = isExpanded
    ? "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
    : "transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]";

  return (
    <>
      {/* Top-Left Inverted Fillet Ear */}
      <svg
        width={radius + 1}
        height={radius}
        viewBox={`0 0 ${radius + 1} ${radius}`}
        fill="none"
        style={{ left: `-${radius}px` }}
        className={`absolute top-0 pointer-events-none z-30 ${transitionClass}`}
      >
        {/* Dynamic fill covering corner matching notch-solid transparency */}
        <path
          d={`M 0,0 L ${radius + 1},0 L ${radius + 1},${radius} L ${radius},${radius} A ${radius},${radius} 0 0,0 0,0 Z`}
          fill={fillColor}
          style={{ fill: fillColor }}
        />
        {/* Continuous 1px outer curved border stroke matching notch-solid border */}
        <path
          d={`M 0,0 A ${radius},${radius} 0 0,1 ${radius},${radius}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
      </svg>

      {/* Top-Right Inverted Fillet Ear (exact mirror) */}
      <svg
        width={radius + 1}
        height={radius}
        viewBox={`-1 0 ${radius + 1} ${radius}`}
        fill="none"
        style={{ right: `-${radius}px` }}
        className={`absolute top-0 pointer-events-none z-30 ${transitionClass}`}
      >
        {/* Dynamic fill covering corner matching notch-solid transparency */}
        <path
          d={`M -1,0 L ${radius},0 A ${radius},${radius} 0 0,0 0,${radius} L -1,${radius} Z`}
          fill={fillColor}
          style={{ fill: fillColor }}
        />
        {/* Continuous 1px outer curved border stroke matching notch-solid border */}
        <path
          d={`M 0,${radius} A ${radius},${radius} 0 0,1 ${radius},0`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
      </svg>
    </>
  );
};
