mod media;
mod power;
mod notifications;
mod fullscreen;
mod autostart;
mod bluetooth;
mod cursor;

use cursor::CursorState;
use media::MediaInfo;
use notifications::{AppNotification, CallEventInfo};
use power::BatteryInfo;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use std::time::Duration;

#[tauri::command]
fn get_media_state() -> Option<MediaInfo> {
    media::fetch_current_media()
}

#[tauri::command]
fn media_play_pause() -> Result<(), String> {
    media::toggle_play_pause()
}

#[tauri::command]
fn media_next() -> Result<(), String> {
    media::skip_next()
}

#[tauri::command]
fn media_prev() -> Result<(), String> {
    media::skip_previous()
}

#[tauri::command]
fn get_battery_state() -> BatteryInfo {
    power::get_system_battery()
}

#[tauri::command]
fn get_active_notifications() -> Vec<AppNotification> {
    notifications::fetch_active_notifications()
}

#[tauri::command]
fn get_active_call() -> Option<CallEventInfo> {
    let notifs = notifications::fetch_active_notifications();
    let call_from_notif = notifs.iter().find(|n| n.is_call).map(|n| CallEventInfo {
        caller_name: n.title.clone(),
        caller_number: if n.message.is_empty() { None } else { Some(n.message.clone()) },
        app_source: n.app_type.clone(),
        state: "incoming".to_string(),
        notif_id: Some(n.id),
    });

    call_from_notif.or_else(|| notifications::detect_call_from_windows())
}

#[tauri::command]
fn answer_system_call() -> Result<(), String> {
    notifications::answer_system_call()
}

#[tauri::command]
fn decline_system_call() -> Result<(), String> {
    notifications::decline_or_end_system_call(true)
}

#[tauri::command]
fn end_system_call() -> Result<(), String> {
    notifications::decline_or_end_system_call(false)
}

#[tauri::command]
fn get_windows_username() -> String {
    std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string())
}

#[tauri::command]
fn is_autostart_enabled() -> bool {
    autostart::is_autostart_enabled()
}

#[tauri::command]
fn set_autostart_enabled(enabled: bool) -> Result<(), String> {
    if enabled {
        autostart::enable_autostart()
    } else {
        autostart::disable_autostart()
    }
}

#[tauri::command]
fn set_notch_size(window: tauri::WebviewWindow, width: f64, height: f64) {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let scale = monitor.scale_factor();
        let screen_width = monitor.size().width as f64 / scale;
        let pos_x = (screen_width - width) / 2.0;
        let _ = window.set_size(tauri::LogicalSize::new(width, height));
        let _ = window.set_position(tauri::LogicalPosition::new(pos_x, 0.0));
    }
}

#[tauri::command]
fn get_cursor_state(window: tauri::WebviewWindow) -> Option<CursorState> {
    cursor::fetch_cursor_state(&window)
}

#[tauri::command]
fn trigger_notification_test(app_name: Option<String>, title: Option<String>, message: Option<String>) {
    notifications::trigger_simulated_notification(AppNotification {
        id: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as u32,
        app_name: app_name.unwrap_or_else(|| "WhatsApp".to_string()),
        app_type: "whatsapp".to_string(),
        title: title.unwrap_or_else(|| "Budi Santoso".to_string()),
        message: message.unwrap_or_else(|| "Halo bro, ada info terbaru nih!".to_string()),
        is_call: false,
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Position window at top-center on launch (flush against the top edge)
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let scale = monitor.scale_factor();
                    let screen_width = monitor.size().width as f64 / scale;
                    let initial_width = 375.0;
                    let initial_height = 42.0;
                    let pos_x = (screen_width - initial_width) / 2.0;
                    let _ = window.set_size(tauri::LogicalSize::new(initial_width, initial_height));
                    let _ = window.set_position(tauri::LogicalPosition::new(pos_x, 0.0));
                }
            }

            // Setup System Tray icon ("Show hidden icons" on Windows Taskbar)
            let show_notch = MenuItem::with_id(app, "show_notch", "Tampilkan Notch", true, None::<&str>)?;
            let hide_notch = MenuItem::with_id(app, "hide_notch", "Sembunyikan Notch", true, None::<&str>)?;

            // Submenu Transparansi Notch
            let op_100 = MenuItem::with_id(app, "op_100", "● 100% (Solid Black)", true, None::<&str>)?;
            let op_90 = MenuItem::with_id(app, "op_90", "90% (Transparan Halus)", true, None::<&str>)?;
            let op_75 = MenuItem::with_id(app, "op_75", "75% (Transparan Sedang)", true, None::<&str>)?;
            let op_60 = MenuItem::with_id(app, "op_60", "60% (Transparan Kaca)", true, None::<&str>)?;
            let op_45 = MenuItem::with_id(app, "op_45", "45% (Sangat Bening)", true, None::<&str>)?;

            let transparency_menu = Submenu::with_items(
                app,
                "🎨 Transparansi Notch",
                true,
                &[&op_100, &op_90, &op_75, &op_60, &op_45],
            )?;

            // Startup Toggle Checkbox in Tray
            let is_start = autostart::is_autostart_enabled();
            let autostart_item = CheckMenuItem::with_id(app, "toggle_autostart", "🚀 Jalankan saat Startup", true, is_start, None::<&str>)?;

            let quit_app = MenuItem::with_id(app, "quit", "❌ Keluar dari Boring Notch", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[
                &show_notch,
                &hide_notch,
                &PredefinedMenuItem::separator(app)?,
                &transparency_menu,
                &autostart_item,
                &PredefinedMenuItem::separator(app)?,
                &quit_app,
            ])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .tooltip("Boring Notch Windows")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show_notch" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide_notch" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "op_100" => {
                            let _ = app.emit("set-opacity", 1.0f64);
                        }
                        "op_90" => {
                            let _ = app.emit("set-opacity", 0.90f64);
                        }
                        "op_75" => {
                            let _ = app.emit("set-opacity", 0.75f64);
                        }
                        "op_60" => {
                            let _ = app.emit("set-opacity", 0.60f64);
                        }
                        "op_45" => {
                            let _ = app.emit("set-opacity", 0.45f64);
                        }
                        "toggle_autostart" => {
                            let current = autostart::is_autostart_enabled();
                            if current {
                                let _ = autostart::disable_autostart();
                            } else {
                                let _ = autostart::enable_autostart();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _ = tray_builder.build(app);

            // Background task to stream media, battery, notifications, system stats, and calls
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut last_title = String::new();
                let mut last_playing = false;
                let mut last_pos = 0u64;
                let mut last_battery_level = 255u8;
                let mut last_charging = false;
                let mut last_active_notifs = Vec::<AppNotification>::new();
                let mut last_call_key = String::new();
                let mut last_bt_device = String::new();
                let mut is_hidden_by_fullscreen = false;

                loop {
                    tokio::time::sleep(Duration::from_millis(600)).await;

                    // 1. Fetch media state
                    let current_media = media::fetch_current_media();

                    // 2. Video fullscreen auto-hide detection
                    let is_video_fs = match &current_media {
                        Some(m) => fullscreen::is_video_fullscreen(Some(&m.source_app), m.is_playing),
                        None => fullscreen::is_video_fullscreen(None, false),
                    };

                    if let Some(window) = app_handle.get_webview_window("main") {
                        if is_video_fs && !is_hidden_by_fullscreen {
                            let _ = window.hide();
                            is_hidden_by_fullscreen = true;
                        } else if !is_video_fs && is_hidden_by_fullscreen {
                            let _ = window.show();
                            is_hidden_by_fullscreen = false;
                        }
                    }

                    // 3. Media streaming
                    match &current_media {
                        Some(m) => {
                            let pos_jump = (m.position_sec as i64 - last_pos as i64).abs();
                            if m.title != last_title || m.is_playing != last_playing || pos_jump > 2 {
                                last_title = m.title.clone();
                                last_playing = m.is_playing;
                                last_pos = m.position_sec;
                                let _ = app_handle.emit("media-state-changed", Some(m));
                            }
                        }
                        None => {
                            if !last_title.is_empty() {
                                last_title.clear();
                                last_playing = false;
                                last_pos = 0;
                                let _ = app_handle.emit("media-state-changed", Option::<MediaInfo>::None);
                            }
                        }
                    }

                    // 4. Battery streaming
                    let battery = power::get_system_battery();
                    if battery.level != last_battery_level || battery.is_charging != last_charging {
                        last_battery_level = battery.level;
                        last_charging = battery.is_charging;
                        let _ = app_handle.emit("battery-state-changed", &battery);
                    }

                    // 5. Windows Notifications streaming
                    let active_notifs = notifications::fetch_active_notifications();
                    if active_notifs != last_active_notifs {
                        last_active_notifs = active_notifs.clone();
                        let _ = app_handle.emit("notifications-changed", &active_notifs);
                    }

                    // 6. Direct Call Detection (Notifications + Win32 Windows)
                    let call_from_notif = active_notifs.iter().find(|n| n.is_call).map(|n| CallEventInfo {
                        caller_name: n.title.clone(),
                        caller_number: if n.message.is_empty() { None } else { Some(n.message.clone()) },
                        app_source: n.app_type.clone(),
                        state: "incoming".to_string(),
                        notif_id: Some(n.id),
                    });

                    let current_call = call_from_notif.or_else(|| notifications::detect_call_from_windows());
                    let call_key = current_call.as_ref().map(|c| format!("{}::{}", c.caller_name, c.state)).unwrap_or_default();

                    if call_key != last_call_key {
                        last_call_key = call_key;
                        let _ = app_handle.emit("call-state-changed", &current_call);
                    }

                    // 8. Bluetooth Connected Event Streaming
                    if let Some(bt) = bluetooth::fetch_connected_bluetooth() {
                        let name_lower = bt.name.to_lowercase().trim().to_string();
                        let is_generic = name_lower == "headset"
                            || name_lower == "headphones"
                            || name_lower == "headphone"
                            || name_lower == "earphone"
                            || name_lower == "audio"
                            || name_lower == "bluetooth"
                            || name_lower.starts_with("hands-free");

                        if !is_generic {
                            let bt_key = format!("{}::{}", bt.name, bt.battery_percent);
                            if bt_key != last_bt_device {
                                last_bt_device = bt_key;
                                let _ = app_handle.emit("bluetooth-connected", &bt);
                            }
                        }
                    } else if !last_bt_device.is_empty() {
                        last_bt_device.clear();
                    }
                }
            });

            // Task terpisah: posisi kursor untuk mata robot saat notch idle.
            // 100ms agar gerakan pupil mengikuti `transition: 90ms` di frontend dengan mulus.
            let cursor_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut last = CursorState::default();
                loop {
                    tokio::time::sleep(Duration::from_millis(100)).await;

                    let Some(window) = cursor_handle.get_webview_window("main") else {
                        continue;
                    };
                    let Some(state) = cursor::fetch_cursor_state(&window) else {
                        continue;
                    };

                    if state.changed_enough(&last) {
                        let _ = cursor_handle.emit("cursor-state-changed", &state);
                        last = state;
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_media_state,
            media_play_pause,
            media_next,
            media_prev,
            get_battery_state,
            get_active_notifications,
            get_active_call,
            get_windows_username,
            is_autostart_enabled,
            set_autostart_enabled,
            set_notch_size,
            get_cursor_state,
            trigger_notification_test,
            answer_system_call,
            decline_system_call,
            end_system_call
        ])
        .run(tauri::generate_context!())
        .expect("error while running boring-notch");
}
