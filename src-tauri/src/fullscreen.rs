// Deteksi jendela fullscreen untuk auto-hide notch.
//
// Pendekatan lamanya memakai daftar nama exe pemutar (vlc, mpv, wmplayer, ...) dan hanya
// memeriksa monitor utama, jadi game/IDE/aplikasi lain yang fullscreen tidak pernah
// menyembunyikan notch. Sekarang keputusannya berbasis bentuk jendela, dicek terhadap monitor
// tempat jendela itu berada — daftar nama exe tinggal jadi jalur tambahan.

#[cfg(windows)]
pub fn is_video_fullscreen(active_media_source_app: Option<&str>) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowLongPtrW, IsIconic,
        GWL_EXSTYLE, GWL_STYLE,
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

        // Seluruh UI shell Windows dimiliki explorer.exe: Alt+Tab switcher, Task View, Start,
        // Action Center, Show Desktop. Alt+Tab dan Task View tampil sebagai jendela tanpa
        // caption yang bisa menutupi penuh monitor, sehingga tanpa saringan ini notch
        // tersembunyi setiap kali pengguna berpindah jendela.
        if is_shell_window(fg) {
            return false;
        }

        // Jendela cloaked (desktop virtual lain, app UWP yang sudah ditutup) masih dilaporkan
        // GetForegroundWindow walau tidak terlihat. Menganggapnya fullscreen bisa membuat notch
        // tidak pernah muncul kembali.
        if is_cloaked(fg) {
            return false;
        }

        // Jendela minimized punya rect klien yang tidak wajar dan bukan fullscreen.
        if IsIconic(fg).as_bool() {
            return false;
        }

        // JANGAN saring dengan `IsZoomed`: browser yang memutar video fullscreen TETAP berstatus
        // maximized di Windows (masuk fullscreen hanya melepas caption, WS_MAXIMIZE tetap ada).
        // Menyaringnya membuat notch tidak pernah sembunyi saat menonton video fullscreen.
        // Pembeda yang benar ada di `covers_its_monitor`: maximized menyisakan taskbar/border
        // pada rect KLIEN, fullscreen tidak.

        let style = GetWindowLongPtrW(fg, GWL_STYLE) as u32;
        let ex_style = GetWindowLongPtrW(fg, GWL_EXSTYLE) as u32;

        // Jalur bentuk adalah keputusan utama. Daftar exe hanya menambahkan kasus di mana
        // pemutar/browser berjalan fullscreen dengan bentuk jendela yang tidak persis.
        if is_window_fullscreen_on_its_monitor(fg, style, ex_style) {
            return true;
        }

        // Jalur exe baru dievaluasi bila jendela memang menutupi monitornya. `is_exception_app`
        // memanggil `OpenProcess`, dan fungsi ini berjalan 5x per detik — hampir semua jendela
        // foreground bukan fullscreen, jadi jangan bayar biaya itu tiap tick.
        covers_its_monitor(fg) && is_exception_app(fg, active_media_source_app)
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

/// Apakah area KLIEN jendela menutupi penuh `rcMonitor` milik monitor tempat jendela berada.
///
/// Memakai rect klien (`GetClientRect` + `ClientToScreen`), bukan `GetWindowRect`. Window rect
/// jendela maximized Windows 11 meluber keluar monitor (terukur -7..+7 pada monitor
/// 0,0..1536,864), jadi ia tampak "menutupi penuh"; rect kliennya justru berhenti di tepi area
/// kerja (taskbar). Fullscreen sungguhan mengisi klien sampai `rcMonitor` penuh.
///
/// Memakai `rcMonitor`, bukan `rcWork`: taskbar yang auto-hide tidak boleh mengubah hasil.
#[cfg(windows)]
unsafe fn covers_its_monitor(fg: windows::Win32::Foundation::HWND) -> bool {
    use windows::Win32::Foundation::{POINT, RECT};
    use windows::Win32::Graphics::Gdi::{
        ClientToScreen, GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetClientRect;

    let monitor = MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST);
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if !GetMonitorInfoW(monitor, &mut info).as_bool() {
        return false;
    }

    let mut client = RECT::default();
    if GetClientRect(fg, &mut client).is_err() {
        return false;
    }
    let mut origin = POINT { x: 0, y: 0 };
    if !ClientToScreen(fg, &mut origin).as_bool() {
        return false;
    }

    let target = info.rcMonitor;
    const TOLERANCE: i32 = 2;
    origin.x <= target.left + TOLERANCE
        && origin.y <= target.top + TOLERANCE
        && origin.x + client.right >= target.right - TOLERANCE
        && origin.y + client.bottom >= target.bottom - TOLERANCE
}

/// Nama exe pemilik jendela, huruf kecil, mis. `"explorer.exe"`.
///
/// `None` bila proses tidak bisa dibuka (mis. aplikasi elevated). Pemanggil harus memperlakukan
/// `None` sebagai "tidak dikenal", bukan sebagai alasan membatalkan seluruh deteksi.
#[cfg(windows)]
unsafe fn process_exe_name(fg: windows::Win32::Foundation::HWND) -> Option<String> {
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
    use windows::core::PWSTR;

    let mut pid = 0u32;
    GetWindowThreadProcessId(fg, Some(&mut pid));
    if pid == 0 {
        return None;
    }

    let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
    let mut buf = [0u16; 1024];
    let mut len = buf.len() as u32;
    QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).ok()?;

    let full_path = String::from_utf16_lossy(&buf[..len as usize]);
    let exe_name = full_path.rsplit('\\').next().unwrap_or(&full_path).to_lowercase();
    if exe_name.is_empty() {
        None
    } else {
        Some(exe_name)
    }
}

/// Jendela milik shell Windows (`explorer.exe`): Alt+Tab, Task View, Start, Action Center,
/// Show Desktop, dan desktop itu sendiri.
#[cfg(windows)]
unsafe fn is_shell_window(fg: windows::Win32::Foundation::HWND) -> bool {
    matches!(process_exe_name(fg).as_deref(), Some("explorer.exe"))
}

/// Jendela yang disembunyikan DWM (cloaked): jendela desktop virtual lain, app UWP yang sudah
/// ditutup, dan jendela suspensi. Tidak terlihat di layar, jadi tidak boleh dihitung fullscreen.
#[cfg(windows)]
unsafe fn is_cloaked(fg: windows::Win32::Foundation::HWND) -> bool {
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};

    let mut cloaked: u32 = 0;
    let ok = DwmGetWindowAttribute(
        fg,
        DWMWA_CLOAKED,
        &mut cloaked as *mut u32 as *mut core::ffi::c_void,
        std::mem::size_of::<u32>() as u32,
    )
    .is_ok();
    // Gagal membaca DWM (mis. DWM dimatikan) bukan bukti jendela cloaked.
    ok && cloaked != 0
}

/// Pemutar media dan browser tetap dihitung fullscreen walaupun bentuk jendelanya tidak persis.
///
/// Kegagalan membaca nama exe (mis. proses elevated) tidak lagi membatalkan deteksi — nama
/// exe hanya dipakai untuk jalur tambahan ini.
#[cfg(windows)]
unsafe fn is_exception_app(
    fg: windows::Win32::Foundation::HWND,
    active_media_source_app: Option<&str>,
) -> bool {
    let Some(exe_name) = process_exe_name(fg) else {
        return false;
    };

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

    // Sengaja TIDAK ada lagi `if is_media_playing { return true; }`: memutar media di browser
    // maximized/berjendela bukan fullscreen. Browser hanya lolos lewat jalur bentuk di atas
    // (fullscreen F11/video = tanpa caption dan menutupi monitor) atau lewat source app.
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
pub fn is_video_fullscreen(_active_media_source_app: Option<&str>) -> bool {
    false
}
