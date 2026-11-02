import React from "react";

interface VisualizerProps {
  isPlaying: boolean;
  color?: string;
  className?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  color = "#ffffff",
  className = "",
}) => {
  if (!isPlaying) {
    // 2-Bar Pause Symbol matching Image 2 ("Dijeda")
    return (
      <div className={`flex items-center gap-[3px] h-3 px-1 ${className}`}>
        <span
          style={{ backgroundColor: color }}
          className="w-[2.5px] h-[9px] rounded-full opacity-90 transition-all duration-300"
        />
        <span
          style={{ backgroundColor: color }}
          className="w-[2.5px] h-[9px] rounded-full opacity-90 transition-all duration-300"
        />
      </div>
    );
  }

  // 4-Bar Sound Wave Equalizer matching Image 2 ("Memutar")
  return (
    <div className={`flex items-center gap-[2.5px] h-3 px-1 ${className}`}>
      <span
        style={{ backgroundColor: color }}
        className="w-[2.5px] rounded-full transition-all duration-300 animate-sound-bar-1"
      />
      <span
        style={{ backgroundColor: color }}
        className="w-[2.5px] rounded-full transition-all duration-300 animate-sound-bar-2"
      />
      <span
        style={{ backgroundColor: color }}
        className="w-[2.5px] rounded-full transition-all duration-300 animate-sound-bar-3"
      />
      <span
        style={{ backgroundColor: color }}
        className="w-[2.5px] rounded-full transition-all duration-300 animate-sound-bar-4"
      />
    </div>
  );
};
