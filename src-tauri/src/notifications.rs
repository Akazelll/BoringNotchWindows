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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallEventInfo {
    pub caller_name: String,
    pub caller_number: Option<String>,
    pub app_source: String,
    pub state: String, // "incoming" | "active"
    pub notif_id: Option<u32>,
}

#[cfg(windows)]
pub fn fetch_active_notifications() -> Vec<AppNotification> {
    use windows::UI::Notifications::Management::UserNotificationListener;
    use windows::UI::Notifications::NotificationKinds;

    let mut result = Vec::new();

    let listener = match UserNotificationListener::Current() {
        Ok(l) => l,
        Err(_) => return result,
    };

    let notifs = match listener.GetNotificationsAsync(NotificationKinds::Toast) {
        Ok(op) => match op.get() {
            Ok(n) => n,
            Err(_) => return result,
        },
        Err(_) => return result,
    };

    let count = notifs.Size().unwrap_or(0);
    for i in 0..count {
        if let Ok(n) = notifs.GetAt(i) {
            let id = n.Id().unwrap_or(0);
            let app_name = n
                .AppInfo()
                .ok()
                .and_then(|a| a.DisplayInfo().ok())
                .and_then(|d| d.DisplayName().ok())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "System".to_string());

            let name_lower = app_name.to_lowercase();
            let mut app_type = if name_lower.contains("whatsapp") {
                "whatsapp".to_string()
            } else if name_lower.contains("discord") {
                "discord".to_string()
            } else if name_lower.contains("telegram") {
                "telegram".to_string()
            } else if name_lower.contains("teams") {
                "teams".to_string()
            } else if name_lower.contains("phone") || name_lower.contains("sambungan ponsel") || name_lower.contains("telepon") {
                "phone".to_string()
            } else if name_lower.contains("spotify") {
                "spotify".to_string()
            } else if name_lower.contains("chrome") || name_lower.contains("edge") || name_lower.contains("browser") {
                "chrome".to_string()
            } else {
                "system".to_string()
            };

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
            });
        }
    }

    result
}

#[cfg(not(windows))]
pub fn fetch_active_notifications() -> Vec<AppNotification> {
    Vec::new()
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

        let exe_name = if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut path_buf = [0u16; 1024];
            let mut len = path_buf.len() as u32;
            if QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(path_buf.as_mut_ptr()), &mut len).is_ok() {
                let p = String::from_utf16_lossy(&path_buf[..len as usize]);
                p.rsplit('\\').next().unwrap_or(&p).to_lowercase()
            } else {
                String::new()
            }
        } else {
            String::new()
        };

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
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: title.clone(),
                    caller_number: Some("WhatsApp Call".to_string()),
                    app_source: "whatsapp".to_string(),
                    state: "incoming".to_string(),
                    notif_id: None,
                });
                return BOOL(0); // Stop enum
            }
        }

        // 2. Phone Link (Sambungan Ponsel / Your Phone) Call Banner
        if exe_name.contains("phoneexperience") || exe_name.contains("yourphone") {
            let is_call = title_lower.contains("call")
                || title_lower.contains("panggilan")
                || title_lower.contains("telepon");

            if is_call {
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: title.clone(),
                    caller_number: Some("Phone Link".to_string()),
                    app_source: "phone".to_string(),
                    state: "incoming".to_string(),
                    notif_id: None,
                });
                return BOOL(0);
            }
        }

        // 3. Telegram Call Window
        if exe_name.contains("telegram") {
            if title_lower.contains("call") || title_lower.contains("panggilan") {
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: title.clone(),
                    caller_number: Some("Telegram Call".to_string()),
                    app_source: "telegram".to_string(),
                    state: "incoming".to_string(),
                    notif_id: None,
                });
                return BOOL(0);
            }
        }

        // 4. Discord Voice / Call
        if exe_name.contains("discord") {
            if title_lower.contains("incoming call") || title_lower.contains("panggilan masuk") {
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: title.clone(),
                    caller_number: Some("Discord".to_string()),
                    app_source: "discord".to_string(),
                    state: "incoming".to_string(),
                    notif_id: None,
                });
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

    let result = FOUND_CALL.lock().unwrap().clone();
    result
}

#[cfg(not(windows))]
pub fn detect_call_from_windows() -> Option<CallEventInfo> {
    None
}
