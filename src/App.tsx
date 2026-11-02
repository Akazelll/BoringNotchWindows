import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMedia } from "./hooks/useMedia";
import { useBattery } from "./hooks/useBattery";
import { useNotifications } from "./hooks/useNotifications";
import { useSystemStats } from "./hooks/useSystemStats";
import { useCall } from "./hooks/useCall";
import { useOpacity } from "./hooks/useOpacity";
import { useBluetooth } from "./hooks/useBluetooth";
import { usePomodoro } from "./hooks/usePomodoro";
import { useLyrics } from "./hooks/useLyrics";
import {
  useWindowResize,
  COMPACT_MEDIA_WIDTH,
  COMPACT_IDLE_WIDTH,
  COMPACT_HEIGHT,
  NOTIFICATION_BANNER_WIDTH,
  NOTIFICATION_BANNER_HEIGHT,
  BLUETOOTH_BANNER_WIDTH,
  BLUETOOTH_BANNER_HEIGHT,
  EXPANDED_WIDTH,
  EXPANDED_HEIGHT,
  EXPANDED_LYRICS_WIDTH,
  EXPANDED_LYRICS_HEIGHT,
  CALL_EXPANDED_WIDTH,
  CALL_EXPANDED_HEIGHT,
} from "./hooks/useWindowResize";
import { CompactPill } from "./components/CompactPill";
import { ExpandedCard } from "./components/ExpandedCard";
import { CallCompactPill } from "./components/CallCompactPill";
import { CallExpandedCard } from "./components/CallExpandedCard";
import { NotchTopEars } from "./components/NotchTopEars";
import { NotchState } from "./types";

export default function App() {
  const [state, setState] = useState<NotchState>("compact");
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("User");
  const enterTimerRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  const { media, togglePlayPause, nextTrack, prevTrack } = useMedia();
  const battery = useBattery();
  const { notifications, currentToast, dismissToast } = useNotifications();
  const stats = useSystemStats();
  useOpacity(); // Maintains CSS variables --notch-opacity & --notch-blur from localStorage and System Tray
  const {
    call,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  } = useCall();

  const {
    bluetoothEvent,
    isBluetoothBannerActive,
    dismiss: dismissBluetooth,
  } = useBluetooth();

  const pomodoro = usePomodoro();
  const lyricsData = useLyrics(media); // Background pre-fetching as soon as music plays

  // Fetch logged in Windows username
  useEffect(() => {
    invoke<string>("get_windows_username")
      .then((u) => {
        if (u) setUsername(u);
      })
      .catch(() => {});
  }, []);

  // When an incoming call arrives, smoothly expand the notch to highlight the call.
  // When the call dismisses/cancels without being answered, collapse back to compact.
  useEffect(() => {
    if (call && call.state === "incoming") {
      setState("expanded");
    } else if (!call) {
      setState("compact");
    }
  }, [call?.state]);

  const isExpanded = state === "expanded";
  const isMediaPlaying = !!media && (media.isPlaying || !!media.title);
  const isNotificationActive = !!currentToast;
  const isCallActive = !!call;

  let currentWidth: number;
  let currentHeight: number;
  let notchRadiusClass: string;

  if (isExpanded) {
    if (isCallActive) {
      currentWidth = CALL_EXPANDED_WIDTH;
      currentHeight = CALL_EXPANDED_HEIGHT;
      notchRadiusClass = "rounded-b-[36px]";
    } else if (isLyricsOpen) {
      currentWidth = EXPANDED_LYRICS_WIDTH;
      currentHeight = EXPANDED_LYRICS_HEIGHT;
      notchRadiusClass = "rounded-b-[36px]";
    } else {
      currentWidth = EXPANDED_WIDTH;
      currentHeight = EXPANDED_HEIGHT;
      notchRadiusClass = "rounded-b-[36px]";
    }
  } else {
    if (isBluetoothBannerActive) {
      currentWidth = BLUETOOTH_BANNER_WIDTH;
      currentHeight = BLUETOOTH_BANNER_HEIGHT;
      notchRadiusClass = "rounded-b-[24px]";
    } else if (isNotificationActive) {
      currentWidth = NOTIFICATION_BANNER_WIDTH;
      currentHeight = NOTIFICATION_BANNER_HEIGHT;
      notchRadiusClass = "rounded-b-[24px]";
    } else if (isMediaPlaying) {
      currentWidth = COMPACT_MEDIA_WIDTH;
      currentHeight = COMPACT_HEIGHT;
      notchRadiusClass = "rounded-b-[24px]";
    } else {
      currentWidth = COMPACT_IDLE_WIDTH;
      currentHeight = COMPACT_HEIGHT;
      notchRadiusClass = "rounded-b-[24px]";
    }
  }

  // Resize Tauri native window
  useWindowResize(
    state,
    isLyricsOpen,
    isMediaPlaying,
    isBluetoothBannerActive,
    isNotificationActive,
    isCallActive
  );

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    setState("expanded");
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }

    // If incoming call is ringing, stay expanded until answered or declined
    if (call && call.state === "incoming") return;

    leaveTimerRef.current = window.setTimeout(() => {
      setState("compact");
      setIsLyricsOpen(false);
      leaveTimerRef.current = null;
    }, 180);
  };

  const handlePillClick = () => {
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (state === "compact") {
      setState("expanded");
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-start overflow-hidden bg-transparent p-0 m-0">
      {/* Outer wrapper to anchor the top inverted fillet ears */}
      <div className="relative flex justify-center items-start">
        <NotchTopEars radius={isExpanded ? 16 : 12} isExpanded={isExpanded} />
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handlePillClick}
          style={{
            width: `${currentWidth}px`,
            height: `${currentHeight}px`,
          }}
          className={`
            notch-solid box-border relative flex items-center justify-center transition-all ${
              isExpanded
                ? "duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                : "duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
            }
            rounded-t-none ${notchRadiusClass} overflow-hidden
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
                isLyricsOpen={isLyricsOpen}
                onToggleLyrics={() => setIsLyricsOpen((prev) => !prev)}
                pomodoro={pomodoro}
                lyricsData={lyricsData}
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
              bluetoothEvent={bluetoothEvent}
              onDismissBluetooth={dismissBluetooth}
              pomodoro={pomodoro}
            />
          )}
        </div>
      </div>
    </div>
  );
}
