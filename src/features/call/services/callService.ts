import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppNotification, CallInfo } from "../../../shared/types";

export interface ActiveCallPayload {
  callerName?: string;
  callerNumber?: string;
  appSource?: CallInfo["appSource"];
  state?: CallInfo["state"];
  notifId?: number;
  /** Logo aplikasi sumber sebagai data URL; lihat `CallInfo.appLogo`. */
  logo?: string;
}

export function getActiveCall(): Promise<ActiveCallPayload | null> {
  return invoke<ActiveCallPayload | null>("get_active_call");
}

export async function answerSystemCall(): Promise<void> {
  await invoke("answer_system_call").catch((err) => {
    console.error("answer_system_call:", err);
  });
}

export async function declineSystemCall(): Promise<void> {
  await invoke("decline_system_call").catch((err) => {
    console.error("decline_system_call:", err);
  });
}

export function endSystemCall(): Promise<void> {
  return invoke("end_system_call");
}

export function onCallStateChanged(
  handler: (payload: unknown) => void
): Promise<() => void> {
  return listen("call-state-changed", (event) => handler(event.payload));
}

export function onNotificationsChanged(
  handler: (payload: AppNotification[]) => void
): Promise<() => void> {
  return listen<AppNotification[]>("notifications-changed", (event) => {
    if (Array.isArray(event.payload)) handler(event.payload);
  });
}