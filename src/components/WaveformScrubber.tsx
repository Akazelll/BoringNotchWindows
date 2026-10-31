import React from "react";

interface WaveformScrubberProps {
  positionSec: number;
  durationSec: number;
}

// Preset organic waveform bar heights (percentage of container height)
const BAR_HEIGHTS = [
  25, 45, 60, 40, 50, 75, 55, 42, 68, 85, 50, 38, 62, 78, 48, 35, 58, 82,
  95, 65, 48, 70, 88, 60, 44, 66, 80, 52, 40, 64, 76, 50, 36, 55, 72, 42,
  30, 48, 65, 38,
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({
  positionSec,
  durationSec,
}) => {
  const totalBars = BAR_HEIGHTS.length;
  const progressRatio = durationSec > 0 ? Math.min(1, positionSec / durationSec) : 0;
  const activeBarsCount = Math.round(progressRatio * totalBars);

  return (
    <div className="w-full flex flex-col gap-0.5 select-none my-0.5">
      {/* Waveform Bar Track */}
      <div className="w-full flex items-center justify-between h-5 px-0.5">
        {BAR_HEIGHTS.map((heightPercent, index) => {
          const isActive = index < activeBarsCount;
          return (
            <div
              key={index}
              className="flex-1 flex items-center justify-center h-full px-[1px]"
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-full transition-colors duration-200 ${
                  isActive ? "bg-[#38bdf8]" : "bg-[#222222]"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Timestamps */}
      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 font-medium px-0.5 leading-none">
        <span>{formatTime(positionSec)}</span>
        <span>{formatTime(durationSec)}</span>
      </div>
    </div>
  );
};
