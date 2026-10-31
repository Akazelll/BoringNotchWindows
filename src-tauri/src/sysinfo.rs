use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use windows::Win32::Foundation::FILETIME;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub cpu_percent: u8,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub ram_percent: u8,
    pub disk_used_gb: f32,
    pub disk_total_gb: f32,
    pub disk_percent: u8,
}

static CPU_TIMES: Mutex<Option<(u64, u64)>> = Mutex::new(None); // (idle, total)

fn filetime_to_u64(ft: FILETIME) -> u64 {
    ((ft.dwHighDateTime as u64) << 32) | (ft.dwLowDateTime as u64)
}

#[cfg(windows)]
pub fn get_system_stats() -> SystemStats {
    use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    use windows::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;
    use windows::Win32::System::Threading::GetSystemTimes;
    use windows::core::PCWSTR;

    // 1. CPU Calculation
    let mut cpu_percent = 0u8;
    let mut idle = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();

    unsafe {
        if GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user)).is_ok() {
            let cur_idle = filetime_to_u64(idle);
            let cur_total = filetime_to_u64(kernel) + filetime_to_u64(user);

            let mut lock = CPU_TIMES.lock().unwrap();
            if let Some((last_idle, last_total)) = *lock {
                let idle_diff = cur_idle.saturating_sub(last_idle);
                let total_diff = cur_total.saturating_sub(last_total);
                if total_diff > 0 {
                    let busy = total_diff.saturating_sub(idle_diff);
                    cpu_percent = (busy as f64 / total_diff as f64 * 100.0).clamp(0.0, 100.0) as u8;
                }
            }
            *lock = Some((cur_idle, cur_total));
        }
    }

    // 2. RAM Calculation
    let mut ram_used_gb = 0.0f32;
    let mut ram_total_gb = 0.0f32;
    let mut ram_percent = 0u8;

    unsafe {
        let mut mem = MEMORYSTATUSEX::default();
        mem.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        if GlobalMemoryStatusEx(&mut mem).is_ok() {
            let total = mem.ullTotalPhys as f64 / (1024.0 * 1024.0 * 1024.0);
            let free = mem.ullAvailPhys as f64 / (1024.0 * 1024.0 * 1024.0);
            ram_total_gb = (total as f32 * 10.0).round() / 10.0;
            ram_used_gb = ((total - free) as f32 * 10.0).round() / 10.0;
            ram_percent = mem.dwMemoryLoad as u8;
        }
    }

    // 3. Disk Calculation (C:\)
    let mut disk_used_gb = 0.0f32;
    let mut disk_total_gb = 0.0f32;
    let mut disk_percent = 0u8;

    unsafe {
        let drive: Vec<u16> = "C:\\\0".encode_utf16().collect();
        let mut total_bytes = 0u64;
        let mut total_free_bytes = 0u64;
        if GetDiskFreeSpaceExW(
            PCWSTR(drive.as_ptr()),
            None,
            Some(&mut total_bytes),
            Some(&mut total_free_bytes),
        ).is_ok() {
            let total = total_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
            let free = total_free_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
            disk_total_gb = (total as f32 * 10.0).round() / 10.0;
            disk_used_gb = ((total - free) as f32 * 10.0).round() / 10.0;
            if total > 0.0 {
                disk_percent = ((total - free) / total * 100.0) as u8;
            }
        }
    }

    SystemStats {
        cpu_percent,
        ram_used_gb,
        ram_total_gb,
        ram_percent,
        disk_used_gb,
        disk_total_gb,
        disk_percent,
    }
}

#[cfg(not(windows))]
pub fn get_system_stats() -> SystemStats {
    SystemStats {
        cpu_percent: 0,
        ram_used_gb: 0.0,
        ram_total_gb: 0.0,
        ram_percent: 0,
        disk_used_gb: 0.0,
        disk_total_gb: 0.0,
        disk_percent: 0,
    }
}

#[cfg(windows)]
pub fn is_video_fullscreen(active_media_source_app: Option<&str>, is_media_playing: bool) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
        GetDesktopWindow, GetShellWindow, GetSystemMetrics, GetWindowLongW,
        GWL_STYLE, WS_CAPTION, WS_MAXIMIZE, SM_CXSCREEN, SM_CYSCREEN,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::Foundation::RECT;
    use windows::core::PWSTR;

    unsafe {
        let fg = GetForegroundWindow();
        if fg.0 == 0 as _ {
            return false;
        }

        let desktop = GetDesktopWindow();
        let shell = GetShellWindow();
        if fg == desktop || fg == shell {
            return false;
        }

        // 1. Check window style: standard MAXIMIZED windows with titlebar (WS_CAPTION) are NOT fullscreen videos!
        let style = GetWindowLongW(fg, GWL_STYLE) as u32;
        let is_standard_maximized = ((style & WS_MAXIMIZE.0) != 0) && ((style & WS_CAPTION.0) == WS_CAPTION.0);
        if is_standard_maximized {
            // This is just a normal maximized application (e.g. Chrome with tabs visible, VS Code, etc.)
            return false;
        }

        // 2. Check window geometry: true fullscreen must completely cover the primary monitor
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);

        let mut rect = RECT::default();
        if GetWindowRect(fg, &mut rect).is_err() {
            return false;
        }

        // True fullscreen covers (or exceeds by border) 0..screen_w and 0..screen_h
        let covers_entire_screen = rect.left <= 0
            && rect.top <= 0
            && rect.right >= screen_w
            && rect.bottom >= screen_h;

        if !covers_entire_screen {
            return false;
        }

        // 3. Determine foreground process executable name
        let mut pid = 0u32;
        GetWindowThreadProcessId(fg, Some(&mut pid));
        if pid == 0 {
            return false;
        }

        let exe_name = if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut buf = [0u16; 1024];
            let mut len = buf.len() as u32;
            if QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_ok() {
                let full_path = String::from_utf16_lossy(&buf[..len as usize]);
                full_path.rsplit('\\').next().unwrap_or(&full_path).to_lowercase()
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        if exe_name.is_empty() {
            return false;
        }

        // 4. Known dedicated video players in true fullscreen (VLC, MPV, PotPlayer, MPC, Windows Media Player)
        let is_known_video_player = exe_name.contains("vlc")
            || exe_name.contains("mpv")
            || exe_name.contains("mpc-hc")
            || exe_name.contains("mpc-be")
            || exe_name.contains("potplayer")
            || exe_name.contains("gom")
            || exe_name.contains("video.ui")
            || exe_name.contains("wmplayer");

        if is_known_video_player {
            return true;
        }

        // 5. Web browsers in TRUE fullscreen playing video/media (e.g. YouTube fullscreen button or F11 with video)
        let is_browser = exe_name.contains("chrome")
            || exe_name.contains("msedge")
            || exe_name.contains("firefox")
            || exe_name.contains("brave")
            || exe_name.contains("opera")
            || exe_name.contains("vivaldi")
            || exe_name.contains("netflix");

        if is_browser {
            // Must have active media playing
            if is_media_playing {
                return true;
            }
            if let Some(src) = active_media_source_app {
                let src_lower = src.to_lowercase();
                if src_lower.contains("chrome")
                    || src_lower.contains("edge")
                    || src_lower.contains("firefox")
                    || src_lower.contains("brave")
                    || src_lower.contains("opera")
                    || src_lower.contains("netflix")
                {
                    return true;
                }
            }
        }

        false
    }
}

#[cfg(not(windows))]
pub fn is_video_fullscreen(_active_media_source_app: Option<&str>, _is_media_playing: bool) -> bool {
    false
}
