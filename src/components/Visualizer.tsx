import React from "react";

interface VisualizerProps {
  isPlaying: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying }) => {
  return (
    <div className="flex items-center gap-[2px] h-3 px-1">
      <span
        className={`w-[2.5px] bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.5)] rounded-full transition-all duration-300 ${
          isPlaying ? "animate-sound-bar-1" : "h-[3px]"
        }`}
      />
      <span
        className={`w-[2.5px] bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.5)] rounded-full transition-all duration-300 ${
          isPlaying ? "animate-sound-bar-2" : "h-[6px]"
        }`}
      />
      <span
        className={`w-[2.5px] bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.5)] rounded-full transition-all duration-300 ${
          isPlaying ? "animate-sound-bar-3" : "h-[4px]"
        }`}
      />
      <span
        className={`w-[2.5px] bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.5)] rounded-full transition-all duration-300 ${
          isPlaying ? "animate-sound-bar-4" : "h-[2px]"
        }`}
      />
    </div>
  );
};
