import React from "react";

interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percent,
  size = 54,
  strokeWidth = 5,
  strokeColor = "#38bdf8",
  trackColor = "#22252e",
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (validPercent / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

export const CustomBatteryPill: React.FC<{ level: number; isCharging: boolean }> = ({
  level,
  isCharging,
}) => {
  return (
    <div className="flex items-center gap-1.5 bg-[#16181f] border border-white/10 rounded-full px-2.5 py-1 flex-shrink-0 shadow-inner">
      <div className="relative w-4 h-2 border border-white/50 rounded-[2px] p-[1px] flex items-center">
        <div
          style={{ width: `${Math.min(100, Math.max(8, level))}%` }}
          className={`h-full rounded-[1px] ${
            isCharging
              ? "bg-[#38bdf8] animate-pulse"
              : level <= 20
              ? "bg-red-400"
              : "bg-[#38bdf8]"
          }`}
        />
        <div className="absolute -right-[2.5px] top-[1.5px] w-[1.5px] h-[3px] bg-white/50 rounded-r-[0.5px]" />
      </div>
      <span className="text-[11px] font-bold tracking-tight text-white/95">
        {level}%
      </span>
    </div>
  );
};
