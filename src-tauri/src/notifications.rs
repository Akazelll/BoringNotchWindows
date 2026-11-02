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
static SIMULATION_QUEUE: std::sync::Mutex<Vec<AppNotification>> = std::sync::Mutex::new(Vec::new());

#[cfg(windows)]
static LAST_CALL_HWND: std::sync::Mutex<Option<isize>> = std::sync::Mutex::new(None);

#[cfg(windows)]
extern "system" {
    fn keybd_event(bVk: u8, bScan: u8, dwFlags: u32, dwExtraInfo: usize);
    fn mouse_event(dwFlags: u32, dx: i32, dy: i32, dwData: u32, dwExtraInfo: usize);
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
            eprintln!("[BoringNotch] UserNotificationListener::Current() failed: {:?}", e);
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
                eprintln!("[BoringNotch] GetNotificationsAsync op.get() failed: {:?}", e);
                return result;
            }
        },
        Err(e) => {
            eprintln!("[BoringNotch] GetNotificationsAsync failed: {:?}", e);
            return result;
        }
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
            let is_phone_link = (name_lower.contains("phone link")
                || name_lower.contains("your phone")
                || name_lower.contains("sambungan ponsel")
                || name_lower == "phone"
                || name_lower.contains("telepon"))
                && !name_lower.contains("headphone")
                && !name_lower.contains("earphone")
                && !name_lower.contains("headset");

            let mut app_type = if name_lower.contains("whatsapp") {
                "whatsapp".to_string()
            } else if name_lower.contains("discord") {
                "discord".to_string()
            } else if name_lower.contains("telegram") {
                "telegram".to_string()
            } else if name_lower.contains("teams") {
                "teams".to_string()
            } else if is_phone_link {
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

            // Filter out system power mode, headset/audio device connection noise, or non-whitelisted apps
            let is_hardware_or_system_noise = full_text.contains("mode resume")
                || full_text.contains("system mode")
                || full_text.contains("mode pemulihan")
                || full_text.contains("headset")
                || full_text.contains("headphone")
                || full_text.contains("earphone")
                || full_text.contains("hands-free")
                || full_text.contains("siap digunakan")
                || full_text.contains("ready to use")
                || full_text.contains("tersambung ke")
                || app_type == "system";

            if is_hardware_or_system_noise {
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
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
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
                let mut lock = FOUND_CALL.lock().unwrap();
                *lock = Some(CallEventInfo {
                    caller_name: title.clone(),
                    caller_number: Some("Phone Link".to_string()),
                    app_source: "phone".to_string(),
                    state: "incoming".to_string(),
                    notif_id: None,
                });
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
                }
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
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
                }
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
                if let Ok(mut h_lock) = LAST_CALL_HWND.lock() {
                    *h_lock = Some(hwnd.0 as isize);
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

#[cfg(windows)]
fn try_click_call_button(keywords: &[&str]) -> bool {
    use windows::Win32::System::Com::{CoInitializeEx, CoCreateInstance, COINIT_MULTITHREADED, CLSCTX_INPROC_SERVER};
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationInvokePattern,
        TreeScope_Descendants, UIA_InvokePatternId,
    };
    use windows::Win32::UI::WindowsAndMessaging::{SetCursorPos, GetCursorPos, ShowWindow, SetForegroundWindow, SW_RESTORE, IsWindow};
    use windows::Win32::Foundation::{HWND, POINT};

    const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    const MOUSEEVENTF_LEFTUP: u32 = 0x0004;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation = match CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) {
            Ok(a) => a,
            Err(_) => return false,
        };

        let mut candidate_hwnds = Vec::new();

        // 1. Check LAST_CALL_HWND first
        if let Ok(lock) = LAST_CALL_HWND.lock() {
            if let Some(h) = *lock {
                let hwnd = HWND(h as *mut _);
                if IsWindow(hwnd).as_bool() {
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

        let condition = match automation.CreateTrueCondition() {
            Ok(c) => c,
            Err(_) => return false,
        };

        // Inspect all candidate windows via UI Automation
        for hwnd in candidate_hwnds {
            if let Ok(elem) = automation.ElementFromHandle(hwnd) {
                if let Ok(children) = elem.FindAll(TreeScope_Descendants, &condition) {
                    let len = children.Length().unwrap_or(0);
                    for i in 0..len {
                        if let Ok(child) = children.GetElement(i) {
                            let name = child.CurrentName().map(|s| s.to_string().to_lowercase()).unwrap_or_default();
                            let auto_id = child.CurrentAutomationId().map(|s| s.to_string().to_lowercase()).unwrap_or_default();
                            let help = child.CurrentHelpText().map(|s| s.to_string().to_lowercase()).unwrap_or_default();

                            let matches = keywords.iter().any(|&k| {
                                name.contains(k) || auto_id.contains(k) || help.contains(k)
                            });

                            if matches {
                                // Bring target window to front so click/invoke lands reliably
                                let _ = ShowWindow(hwnd, SW_RESTORE);
                                let _ = SetForegroundWindow(hwnd);
                                std::thread::sleep(std::time::Duration::from_millis(30));

                                // 1. Try IUIAutomationInvokePattern
                                if let Ok(invoker) = child.GetCurrentPatternAs::<IUIAutomationInvokePattern>(UIA_InvokePatternId) {
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
                    }
                }
            }
        }
    }

    false
}

#[cfg(windows)]
pub fn answer_system_call() -> Result<(), String> {
    // 1. Try UI Automation first (clicks exact "Terima" / "Accept" button in WhatsApp or Toast)
    let keywords = &["terima", "accept", "jawab", "answer", "join", "gabung"];
    if try_click_call_button(keywords) {
        return Ok(());
    }

    // 2. Fallback: Win32 focus and Enter key on all candidate communication windows
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SetForegroundWindow, SW_RESTORE, PostMessageW, WM_KEYDOWN, WM_KEYUP};
    use windows::Win32::Foundation::{WPARAM, LPARAM};

    let comm_hwnds = get_all_communication_hwnds();
    for hwnd in comm_hwnds {
        unsafe {
            let _ = ShowWindow(hwnd, SW_RESTORE);
            let _ = SetForegroundWindow(hwnd);
            std::thread::sleep(std::time::Duration::from_millis(50));

            keybd_event(0x0D, 0, 0, 0); // VK_RETURN down
            keybd_event(0x0D, 0, 2, 0); // VK_RETURN up
            let _ = PostMessageW(hwnd, WM_KEYDOWN, WPARAM(0x0D), LPARAM(0));
            let _ = PostMessageW(hwnd, WM_KEYUP, WPARAM(0x0D), LPARAM(0));
        }
        break;
    }

    Ok(())
}

#[cfg(windows)]
pub fn decline_or_end_system_call() -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SetForegroundWindow, SW_RESTORE, PostMessageW, WM_CLOSE, GetWindowTextW};
    use windows::Win32::Foundation::{WPARAM, LPARAM};

    // 1. Try UI Automation first: searches for End / Hangup / Decline / Leave buttons
    let keywords = &[
        "akhiri", "end", "hang", "leave", "tinggalkan", "disconnect",
        "tolak", "decline", "reject", "tutup", "batal", "selesai", "putus"
    ];
    if try_click_call_button(keywords) {
        if let Ok(mut lock) = LAST_CALL_HWND.lock() {
            *lock = None;
        }
        return Ok(());
    }

    // 2. Fallback: Find candidate communication windows and send WM_CLOSE to dedicated call windows
    let comm_hwnds = get_all_communication_hwnds();
    for h in &comm_hwnds {
        let mut title_buf = [0u16; 256];
        let len = unsafe { GetWindowTextW(*h, &mut title_buf) };
        let title = String::from_utf16_lossy(&title_buf[..len as usize]).to_lowercase();

        // If this window is a dedicated call window (title has "call", "panggilan", or contact name != "whatsapp")
        let is_call_window = title.contains("call") || title.contains("panggilan") || title.contains("voice") || title.contains("video");
        if is_call_window {
            unsafe {
                let _ = ShowWindow(*h, SW_RESTORE);
                let _ = SetForegroundWindow(*h);
                std::thread::sleep(std::time::Duration::from_millis(40));

                // Send WM_CLOSE to terminate the call window
                let _ = PostMessageW(*h, WM_CLOSE, WPARAM(0), LPARAM(0));
            }
        }
    }

    // 3. Fallback: Send WhatsApp global hangup hotkey (Ctrl + Shift + H) & Escape
    for h in &comm_hwnds {
        unsafe {
            let _ = ShowWindow(*h, SW_RESTORE);
            let _ = SetForegroundWindow(*h);
            std::thread::sleep(std::time::Duration::from_millis(40));

            // Send Ctrl + Shift + H
            keybd_event(0x11, 0, 0, 0); // VK_CONTROL down
            keybd_event(0x10, 0, 0, 0); // VK_SHIFT down
            keybd_event(0x48, 0, 0, 0); // 'H' down
            keybd_event(0x48, 0, 2, 0); // 'H' up
            keybd_event(0x10, 0, 2, 0); // VK_SHIFT up
            keybd_event(0x11, 0, 2, 0); // VK_CONTROL up

            // Send Escape
            keybd_event(0x1B, 0, 0, 0);
            keybd_event(0x1B, 0, 2, 0);
        }
        break; // Only send hotkey to primary communication window
    }

    if let Ok(mut lock) = LAST_CALL_HWND.lock() {
        *lock = None;
    }

    Ok(())
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
pub fn decline_or_end_system_call() -> Result<(), String> {
    Ok(())
}
