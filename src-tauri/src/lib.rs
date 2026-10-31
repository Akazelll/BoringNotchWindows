mod media;
mod power;
mod notifications;
mod sysinfo;
mod autostart;

use media::MediaInfo;
use notifications::{AppNotification, CallEventInfo};
use power::BatteryInfo;
use sysinfo::SystemStats;
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
fn get_system_stats() -> SystemStats {
    sysinfo::get_system_stats()
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
fn set_notch_expanded(window: tauri::WebviewWindow, expanded: bool) {
    let (w, h) = if expanded { (420.0, 220.0) } else { (375.0, 42.0) };
    set_notch_size(window, w, h);
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
                let mut last_notif_ids = Vec::<u32>::new();
                let mut last_call_key = String::new();
                let mut is_hidden_by_fullscreen = false;

                loop {
                    tokio::time::sleep(Duration::from_millis(600)).await;

                    // 1. Fetch media state
                    let current_media = media::fetch_current_media();

                    // 2. Video fullscreen auto-hide detection
                    let is_video_fs = match &current_media {
                        Some(m) => sysinfo::is_video_fullscreen(Some(&m.source_app), m.is_playing),
                        None => sysinfo::is_video_fullscreen(None, false),
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
                    let notif_ids: Vec<u32> = active_notifs.iter().map(|n| n.id).collect();
                    if notif_ids != last_notif_ids {
                        last_notif_ids = notif_ids;
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
                        println!("[Call Event] Streaming call: {:?}", current_call);
                        let _ = app_handle.emit("call-state-changed", &current_call);
                    }

                    // 7. System Stats streaming
                    let stats = sysinfo::get_system_stats();
                    let _ = app_handle.emit("system-stats-changed", &stats);
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
            get_system_stats,
            get_windows_username,
            is_autostart_enabled,
            set_autostart_enabled,
            set_notch_size,
            set_notch_expanded
        ])
        .run(tauri::generate_context!())
        .expect("error while running boring-notch");
}
