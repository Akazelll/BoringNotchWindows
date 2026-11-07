import React from "react";
import type { AppNotification, BatteryInfo, CallInfo, MediaInfo, RobotMood, BluetoothDeviceEvent } from "../../../shared/types";
import type { ChargingBannerMode } from "../../../shared/types";
import type { PomodoroController } from "../../pomodoro";
import type { PrayerBannerState, PrayerController } from "../../prayer";
import { PrayerBannerPill } from "../../prayer";
import { ExpandedCard, CompactPill } from "../../media";
import type { LyricsHookResult } from "../../media";
import { CallCompactPill, CallExpandedCard } from "../../call";
import { ChargingCompactPill } from "../../hardware-monitor";
import { NotificationCompactPill } from "../../notifications";
import { BluetoothCompactPill } from "../../bluetooth";

export interface NotchContentProps {
  isExpanded: boolean;
  call: CallInfo | null;
  username: string;
  media: MediaInfo | null;
  battery: BatteryInfo;
  pomodoro: PomodoroController;
  prayer: PrayerController;
  prayerBanner: PrayerBannerState | null;
  isPrayerBannerActive: boolean;
  dismissPrayer: () => void;
  lyricsData: LyricsHookResult;
  isLyricsOpen: boolean;
  onToggleLyrics: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  chargingBannerMode: ChargingBannerMode | null;
  isChargingBannerActive: boolean;
  isNotificationActive: boolean;
  dismissCharging: () => void;
  bluetoothEvent: BluetoothDeviceEvent | null;
  isBluetoothBannerActive: boolean;
  dismissBluetooth: () => void;
  currentToast: AppNotification | null;
  dismissToast: () => void;
  cursor: Parameters<typeof CompactPill>[0]["cursor"];
  robotMood: RobotMood;
}

/** Isi notch: prioritas panggilan > banner > pill biasa. JSX pindah apa adanya dari App. */
export const NotchContent: React.FC<NotchContentProps> = ({
  isExpanded,
  call,
  username,
  media,
  battery,
  pomodoro,
  prayer,
  prayerBanner,
  isPrayerBannerActive,
  dismissPrayer,
  lyricsData,
  isLyricsOpen,
  onToggleLyrics,
  onPlayPause,
  onNext,
  onPrev,
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
  chargingBannerMode,
  isChargingBannerActive,
  isNotificationActive,
  dismissCharging,
  bluetoothEvent,
  isBluetoothBannerActive,
  dismissBluetooth,
  currentToast,
  dismissToast,
  cursor,
  robotMood,
}) => {
  return (
    <>
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
          onPlayPause={onPlayPause}
          onNext={onNext}
          onPrev={onPrev}
          isLyricsOpen={isLyricsOpen}
          onToggleLyrics={onToggleLyrics}
          pomodoro={pomodoro}
          prayer={prayer}
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
    ) : isPrayerBannerActive && prayerBanner ? (
      <PrayerBannerPill
        prayer={prayerBanner.key}
        time={prayerBanner.time}
        onDismiss={dismissPrayer}
      />
    ) : isChargingBannerActive && chargingBannerMode ? (
      <ChargingCompactPill
        battery={battery}
        mode={chargingBannerMode}
        onDismiss={dismissCharging}
      />
    ) : isBluetoothBannerActive && bluetoothEvent ? (
      <BluetoothCompactPill
        event={bluetoothEvent}
        onDismiss={dismissBluetooth}
      />
    ) : isNotificationActive && currentToast ? (
      <NotificationCompactPill
        notification={currentToast}
        onDismiss={dismissToast}
      />
    ) : (
      <CompactPill
        media={media}
        battery={battery}
        currentToast={currentToast}
        onDismissToast={dismissToast}
        bluetoothEvent={bluetoothEvent}
        onDismissBluetooth={dismissBluetooth}
        pomodoro={pomodoro}
        cursor={cursor}
        mood={robotMood}
      />
    )}
    </>
  );
};
