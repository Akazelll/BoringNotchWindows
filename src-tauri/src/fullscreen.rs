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

        let style = GetWindowLongW(fg, GWL_STYLE) as u32;
        let is_standard_maximized = ((style & WS_MAXIMIZE.0) != 0) && ((style & WS_CAPTION.0) == WS_CAPTION.0);
        if is_standard_maximized {
            return false;
        }

        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        let mut rect = RECT::default();
        if GetWindowRect(fg, &mut rect).is_err() {
            return false;
        }
        let covers_entire_screen = rect.left <= 0
            && rect.top <= 0
            && rect.right >= screen_w
            && rect.bottom >= screen_h;
        if !covers_entire_screen {
            return false;
        }

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

        let is_browser = exe_name.contains("chrome")
            || exe_name.contains("msedge")
            || exe_name.contains("firefox")
            || exe_name.contains("brave")
            || exe_name.contains("opera")
            || exe_name.contains("vivaldi")
            || exe_name.contains("netflix");
        if is_browser {
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
