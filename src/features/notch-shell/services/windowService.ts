import { invoke } from "@tauri-apps/api/core";

export const setNotchSize = (width: number, height: number) =>
  invoke("set_notch_size", { width, height });

export const getWindowsUsername = () => invoke<string>("get_windows_username");
