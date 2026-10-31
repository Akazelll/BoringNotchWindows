import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMedia } from "./hooks/useMedia";
import { useBattery } from "./hooks/useBattery";
import { useNotifications } from "./hooks/useNotifications";
import { useSystemStats } from "./hooks/useSystemStats";
import { useCall } from "./hooks/useCall";
import {
  useWindowResize,
  COMPACT_WIDTH,
  COMPACT_HEIGHT,
  EXPANDED_WIDTH,
  EXPANDED_HEIGHT,
} from "./hooks/useWindowResize";
import { CompactPill } from "./components/CompactPill";
import { ExpandedCard } from "./components/ExpandedCard";
import { CallCompactPill } from "./components/CallCompactPill";
import { CallExpandedCard } from "./components/CallExpandedCard";
import { NotchState, NotchViewMode } from "./types";

export default function App() {
  const [state, setState] = useState<NotchState>("compact");
  const [viewMode, setViewMode] = useState<NotchViewMode>("player");
  const [username, setUsername] = useState<string>("User");
  const leaveTimerRef = useRef<number | null>(null);

  const { media, togglePlayPause, nextTrack, prevTrack } = useMedia();
  const battery = useBattery();
  const { notifications, currentToast, dismissToast } = useNotifications();
  const stats = useSystemStats();
  const {
    call,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  } = useCall();

  // Fetch logged in Windows username
  useEffect(() => {
    invoke<string>("get_windows_username")
      .then((u) => {
        if (u) setUsername(u);
      })
      .catch(() => {});
  }, []);

  // When an incoming call arrives, smoothly expand the notch to highlight the call
  useEffect(() => {
    if (call && call.state === "incoming") {
      setState("expanded");
    }
  }, [call?.state]);

  // Resize Tauri native window
  useWindowResize(state, viewMode);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setState("expanded");
  };

  const handleMouseLeave = () => {
    // If incoming call is ringing, stay expanded until answered or declined
    if (call && call.state === "incoming") return;

    leaveTimerRef.current = window.setTimeout(() => {
      setState("compact");
      setViewMode("player");
    }, 150);
  };

  const handlePillClick = () => {
    if (state === "compact") {
      setState("expanded");
    }
  };

  const isExpanded = state === "expanded";
  const currentWidth = isExpanded ? EXPANDED_WIDTH : COMPACT_WIDTH;
  const currentHeight = isExpanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT;

  return (
    <div className="w-screen h-screen flex justify-center items-start overflow-hidden bg-transparent p-0 m-0">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handlePillClick}
        style={{
          width: `${currentWidth}px`,
          height: `${currentHeight}px`,
        }}
        className={`
          notch-solid relative flex items-center justify-center transition-all duration-200 ease-out
          rounded-t-none rounded-b-[14px] overflow-hidden
          ${isExpanded ? "cursor-default" : "cursor-pointer"}
        `}
      >
        {isExpanded ? (
          call ? (
            <CallExpandedCard
              call={call}
              username={username}
              onAccept={acceptCall}
              onDecline={declineCall}
              onEnd={endCall}
              onToggleMute={toggleMute}
            />
          ) : (
            <ExpandedCard
              media={media}
              battery={battery}
              stats={stats}
              notifications={notifications}
              username={username}
              onPlayPause={togglePlayPause}
              onNext={nextTrack}
              onPrev={prevTrack}
              viewMode={viewMode}
              onToggleViewMode={setViewMode}
            />
          )
        ) : call ? (
          <CallCompactPill
            call={call}
            onAccept={acceptCall}
            onDecline={declineCall}
            onEnd={endCall}
          />
        ) : (
          <CompactPill
            media={media}
            battery={battery}
            stats={stats}
            currentToast={currentToast}
            onDismissToast={dismissToast}
          />
        )}
      </div>
    </div>
  );
}
