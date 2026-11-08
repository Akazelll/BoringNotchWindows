// Deteksi jendela fullscreen untuk auto-hide notch.
//
// Pendekatan lamanya memakai daftar nama exe pemutar (vlc, mpv, wmplayer, ...) dan hanya
// memeriksa monitor utama, jadi game/IDE/aplikasi lain yang fullscreen tidak pernah
// menyembunyikan notch. Sekarang keputusannya berbasis bentuk jendela, dicek terhadap monitor
// tempat jendela itu berada — daftar nama exe tinggal jadi jalur tambahan.

#[cfg(windows)]
pub fn is_video_fullscreen(active_media_source_app: Option<&str>, is_media_playing: bool) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowLongPtrW, GWL_EXSTYLE,
        GWL_STYLE,
    };

    unsafe {
        let fg = GetForegroundWindow();
        if fg.0 == 0 as _ {
            return false;
        }

        // Desktop dan shell bukan aplikasi: notch harus tetap tampil di sana.
        if fg == GetDesktopWindow() || fg == GetShellWindow() {
            return false;
        }

        let style = GetWindowLongPtrW(fg, GWL_STYLE) as u32;
        let ex_style = GetWindowLongPtrW(fg, GWL_EXSTYLE) as u32;

        let is_fullscreen_by_shape = is_window_fullscreen_on_its_monitor(fg, style, ex_style);
        let is_exception = is_exception_app(fg, is_media_playing, active_media_source_app);

        // Jalur bentuk adalah keputusan utama. Daftar exe hanya menambahkan kasus di mana
        // pemutar/browser berjalan fullscreen dengan bentuk jendela yang tidak persis.
        if is_fullscreen_by_shape {
            return true;
        }

        is_exception && covers_its_monitor(fg)
    }
}

/// Menutupi penuh monitor tempat jendela berada, dan tidak bergaya jendela biasa.
///
/// `WS_CAPTION` adalah pembeda antara fullscreen sungguhan dan jendela maximized biasa —
/// maximized selalu mempertahankan caption, fullscreen tidak. Monaco/game/window manager
/// tanpa caption yang menutupi penuh seluruh monitor lolos di sini.
#[cfg(windows)]
unsafe fn is_window_fullscreen_on_its_monitor(
    fg: windows::Win32::Foundation::HWND,
    style: u32,
    ex_style: u32,
) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{WS_CAPTION, WS_EX_TOPMOST, WS_POPUP};

    let has_caption = (style & WS_CAPTION.0) != 0;
    let is_popup_or_topmost = (style & WS_POPUP.0) != 0 || (ex_style & WS_EX_TOPMOST.0) != 0;
    if has_caption && !is_popup_or_topmost {
        return false;
    }

    covers_its_monitor(fg)
}

/// Apakah `GetWindowRect` menutupi penuh `rcMonitor` milik monitor tempat jendela berada.
///
/// Memakai `rcMonitor`, bukan `rcWork`: taskbar yang auto-hide tidak boleh mengubah hasil.
/// Toleransi 1px menyerap pembulatan skala DPI.
#[cfg(windows)]
unsafe fn covers_its_monitor(fg: windows::Win32::Foundation::HWND) -> bool {
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetWindowRect;

    let monitor = MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST);
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if !GetMonitorInfoW(monitor, &mut info).as_bool() {
        return false;
    }

    let mut rect = windows::Win32::Foundation::RECT::default();
    if GetWindowRect(fg, &mut rect).is_err() {
        return false;
    }

    let target = info.rcMonitor;
    const TOLERANCE: i32 = 1;
    rect.left <= target.left + TOLERANCE
        && rect.top <= target.top + TOLERANCE
        && rect.right >= target.right - TOLERANCE
        && rect.bottom >= target.bottom - TOLERANCE
}

/// Pemutar media dan browser tetap dihitung fullscreen walaupun bentuk jendelanya tidak persis.
///
/// Kegagalan membaca nama exe (mis. proses elevated) tidak lagi membatalkan deteksi — nama
/// exe hanya dipakai untuk jalur tambahan ini.
#[cfg(windows)]
unsafe fn is_exception_app(
    fg: windows::Win32::Foundation::HWND,
    is_media_playing: bool,
    active_media_source_app: Option<&str>,
) -> bool {
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
    use windows::core::PWSTR;

    let mut pid = 0u32;
    GetWindowThreadProcessId(fg, Some(&mut pid));
    if pid == 0 {
        return false;
    }

    let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
        return false;
    };
    let mut buf = [0u16; 1024];
    let mut len = buf.len() as u32;
    if QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_err() {
        return false;
    }
    let full_path = String::from_utf16_lossy(&buf[..len as usize]);
    let exe_name = full_path.rsplit('\\').next().unwrap_or(&full_path).to_lowercase();
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
    if !is_browser {
        return false;
    }

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
    false
}

#[cfg(not(windows))]
pub fn is_video_fullscreen(_active_media_source_app: Option<&str>, _is_media_playing: bool) -> bool {
    false
}
