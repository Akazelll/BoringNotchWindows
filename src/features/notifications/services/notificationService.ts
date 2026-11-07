import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppNotification } from "../../../shared/types";

export const getActiveNotifications = () =>
  invoke<AppNotification[]>("get_active_notifications");

export const triggerNotificationTest = (
  appName?: string,
  title?: string,
  message?: string
) => invoke("trigger_notification_test", { appName, title, message });

export function onNotificationsChanged(handler: (items: AppNotification[]) => void) {
  return listen<AppNotification[]>("notifications-changed", (event) => {
    if (Array.isArray(event.payload)) handler(event.payload);
  });
}