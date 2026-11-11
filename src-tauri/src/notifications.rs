use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppNotification {
    pub id: u32,
    pub app_name: String,
    pub app_type: String,
    pub title: String,
    pub message: String,
    pub is_call: bool,
    /// Logo aplikasi sumber sebagai data URL. `None` bila tidak tersedia, dan
    /// frontend memakai glyph lama sebagai fallback.
    pub logo: Option<String>,
}

/// Nama tampilan aplikasi untuk notifikasi. Tidak dipakai untuk mengenali aplikasi: ia
/// bergantung bahasa Windows dan bisa kosong, sedangkan AUMID stabil.
#[cfg(windows)]
const UNKNOWN_APP_NAME: &str = "Aplikasi";

/// Kenali aplikasi dari AUMID + nama tampilan.
///
/// AUMID adalah kunci stabil dan tidak terlokalisasi, mis. WhatsApp
/// `5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App`. Nama tampilan tetap ikut dicocokkan karena
/// di beberapa mesin `AppInfo()` tidak mengisi AUMID. Mengenali dari AUMID dulu membuat
/// deteksi tidak lagi bergantung pada `DisplayName()` yang bisa gagal atau kosong.
///
/// Kedua argumen dinormalkan di sini, jadi pemanggil boleh meneruskan huruf besar/kecil apa pun.
///
/// Nilai `""` berarti aplikasi tidak dikenali. Pemanggil WAJIB memperlakukannya sebagai
/// "tampilkan saja", bukan "buang": notifikasi yang sah dari aplikasi di luar daftar ini
/// sebelumnya dibuang tanpa jejak.
#[cfg(windows)]
fn classify_app(aumid: &str, name: &str) -> &'static str {
    let hay = format!("{} {}", aumid, name).to_lowercase();

    if hay.contains("whatsapp") {
        "whatsapp"
    } else if hay.contains("discord") {
        "discord"
    } else if hay.contains("telegram") {
        "telegram"
    } else if hay.contains("teams") {
        "teams"
    } else if hay.contains("phone link")
        || hay.contains("yourphone")
        || hay.contains("your phone")
        || hay.contains("sambungan ponsel")
        || hay.contains("telepon")
    {
        "phone"
    } else if hay.contains("spotify") {
        "spotify"
    } else if hay.contains("chrome")
        || hay.contains("msedge")
        || hay.contains("edge")
        || hay.contains("firefox")
        || hay.contains("browser")
    {
        "chrome"
    } else {
        ""
    }
}

/// Teks yang benar-benar noise dan tidak pernah ingin ditampilkan.
///
/// Ini menggantikan `|| app_type == "system"` yang dulu ada di sini: filter itu membuang
/// SEMUA aplikasi yang tidak ada di daftar putih, sehingga notifikasi sah dari aplikasi lain
/// (dan notifikasi yang nama tampilannya gagal dibaca) hilang tanpa jejak.
#[cfg(windows)]
fn is_known_noise(full_text: &str) -> bool {
    full_text.contains("mode resume")
        || full_text.contains("system mode")
        || full_text.contains("mode pemulihan")
        || full_text.contains("headset")
        || full_text.contains("headphone")
        || full_text.contains("earphone")
        || full_text.contains("hands-free")
        || full_text.contains("siap digunakan")
        || full_text.contains("ready to use")
        || full_text.contains("tersambung ke")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallEventInfo {
    pub caller_name: String,
    pub caller_number: Option<String>,
    pub app_source: String,
    pub state: String, // "incoming" (berdering) | "outgoing" (memanggil) | "active" (tersambung)
    pub notif_id: Option<u32>,
    /// Logo aplikasi sumber sebagai data URL; lihat `AppNotification.logo`.
    pub logo: Option<String>,
}

#[cfg(windows)]
static SIMULATION_QUEUE: std::sync::Mutex<Vec<AppNotification>> = std::sync::Mutex::new(Vec::new());

#[cfg(windows)]
static LAST_CALL_HWND: std::sync::Mutex<Option<isize>> = std::sync::Mutex::new(None);

/// Path lengkap exe pemilik jendela panggilan. `exe_name` di dalam scanner sudah
/// dipendekkan jadi nama berkas saja, padahal ekstraksi ikon butuh path lengkapnya.
#[cfg(windows)]
static LAST_CALL_EXE: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

#[cfg(windows)]
extern "system" {
    fn keybd_event(bVk: u8, bScan: u8, dwFlags: u32, dwExtraInfo: usize);
    fn mouse_event(dwFlags: u32, dx: i32, dy: i32, dwData: u32, dwExtraInfo: usize);
}

/// Logo aplikasi dari `AppInfo`, dengan cache per-kunci.
///
/// Ikon aplikasi nyaris tidak pernah berubah, jadi hasilnya di-cache. Kegagalan
/// sengaja TIDAK di-cache permanen: kalau percobaan pertama kebetulan gagal, logo
/// harus tetap bisa muncul di poll berikutnya tanpa restart aplikasi.
#[cfg(windows)]
fn app_logo(app_info: &windows::ApplicationModel::AppInfo, cache_key: &str) -> Option<String> {
    use std::collections::HashMap;
    use std::sync::Mutex;

    static CACHE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

    if !cache_key.is_empty() {
        if let Ok(guard) = CACHE.lock() {
            if let Some(map) = guard.as_ref() {
                if let Some(hit) = map.get(cache_key) {
                    return Some(hit.clone());
                }
            }
        }
    }

    // 64px karena ditampilkan 44px: cukup tajam untuk skala HiDPI.
    let size = windows::Foundation::Size { Width: 64.0, Height: 64.0 };
    let logo_ref = app_info.DisplayInfo().ok()?.GetLogo(size).ok()?;
    let url = crate::image_util::reference_to_data_url_with_timeout(
        &logo_ref,
        std::time::Duration::from_millis(400),
    )?;

    if !cache_key.is_empty() {
        if let Ok(mut guard) = CACHE.lock() {
            guard.get_or_insert_with(HashMap::new).insert(cache_key.to_string(), url.clone());
        }
    }

    Some(url)
}

pub fn trigger_simulated_notification(notif: AppNotification) {
    #[cfg(windows)]
    if let Ok(mut lock) = SIMULATION_QUEUE.lock() {
        lock.push(notif);
    }
}

#[cfg(windows)]
pub fn fetch_active_notifications() -> Vec<AppNotification> {
    use windows::UI::Notifications::Management::{UserNotificationListener, UserNotificationListenerAccessStatus};
    use windows::UI::Notifications::NotificationKinds;

    let mut result = Vec::new();

    // 1. Drain any simulated notifications for testing
    if let Ok(mut sim_lock) = SIMULATION_QUEUE.lock() {
        if !sim_lock.is_empty() {
            result.append(&mut sim_lock);
        }
    }

    let listener = match UserNotificationListener::Current() {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[bento] UserNotificationListener::Current() failed: {:?}", e);
            return result;
        }
    };

    // Ensure notification access is requested if unspecified
    if let Ok(status) = listener.GetAccessStatus() {
        if status == UserNotificationListenerAccessStatus::Unspecified {
            if let Ok(op) = listener.RequestAccessAsync() {
                let _ = op.get();
            }
        } else if status == UserNotificationListenerAccessStatus::Denied {
            return result;
        }
    }

    let notifs = match listener.GetNotificationsAsync(NotificationKinds::Toast) {
        Ok(op) => match op.get() {
            Ok(n) => n,
            Err(e) => {
                eprintln!("[bento] GetNotificationsAsync op.get() failed: {:?}", e);
                return result;
            }
        },
        Err(e) => {
            eprintln!("[bento] GetNotificationsAsync failed: {:?}", e);
            return result;
        }
    };

    let count = notifs.Size().unwrap_or(0);
    for i in 0..count {
        if let Ok(n) = notifs.GetAt(i) {
            let id = n.Id().unwrap_or(0);
            let app_info = n.AppInfo().ok();
            let app_name = app_info
                .as_ref()
                .and_then(|a| a.DisplayInfo().ok())
                .and_then(|d| d.DisplayName().ok())
                .map(|s| s.to_string())
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| UNKNOWN_APP_NAME.to_string());
            let aumid_lower = app_info
                .as_ref()
                .and_then(|a| a.AppUserModelId().ok())
                .map(|s| s.to_string().to_lowercase())
                .unwrap_or_default();

            let name_lower = app_name.to_lowercase();
            let mut app_type = classify_app(&aumid_lower, &name_lower).to_string();

            // Ikon asli aplikasi sumber. AUMID adalah kunci paling stabil; nama app
            // dipakai sebagai cadangan bila AUMID kosong.
            let logo = app_info.as_ref().and_then(|a| {
                let key = if aumid_lower.is_empty() { name_lower.clone() } else { aumid_lower.clone() };
                app_logo(a, &key)
            });

            // Extract ALL text elements across ALL visual bindings
            let mut all_texts = Vec::new();

            if let Ok(notif) = n.Notification() {
                if let Ok(visual) = notif.Visual() {
                    if let Ok(bindings) = visual.Bindings() {
                        let b_count = bindings.Size().unwrap_or(0);
                        for b in 0..b_count {
                            if let Ok(binding) = bindings.GetAt(b) {
                                if let Ok(texts) = binding.GetTextElements() {
                                    let t_count = texts.Size().unwrap_or(0);
                                    for t in 0..t_count {
                                        if let Ok(te) = texts.GetAt(t) {
                                            if let Ok(val) = te.Text() {
                                                let s = val.to_string().trim().to_string();
                                                if !s.is_empty() {
                                                    all_texts.push(s);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            let title = if !all_texts.is_empty() {
                all_texts[0].clone()
            } else {
                app_name.clone()
            };

            let message = if all_texts.len() > 1 {
                all_texts[1..].join(" - ")
            } else {
                String::new()
            };

            // Check if this notification is from WhatsApp Web inside Chrome/Edge
            let full_text = format!("{} {} {}", app_name, title, message).to_lowercase();
            if full_text.contains("whatsapp") && app_type == "chrome" {
                app_type = "whatsapp".to_string();
            }

            // Hanya buang noise yang benar-benar dikenal. Aplikasi asing (app_type kosong)
            // sekarang DITAMPILKAN: fitur notifikasi harus gagal ke arah menampilkan, bukan
            // ke arah menyembunyikan seperti filter `app_type == "system"` yang lama.
            if is_known_noise(&full_text) {
                continue;
            }

            // Exclude missed calls, ended calls, cancelled calls from being considered an active incoming call
            let is_missed_or_ended = full_text.contains("tak terjawab")
                || full_text.contains("missed")
                || full_text.contains("dibatalkan")
                || full_text.contains("cancelled")
                || full_text.contains("canceled")
                || full_text.contains("berakhir")
                || full_text.contains("ended")
                || full_text.contains("ditolak")
                || full_text.contains("declined");

            // Strict incoming call detection: only true if actively ringing/incoming
            let is_call = if is_missed_or_ended {
                false
            } else {
                let is_comms = app_type == "whatsapp"
                    || app_type == "discord"
                    || app_type == "telegram"
                    || app_type == "teams"
                    || app_type == "phone";

                let has_incoming_keyword = full_text.contains("panggilan masuk")
                    || full_text.contains("panggilan suara masuk")
                    || full_text.contains("panggilan video masuk")
                    || full_text.contains("memanggil")
                    || full_text.contains("berdering")
                    || full_text.contains("incoming call")
                    || full_text.contains("incoming voice call")
                    || full_text.contains("incoming video call")
                    || full_text.contains("is calling")
                    || full_text.contains("ringing");

                is_comms && has_incoming_keyword
            };

            result.push(AppNotification {
                id,
                app_name,
                app_type,
                title,
                message,
                is_call,
                logo,
            });
        }
    }

    result
}

#[cfg(not(windows))]
pub fn fetch_active_notifications() -> Vec<AppNotification> {
    Vec::new()
}

/// Satu baris laporan untuk tiap notifikasi mentah, plus alasan bila tidak dipakai.
///
/// `eprintln!` mati di build rilis (`windows_subsystem = "windows"`), jadi kegagalan pembacaan
/// notifikasi tidak meninggalkan jejak apa pun. Laporan ini ditulis ke berkas supaya bisa
/// dibaca dari aplikasi terpasang.
#[cfg(windows)]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationDiagnostic {
    pub access_status: String,
    pub raw_count: usize,
    pub kept: usize,
    pub items: Vec<DiagnosticItem>,
}

#[cfg(windows)]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticItem {
    pub id: u32,
    pub aumid: String,
    pub app_name: String,
    pub title: String,
    pub message: String,
    pub app_type: String,
    /// "" bila lolos, atau alasan penolakan: "noise" / "kosong".
    pub rejected: String,
}

/// Kumpulkan laporan diagnostik notifikasi dan tulis ke berkas. Mengembalikan path berkasnya.
///
/// Read-only terhadap sistem: hanya membaca daftar notifikasi, tidak mengubah apa pun.
#[cfg(windows)]
pub fn write_notification_diagnostics() -> Result<String, String> {
    use windows::UI::Notifications::Management::{UserNotificationListener, UserNotificationListenerAccessStatus};
    use windows::UI::Notifications::NotificationKinds;

    let mut report = NotificationDiagnostic {
        access_status: "tidak diketahui".to_string(),
        raw_count: 0,
        kept: 0,
        items: Vec::new(),
    };

    let listener = match UserNotificationListener::Current() {
        Ok(l) => l,
        Err(e) => return Err(format!("UserNotificationListener::Current() gagal: {e:?}")),
    };

    if let Ok(status) = listener.GetAccessStatus() {
        report.access_status = if status == UserNotificationListenerAccessStatus::Allowed {
            "Allowed".to_string()
        } else if status == UserNotificationListenerAccessStatus::Denied {
            "Denied".to_string()
        } else {
            "Unspecified".to_string()
        };
    }

    let notifs = listener
        .GetNotificationsAsync(NotificationKinds::Toast)
        .map_err(|e| format!("GetNotificationsAsync gagal: {e:?}"))?
        .get()
        .map_err(|e| format!("GetNotificationsAsync op.get() gagal: {e:?}"))?;

    let count = notifs.Size().unwrap_or(0) as usize;
    report.raw_count = count;

    for i in 0..count {
        let Ok(n) = notifs.GetAt(i as u32) else {
            continue;
        };
        let id = n.Id().unwrap_or(0);
        let app_info = n.AppInfo().ok();
        let app_name = app_info
            .as_ref()
            .and_then(|a| a.DisplayInfo().ok())
            .and_then(|d| d.DisplayName().ok())
            .map(|s| s.to_string())
            .unwrap_or_default();
        let aumid = app_info
            .as_ref()
            .and_then(|a| a.AppUserModelId().ok())
            .map(|s| s.to_string())
            .unwrap_or_default();

        // Kumpulkan seluruh teks visual, sama seperti jalur produksi.
        let mut all_texts: Vec<String> = Vec::new();
        if let Ok(notif) = n.Notification() {
            if let Ok(visual) = notif.Visual() {
                if let Ok(bindings) = visual.Bindings() {
                    for b in 0..bindings.Size().unwrap_or(0) {
                        if let Ok(binding) = bindings.GetAt(b) {
                            if let Ok(texts) = binding.GetTextElements() {
                                for t in 0..texts.Size().unwrap_or(0) {
                                    if let Ok(te) = texts.GetAt(t) {
                                        if let Ok(val) = te.Text() {
                                            let s = val.to_string().trim().to_string();
                                            if !s.is_empty() {
                                                all_texts.push(s);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        let title = all_texts.first().cloned().unwrap_or_else(|| app_name.clone());
        let message = if all_texts.len() > 1 { all_texts[1..].join(" - ") } else { String::new() };
        let full_text = format!("{} {} {}", app_name, title, message).to_lowercase();
        let app_type = classify_app(&aumid, &app_name).to_string();

        let rejected = if title.trim().is_empty() && message.trim().is_empty() {
            "kosong"
        } else if is_known_noise(&full_text) {
            "noise"
        } else {
            ""
        };
        if rejected.is_empty() {
            report.kept += 1;
        }

        report.items.push(DiagnosticItem {
            id,
            aumid,
            app_name,
            title,
            message,
            app_type,
            rejected: rejected.to_string(),
        });
    }

    let path = std::env::temp_dir().join("bento-notif-diag.json");
    let json = serde_json::to_string_pretty(&report).map_err(|e| format!("serialisasi gagal: {e}"))?;
    std::fs::write(&path, json).map_err(|e| format!("tulis {} gagal: {e}", path.display()))?;
    Ok(path.display().to_string())
}

#[cfg(not(windows))]
pub fn write_notification_diagnostics() -> Result<String, String> {
    Err("diagnostik hanya tersedia di Windows".to_string())
}

// Win32 Window Scanner: Detect if a Communication app has an incoming/active call window
#[cfg(windows)]
pub fn detect_call_from_windows() -> Option<CallEventInfo> {
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::core::PWSTR;
    use std::sync::Mutex;

    static FOUND_CALL: Mutex<Option<CallEventInfo>> = Mutex::new(None);

    unsafe extern "system" fn enum_call_proc(hwnd: HWND, _lparam: LPARAM) -> BOOL {
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }

        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        if title_len == 0 {
            return BOOL(1);
        }
        let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return BOOL(1);
        }

        // Path lengkap dibutuhkan untuk mengekstrak ikon aplikasi, sedangkan
        // pencocokan di bawah memakai nama berkasnya saja.
        let exe_path = if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut path_buf = [0u16; 1024];
            let mut len = path_buf.len() as u32;
            if QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(path_buf.as_mut_ptr()), &mut len).is_ok() {
                String::from_utf16_lossy(&path_buf[..len as usize])
            } else {
                String::new()
            }
        } else {
            String::new()
        };
        let exe_name = exe_path
            .rsplit('\\')
            .next()
            .unwrap_or(&exe_path)
            .to_lowercase();

        let title_lower = title.to_lowercase();

        // Ignore windows showing missed or ended calls
        let is_ended = title_lower.contains("tak terjawab")
            || title_lower.contains("missed")
            || title_lower.contains("ended")
            || title_lower.contains("berakhir")
            || title_lower.contains("dibatalkan")
            || title_lower.contains("cancelled");
        if is_ended {
            return BOOL(1);
        }

        // 1. WhatsApp Call Window detection (Always incoming until user accepts)
        if exe_name.contains("whatsapp") {
            let is_call_win = title_lower.contains("panggilan")
                || title_lower.contains("call")
                || title_lower.contains("voice")
                || title_lower.contains("video");

            if is_call_win && title != "WhatsApp" {
                let name = sanitize_caller_name(&title);
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: if name.is_empty() { title.clone() } else { name },
                    caller_number: Some("WhatsApp Call".to_string()),
                    app_source: "whatsapp".to_string(),
                    // Nilai sementara: ditimpa probe_call_state() setelah EnumWindows.
                    state: "incoming".to_string(),
                    notif_id: None,
                    // Diisi setelah EnumWindows: ekstraksi ikon tidak boleh jalan
                    // di tengah enumerasi.
                    logo: None,
                });
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
                }
                if let Ok(mut e_lock) = LAST_CALL_EXE.lock() {
                    *e_lock = Some(exe_path.clone());
                }
                return BOOL(0); // Stop enum
            }
        }

        // 2. Phone Link (Sambungan Ponsel / Your Phone) Call Banner
        if exe_name.contains("phoneexperience") || exe_name.contains("yourphone") {
            let is_call = title_lower.contains("call")
                || title_lower.contains("panggilan")
                || title_lower.contains("telepon");

            if is_call {
                let name = sanitize_caller_name(&title);
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: if name.is_empty() { title.clone() } else { name },
                    caller_number: Some("Phone Link".to_string()),
                    app_source: "phone".to_string(),
                    // Nilai sementara: ditimpa probe_call_state() setelah EnumWindows.
                    state: "incoming".to_string(),
                    notif_id: None,
                    // Diisi setelah EnumWindows: ekstraksi ikon tidak boleh jalan
                    // di tengah enumerasi.
                    logo: None,
                });
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
                }
                if let Ok(mut e_lock) = LAST_CALL_EXE.lock() {
                    *e_lock = Some(exe_path.clone());
                }
                return BOOL(0);
            }
        }

        // 3. Telegram Call Window
        if exe_name.contains("telegram") {
            if title_lower.contains("call") || title_lower.contains("panggilan") {
                let name = sanitize_caller_name(&title);
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: if name.is_empty() { title.clone() } else { name },
                    caller_number: Some("Telegram Call".to_string()),
                    app_source: "telegram".to_string(),
                    // Nilai sementara: ditimpa probe_call_state() setelah EnumWindows.
                    state: "incoming".to_string(),
                    notif_id: None,
                    // Diisi setelah EnumWindows: ekstraksi ikon tidak boleh jalan
                    // di tengah enumerasi.
                    logo: None,
                });
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
                }
                if let Ok(mut e_lock) = LAST_CALL_EXE.lock() {
                    *e_lock = Some(exe_path.clone());
                }
                return BOOL(0);
            }
        }

        // 4. Discord Voice / Call
        if exe_name.contains("discord") {
            if title_lower.contains("incoming call") || title_lower.contains("panggilan masuk") {
                let name = sanitize_caller_name(&title);
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: if name.is_empty() { title.clone() } else { name },
                    caller_number: Some("Discord".to_string()),
                    app_source: "discord".to_string(),
                    // Nilai sementara: ditimpa probe_call_state() setelah EnumWindows.
                    state: "incoming".to_string(),
                    notif_id: None,
                    // Diisi setelah EnumWindows: ekstraksi ikon tidak boleh jalan
                    // di tengah enumerasi.
                    logo: None,
                });
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
                }
                if let Ok(mut e_lock) = LAST_CALL_EXE.lock() {
                    *e_lock = Some(exe_path.clone());
                }
                return BOOL(0);
            }
        }

        BOOL(1)
    }

    {
        let mut lock = FOUND_CALL.lock().unwrap();
        *lock = None;
    }

    unsafe {
        let _ = EnumWindows(Some(enum_call_proc), LPARAM(0));
    }

    // Arah panggilan ditentukan di sini, bukan di dalam callback: memanggil COM di
    // tengah enumerasi berisiko. Empat blok di atas menulis "incoming" sebagai nilai
    // cadangan untuk kasus LAST_CALL_HWND kosong; bila tidak kosong, nilainya ditimpa.
    if let Some(h) = LAST_CALL_HWND.lock().ok().and_then(|l| *l) {
        if let Ok(mut lock) = FOUND_CALL.lock() {
            if let Some(c) = lock.as_mut() {
                c.state = probe_call_state(HWND(h as *mut _)).to_string();
            }
        }
    }

    // Ikon aplikasi panggilan. Panggilan tidak punya toast, jadi logonya diambil dari
    // exe pemilik jendela, bukan dari AppInfo seperti notifikasi.
    let exe_path = LAST_CALL_EXE.lock().ok().and_then(|l| l.clone());
    if let Some(path) = exe_path {
        if let Ok(mut lock) = FOUND_CALL.lock() {
            if let Some(c) = lock.as_mut() {
                c.logo = crate::win_icon::extract_exe_icon_cached(&path);
            }
        }
    }

    let result = FOUND_CALL.lock().unwrap().clone();
    result
}

#[cfg(windows)]
fn get_all_communication_hwnds() -> Vec<windows::Win32::Foundation::HWND> {
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible};
    use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::core::PWSTR;

    static FOUND_HWNDS: std::sync::Mutex<Vec<isize>> = std::sync::Mutex::new(Vec::new());
    if let Ok(mut lock) = FOUND_HWNDS.lock() {
        lock.clear();
    }

    unsafe extern "system" fn collect_proc(hwnd: HWND, _lparam: LPARAM) -> BOOL {
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return BOOL(1);
        }
        let exe = if let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut buf = [0u16; 512];
            let mut len = buf.len() as u32;
            if QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_ok() {
                String::from_utf16_lossy(&buf[..len as usize]).to_lowercase()
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        let mut title_buf = [0u16; 256];
        let t_len = GetWindowTextW(hwnd, &mut title_buf);
        let title = String::from_utf16_lossy(&title_buf[..t_len as usize]).to_lowercase();

        let is_target = exe.contains("whatsapp")
            || exe.contains("phoneexperience")
            || exe.contains("yourphone")
            || exe.contains("telegram")
            || exe.contains("discord")
            || (exe.contains("applicationframehost") && (title.contains("whatsapp") || title.contains("panggilan") || title.contains("call")));

        if is_target {
            if let Ok(mut lock) = FOUND_HWNDS.lock() {
                lock.push(hwnd.0 as isize);
            }
        }
        BOOL(1)
    }

    unsafe {
        let _ = EnumWindows(Some(collect_proc), LPARAM(0));
    }
    FOUND_HWNDS.lock().unwrap().iter().map(|&h| HWND(h as *mut _)).collect()
}

// Cocok sebagai substring — cukup spesifik untuk tidak salah sasaran.
#[cfg(windows)]
const HANGUP_STRONG: &[&str] = &[
    "akhiri panggilan", "end call", "endcall", "hangup", "hang up",
    "leave call", "leavecall", "disconnect", "tinggalkan", "matikan",
    "tolak", "decline", "reject", "putuskan",
];

// Hanya cocok sebagai kata utuh — "end" tidak boleh cocok ke "Send", "hang" ke "change".
#[cfg(windows)]
const HANGUP_WEAK: &[&str] = &["akhiri", "end", "hang", "leave", "tutup", "batal", "selesai"];

#[cfg(windows)]
const ACCEPT_KEYWORDS: &[&str] = &["terima", "accept", "jawab", "answer", "join", "gabung"];

// Kehadiran tombol ini menandai panggilan sudah tersambung. Dipakai bersama arah
// panggilan: tombol "Terima" hanya ada saat berdering, tombol bisu hanya saat tersambung.
#[cfg(windows)]
const MUTE_KEYWORDS: &[&str] = &["bisu", "mute", "matikan mikrofon", "deafen"];

/// Keputusan arah dari sinyal tombol, dipisah dari pembacaan UIA supaya bisa diuji
/// tanpa COM. Berdering selalu punya tombol Terima; panggilan keluar tidak pernah.
#[cfg(windows)]
fn state_from_signals(has_accept: bool, has_mute: bool) -> &'static str {
    if has_accept {
        "incoming"
    } else if has_mute {
        "active"
    } else {
        "outgoing"
    }
}

/// Token terakhir berbentuk timer: "0:12", "00:12", atau "1:02:33".
/// Bagian menit/jam boleh satu digit, detik harus selalu dua digit.
#[cfg(windows)]
fn is_timer(token: &str) -> bool {
    let mut parts = token.split(':');
    let digits = |p: &str, n: usize| p.len() == n && p.chars().all(|c| c.is_ascii_digit());

    let (Some(a), Some(b)) = (parts.next(), parts.next()) else {
        return false;
    };
    if !(1..=2).contains(&a.len()) || !a.chars().all(|c| c.is_ascii_digit()) || !digits(b, 2) {
        return false;
    }
    match parts.next() {
        None => true,
        Some(c) => digits(c, 2) && parts.next().is_none(),
    }
}

/// Buang akhiran timer beserta pemisah tepat sebelumnya: "Budi - 00:12" -> "Budi".
#[cfg(windows)]
fn strip_trailing_timer(s: &str) -> &str {
    let t = s.trim_end();
    let start = t
        .rfind(|c: char| c.is_whitespace() || matches!(c, '-' | '·' | '(' | ')'))
        .map(|i| i + 1)
        .unwrap_or(0);

    if !is_timer(t[start..].trim_end_matches(')')) {
        return t;
    }
    t[..start].trim_end_matches([' ', '-', '·', '('])
}

/// Bersihkan judul window menjadi nama kontak.
///
/// Judul panggilan keluar sering berbentuk "Memanggil Budi - 00:12". Timer itu berubah
/// tiap detik, dan `call_key` di lib.rs memuat `caller_name`, jadi judul yang berkedip
/// akan memicu emit tiap detik. Hasil kosong berarti pemanggil memakai judul mentah.
#[cfg(windows)]
fn sanitize_caller_name(raw: &str) -> String {
    let mut s = raw.trim();

    for prefix in ["panggilan ke", "memanggil", "calling"] {
        if matches!(s.get(..prefix.len()), Some(p) if p.eq_ignore_ascii_case(prefix)) {
            s = s[prefix.len()..].trim_start_matches([' ', '.', ':', '-']);
            break;
        }
    }

    strip_trailing_timer(s).trim().to_string()
}

#[cfg(windows)]
fn keyword_matches(text: &str, kw: &str, whole_word: bool) -> bool {
    if !whole_word {
        return text.contains(kw);
    }
    text.split(|c: char| !c.is_alphanumeric()).any(|t| t == kw)
}

/// Cari elemen (tombol atau apa pun yang bisa di-invoke) yang cocok salah satu kata
/// kunci di dalam `hwnd`. Murni pembacaan: tidak mengangkat jendela dan tidak mengklik
/// apa pun, sehingga aman dipanggil dari jalur deteksi.
#[cfg(windows)]
fn find_element_matching(
    hwnd: windows::Win32::Foundation::HWND,
    keywords: &[&str],
    whole_word: bool,
) -> Option<(
    windows::Win32::UI::Accessibility::IUIAutomationElement,
    Option<windows::Win32::UI::Accessibility::IUIAutomationInvokePattern>,
)> {
    use windows::Win32::System::Com::{CoInitializeEx, CoCreateInstance, COINIT_MULTITHREADED, CLSCTX_INPROC_SERVER};
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationInvokePattern,
        TreeScope_Descendants, UIA_InvokePatternId, UIA_ButtonControlTypeId,
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;
        let condition = automation.CreateTrueCondition().ok()?;
        let elem = automation.ElementFromHandle(hwnd).ok()?;
        let children = elem.FindAll(TreeScope_Descendants, &condition).ok()?;

        let len = children.Length().unwrap_or(0);
        for i in 0..len {
            let Ok(child) = children.GetElement(i) else {
                continue;
            };

            // Buang teks statis/label: hanya tombol, atau elemen yang benar-benar
            // bisa di-invoke, yang boleh dianggap sebagai tombol panggilan.
            let is_button = child
                .CurrentControlType()
                .map(|t| t == UIA_ButtonControlTypeId)
                .unwrap_or(false);
            let invoker = child
                .GetCurrentPatternAs::<IUIAutomationInvokePattern>(UIA_InvokePatternId)
                .ok();
            if !is_button && invoker.is_none() {
                continue;
            }

            let name = child.CurrentName().map(|s| s.to_string().to_lowercase()).unwrap_or_default();
            let auto_id = child.CurrentAutomationId().map(|s| s.to_string().to_lowercase()).unwrap_or_default();
            let help = child.CurrentHelpText().map(|s| s.to_string().to_lowercase()).unwrap_or_default();

            let matches = keywords.iter().any(|&k| {
                keyword_matches(&name, k, whole_word)
                    || keyword_matches(&auto_id, k, whole_word)
                    || keyword_matches(&help, k, whole_word)
            });

            if matches {
                return Some((child, invoker));
            }
        }
    }

    None
}

/// Arah panggilan pada jendela panggilan: berdering, memanggil, atau tersambung.
#[cfg(windows)]
fn probe_call_state(hwnd: windows::Win32::Foundation::HWND) -> &'static str {
    let has_accept = find_element_matching(hwnd, ACCEPT_KEYWORDS, false).is_some();
    let has_mute = !has_accept && find_element_matching(hwnd, MUTE_KEYWORDS, false).is_some();
    state_from_signals(has_accept, has_mute)
}

#[cfg(windows)]
fn try_click_call_button(keywords: &[&str], whole_word: bool) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{SetCursorPos, GetCursorPos, ShowWindow, SetForegroundWindow, SW_RESTORE, IsWindow};
    use windows::Win32::Foundation::{HWND, POINT};

    const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    const MOUSEEVENTF_LEFTUP: u32 = 0x0004;

    let mut candidate_hwnds = Vec::new();

    // 1. Check LAST_CALL_HWND first
    if let Ok(lock) = LAST_CALL_HWND.lock() {
        if let Some(h) = *lock {
            let hwnd = HWND(h as *mut _);
            if unsafe { IsWindow(hwnd).as_bool() } {
                candidate_hwnds.push(hwnd);
            }
        }
    }

    // 2. Add all communication windows (WhatsApp, Phone Link, etc.)
    for h in get_all_communication_hwnds() {
        if !candidate_hwnds.contains(&h) {
            candidate_hwnds.push(h);
        }
    }

    // Inspect all candidate windows via UI Automation
    for hwnd in candidate_hwnds {
        let Some((child, invoker)) = find_element_matching(hwnd, keywords, whole_word) else {
            continue;
        };

        unsafe {
            // Bring target window to front so click/invoke lands reliably
            let _ = ShowWindow(hwnd, SW_RESTORE);
            let _ = SetForegroundWindow(hwnd);
            std::thread::sleep(std::time::Duration::from_millis(30));

            // 1. Try IUIAutomationInvokePattern
            if let Some(invoker) = invoker {
                if invoker.Invoke().is_ok() {
                    return true;
                }
            }

            // 2. Try physical mouse click on button coordinates
            if let Ok(rect) = child.CurrentBoundingRectangle() {
                let x = (rect.left + rect.right) / 2;
                let y = (rect.top + rect.bottom) / 2;
                if x > 0 && y > 0 && rect.right > rect.left {
                    let mut pt = POINT::default();
                    let _ = GetCursorPos(&mut pt);

                    let _ = SetCursorPos(x, y);
                    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                    std::thread::sleep(std::time::Duration::from_millis(25));
                    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                    let _ = SetCursorPos(pt.x, pt.y);
                    return true;
                }
            }
        }
    }

    false
}

#[cfg(windows)]
pub fn answer_system_call() -> Result<(), String> {
    // 1. Try UI Automation first (clicks exact "Terima" / "Accept" button in WhatsApp or Toast)
    if try_click_call_button(ACCEPT_KEYWORDS, false) {
        return Ok(());
    }

    // 2. Fallback: Win32 focus and Enter key on all candidate communication windows
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SetForegroundWindow, SW_RESTORE, PostMessageW, WM_KEYDOWN, WM_KEYUP};
    use windows::Win32::Foundation::{WPARAM, LPARAM};

    let comm_hwnds = get_all_communication_hwnds();
    if let Some(hwnd) = comm_hwnds.first() {
        unsafe {
            let _ = ShowWindow(*hwnd, SW_RESTORE);
            let _ = SetForegroundWindow(*hwnd);
            std::thread::sleep(std::time::Duration::from_millis(50));

            keybd_event(0x0D, 0, 0, 0); // VK_RETURN down
            keybd_event(0x0D, 0, 2, 0); // VK_RETURN up
            let _ = PostMessageW(*hwnd, WM_KEYDOWN, WPARAM(0x0D), LPARAM(0));
            let _ = PostMessageW(*hwnd, WM_KEYUP, WPARAM(0x0D), LPARAM(0));
        }
    }

    Ok(())
}

#[cfg(windows)]
pub fn decline_or_end_system_call(declining: bool) -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SetForegroundWindow, SW_RESTORE, PostMessageW, WM_CLOSE, GetWindowTextW};
    use windows::Win32::Foundation::{WPARAM, LPARAM};

    // 1. UI Automation, dua tahap: kata kunci spesifik dulu, baru kata utuh.
    // Saat masih berdering tombolnya berlabel Tolak/Decline; saat tersambung Akhiri/Hang up.
    // Keduanya ada di HANGUP_STRONG, jadi urutannya hanya soal prioritas.
    let strong: &[&str] = if declining {
        &["tolak", "decline", "reject", "akhiri panggilan", "end call", "endcall",
          "hangup", "hang up", "leave call", "leavecall", "disconnect", "tinggalkan", "matikan", "putuskan"]
    } else {
        HANGUP_STRONG
    };
    if try_click_call_button(strong, false) || try_click_call_button(HANGUP_WEAK, true) {
        if let Ok(mut lock) = LAST_CALL_HWND.lock() {
            *lock = None;
        }
        if let Ok(mut e_lock) = LAST_CALL_EXE.lock() {
            *e_lock = None;
        }
        return Ok(());
    }

    // 2. Fallback: tutup jendela panggilan khusus via WM_CLOSE.
    // Jangan pernah menutup jendela utama WhatsApp/Telegram — itu bisa membunuh app user.
    let call_hwnd = LAST_CALL_HWND.lock().ok().and_then(|l| *l);
    for h in get_all_communication_hwnds() {
        let mut title_buf = [0u16; 256];
        let len = unsafe { GetWindowTextW(h, &mut title_buf) };
        let title = String::from_utf16_lossy(&title_buf[..len as usize]).to_lowercase();

        let looks_like_call = title.contains("call")
            || title.contains("panggilan")
            || title.contains("voice")
            || title.contains("video");
        // Setelah panggilan diangkat judulnya sering jadi hanya nama kontak,
        // jadi jendela yang dulu terdeteksi sebagai jendela panggilan juga diterima —
        // selama judulnya bukan nama aplikasi utamanya.
        let is_previous_call_window = call_hwnd == Some(h.0 as isize)
            && !title.is_empty()
            && title != "whatsapp"
            && title != "telegram"
            && title != "discord"
            && title != "phone link";

        if looks_like_call || is_previous_call_window {
            unsafe {
                let _ = ShowWindow(h, SW_RESTORE);
                let _ = SetForegroundWindow(h);
                std::thread::sleep(std::time::Duration::from_millis(40));
                let _ = PostMessageW(h, WM_CLOSE, WPARAM(0), LPARAM(0));
            }
            if let Ok(mut lock) = LAST_CALL_HWND.lock() {
                *lock = None;
            }
            if let Ok(mut e_lock) = LAST_CALL_EXE.lock() {
                *e_lock = None;
            }
            return Ok(());
        }
    }

    Err("Tombol hangup tidak ditemukan di aplikasi panggilan".to_string())
}

#[cfg(not(windows))]
pub fn detect_call_from_windows() -> Option<CallEventInfo> {
    None
}

#[cfg(not(windows))]
pub fn answer_system_call() -> Result<(), String> {
    Ok(())
}

#[cfg(not(windows))]
pub fn decline_or_end_system_call(_declining: bool) -> Result<(), String> {
    Ok(())
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn whole_word_does_not_match_inside_send() {
        // Bug asli: "end" cocok ke "Send" lewat contains() sehingga tombol Kirim diklik.
        assert!(!keyword_matches("send", "end", true));
        assert!(!keyword_matches("change", "hang", true));
        // Kata utuh tetap cocok.
        assert!(keyword_matches("end call", "end", true));
        assert!(keyword_matches("hang up", "hang", true));
    }

    #[test]
    fn strong_keywords_stay_substring_matched() {
        assert!(keyword_matches("akhiri panggilan", "akhiri panggilan", false));
        assert!(keyword_matches("hangup-button", "hangup", false));
    }

    #[test]
    fn strong_and_weak_keyword_sets_are_disjoint_in_intent() {
        // Kata-kata lemah harus selalu diuji whole-word; kata kuat boleh substring.
        for k in HANGUP_WEAK {
            assert!(!HANGUP_STRONG.contains(k), "{} ada di kedua daftar", k);
        }
    }

    /// Diagnostik manual: jalankan dengan
    /// `cargo test --lib diagnostics_dump -- --ignored --nocapture`
    ///
    /// Tidak dijalankan bersama test lain karena hasilnya bergantung keadaan Windows di mesin
    /// itu (jumlah notifikasi yang sedang ada), bukan perilaku kode.
    #[test]
    #[ignore]
    fn diagnostics_dump_reads_windows_state() {
        match write_notification_diagnostics() {
            Ok(path) => {
                let body = std::fs::read_to_string(&path).unwrap_or_default();
                println!("=== {path} ===\n{body}");
            }
            Err(err) => println!("=== diagnostik gagal: {err} ==="),
        }
    }

    #[test]
    fn app_is_recognized_from_aumid_even_without_display_name() {
        // Kasus yang dulu membuang notifikasi WhatsApp: DisplayName gagal, jadi hanya AUMID
        // yang tersedia. AUMID asli dari registry mesin ini.
        assert_eq!(
            classify_app("5319275a.whatsappdesktop_cv1g1gvanyjgm!app", ""),
            "whatsapp"
        );
        assert_eq!(classify_app("com.squirrel.discord.discord", ""), "discord");
        assert_eq!(
            classify_app("microsoft.yourphone_8wekyb3d8bbwe!yourphone", ""),
            "phone"
        );
        assert_eq!(classify_app("", "telegram desktop"), "telegram");
        assert_eq!(classify_app("", "microsoft teams"), "teams");
        assert_eq!(classify_app("", "spotify"), "spotify");
    }

    #[test]
    fn unknown_app_is_not_discarded() {
        // Inti perbaikan: aplikasi yang tidak dikenal mengembalikan "" (tampilkan), bukan
        // jenis palsu yang lalu dibuang. Dulu semuanya jatuh ke "system" lalu dibuang.
        assert_eq!(classify_app("some.random.app", "Some Random App"), "");
        assert_eq!(classify_app("", ""), "");

        // Dan aturan noise tidak boleh menangkap aplikasi yang tidak dikenal.
        assert!(!is_known_noise("some random app halo apa kabar"));

        // Frasa noise yang dikenal tetap tersaring.
        assert!(is_known_noise("headset bluetooth tersambung ke laptop"));
        assert!(is_known_noise("system mode resume"));
        assert!(is_known_noise("perangkat siap digunakan"));
    }

    #[test]
    fn classification_normalizes_case_itself() {
        // Fungsi menormalkan sendiri, jadi pemanggil tidak bisa salah dengan huruf besar.
        assert_eq!(classify_app("5319275A.WhatsAppDesktop_x!App", "WHATSAPP"), "whatsapp");
        assert_eq!(classify_app("", "Telegram Desktop"), "telegram");
        assert_eq!(classify_app("", "Headset"), "");
    }

    #[test]
    fn accept_button_wins_over_mute_button() {
        // Berdering selalu punya tombol Terima, jadi arahnya menang atas tombol bisu.
        assert_eq!(state_from_signals(true, true), "incoming");
        assert_eq!(state_from_signals(true, false), "incoming");
        // Tanpa Terima: tombol bisu berarti sudah tersambung, bukan memanggil.
        assert_eq!(state_from_signals(false, true), "active");
        // Tanpa keduanya: panggilan keluar sedang memanggil.
        assert_eq!(state_from_signals(false, false), "outgoing");
    }

    #[test]
    fn timer_tokens_are_recognized() {
        assert!(is_timer("0:12"));
        assert!(is_timer("00:12"));
        assert!(is_timer("1:02:33"));
        assert!(!is_timer("12:5"));   // detik harus dua digit
        assert!(!is_timer("123:45")); // menit maksimal dua digit
        assert!(!is_timer("12:345"));
        assert!(!is_timer("abc"));
        assert!(!is_timer(""));
    }

    #[test]
    fn caller_name_drops_calling_prefix_and_timer_tail() {
        assert_eq!(sanitize_caller_name("Memanggil Budi - 00:12"), "Budi");
        assert_eq!(sanitize_caller_name("Calling Budi 0:05"), "Budi");
        assert_eq!(sanitize_caller_name("Panggilan ke Budi"), "Budi");
        // Judul bersih harus lewat apa adanya, termasuk nama ber-tanda hubung.
        assert_eq!(sanitize_caller_name("Budi Santoso"), "Budi Santoso");
        assert_eq!(sanitize_caller_name("Ibu-Ani"), "Ibu-Ani");
        // Judul yang seluruhnya berupa timer jadi kosong; pemanggil memakai judul
        // mentah sebagai cadangan, jadi nama tidak pernah hilang.
        assert_eq!(sanitize_caller_name("12:30"), "");
    }
}
