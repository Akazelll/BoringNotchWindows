import { useState, useEffect } from "react";
import { useMedia, useLyrics } from "../features/media";
import { useCall } from "../features/call";
import { usePomodoro } from "../features/pomodoro";
import { useCursor } from "../features/robot";
import { useOpacity } from "../features/appearance";
import { useBattery } from "../features/hardware-monitor";
import { usePrayer } from "../features/prayer";
import { useWeather } from "../features/weather";
import { useNotifications } from "../features/notifications";
import { useBluetooth } from "../features/bluetooth";
import {
  useWindowResize,
  useChargingBanner,
  getNotchDimensions,
  getNotchShadow,
  getEarRadius,
  useNotchHover,
  NotchTopEars,
  NotchContent,
} from "../features/notch-shell";
import { getWindowsUsername } from "../features/notch-shell/services/windowService";
import { NotchState, RobotMood } from "../shared/types";

/** Di bawah persentase ini wajah robot jadi sedih — selama tidak sedang dicas. */
const LOW_BATTERY = 20;

export default function App() {
  const [state, setState] = useState<NotchState>("compact");
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("User");
  const { media, togglePlayPause, nextTrack, prevTrack } = useMedia();
  const { battery, isReady: isBatteryReady } = useBattery();
  const { currentToast, dismissToast } = useNotifications();
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
  const prayer = usePrayer(state === "expanded");
  const weather = useWeather(state === "expanded");
  const lyricsData = useLyrics(media); // Background pre-fetching as soon as music plays

  const cursor = useCursor();
  // Priority bila beberapa kondisi terpenuhi: baterai rendah > kursor diam > normal.
  const robotMood: RobotMood =
    battery.level < LOW_BATTERY && !battery.isCharging
      ? "sad"
      : cursor.isIdle
      ? "sleepy"
      : "normal";

  const { chargingBannerMode, dismissCharging, isChargingBannerActive } =
    useChargingBanner(battery, isBatteryReady);

  // Fetch logged in Windows username
  useEffect(() => {
    getWindowsUsername()
      .then((u) => {
        if (u) setUsername(u);
      })
      .catch(() => {});
  }, []);

  // Panggilan berdering atau sedang memanggil: bentangkan notch untuk menyorot panggilan.
  // Saat panggilan batal tanpa diangkat, kembali ke compact.
  useEffect(() => {
    if (call && (call.state === "incoming" || call.state === "outgoing")) {
      setState("expanded");
    } else if (!call) {
      setState("compact");
    }
  }, [call?.state]);

  const isExpanded = state === "expanded";
  const isMediaPlaying = !!media && (media.isPlaying || !!media.title);
  const isNotificationActive = !!currentToast;
  const isCallActive = !!call;
  const isPrayerBannerActive = prayer.isPrayerBannerActive;

  const { width: currentWidth, height: currentHeight, notchRadiusClass } =
    getNotchDimensions(
      state,
      isLyricsOpen,
      isMediaPlaying,
      isBluetoothBannerActive,
      isNotificationActive,
      isCallActive,
      isChargingBannerActive,
      isPrayerBannerActive
    );

  // Resize Tauri native window
  useWindowResize(
    state,
    isLyricsOpen,
    isMediaPlaying,
    isBluetoothBannerActive,
    isNotificationActive,
    isCallActive,
    isChargingBannerActive,
    isPrayerBannerActive
  );

  const { handleMouseEnter, handleMouseLeave, handlePillClick } = useNotchHover(
    state,
    call,
    setState,
    setIsLyricsOpen
  );

  return (
    <div className="w-screen h-screen flex justify-center items-start overflow-hidden bg-transparent p-0 m-0">
      {/* Outer wrapper to anchor the top inverted fillet ears */}
      <div className="relative flex justify-center items-start">
        <NotchTopEars
          radius={getEarRadius(
            isExpanded,
            isChargingBannerActive,
            isBluetoothBannerActive,
            isNotificationActive,
            isPrayerBannerActive
          )}
          isExpanded={isExpanded}
        />
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handlePillClick}
          style={{
            width: `${currentWidth}px`,
            height: `${currentHeight}px`,
            boxShadow: getNotchShadow({
              isCallActive,
              call,
              isExpanded,
              chargingBannerMode,
              isBluetoothBannerActive,
              isNotificationActive,
              isPrayerBannerActive,
              currentToast,
              robotMood,
            }),
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
          <NotchContent
            isExpanded={isExpanded}
            call={call}
            username={username}
            media={media}
            battery={battery}
            pomodoro={pomodoro}
            prayer={prayer}
            weather={weather}
            prayerBanner={prayer.banner}
            isPrayerBannerActive={isPrayerBannerActive}
            dismissPrayer={prayer.dismissBanner}
            lyricsData={lyricsData}
            isLyricsOpen={isLyricsOpen}
            onToggleLyrics={() => setIsLyricsOpen((prev) => !prev)}
            onPlayPause={togglePlayPause}
            onNext={nextTrack}
            onPrev={prevTrack}
            acceptCall={acceptCall}
            declineCall={declineCall}
            endCall={endCall}
            toggleMute={toggleMute}
            chargingBannerMode={chargingBannerMode}
            isChargingBannerActive={isChargingBannerActive}
            isNotificationActive={isNotificationActive}
            dismissCharging={dismissCharging}
            bluetoothEvent={bluetoothEvent}
            isBluetoothBannerActive={isBluetoothBannerActive}
            dismissBluetooth={dismissBluetooth}
            currentToast={currentToast}
            dismissToast={dismissToast}
            cursor={cursor}
            robotMood={robotMood}
          />
        </div>
      </div>
    </div>
  );
}
