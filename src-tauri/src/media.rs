use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub thumbnail: Option<String>,
    pub is_playing: bool,
    pub position_sec: u64,
    pub duration_sec: u64,
    pub source_app: String,
}

// Cached manager singleton
static MANAGER_CACHE: Mutex<Option<windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager>> = Mutex::new(None);

// Cached thumbnail for the currently playing track
static CACHED_THUMBNAIL: Mutex<Option<(String, Option<String>)>> = Mutex::new(None);

// Cached last active app and media info to maintain state when paused
static LAST_ACTIVE_APP: Mutex<Option<String>> = Mutex::new(None);

#[cfg(windows)]
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

#[cfg(windows)]
fn get_session_manager() -> Option<GlobalSystemMediaTransportControlsSessionManager> {
    let mut lock = MANAGER_CACHE.lock().unwrap();
    if let Some(ref m) = *lock {
        return Some(m.clone());
    }

    if let Ok(op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
        if let Ok(m) = op.get() {
            *lock = Some(m.clone());
            return Some(m);
        }
    }
    None
}

#[cfg(windows)]
fn get_active_session(
    manager: &GlobalSystemMediaTransportControlsSessionManager,
) -> Option<GlobalSystemMediaTransportControlsSession> {
    let last_app = LAST_ACTIVE_APP.lock().unwrap().clone();

    // 1. Scan sessions and prioritize an actively playing session with valid metadata
    if let Ok(sessions) = manager.GetSessions() {
        let size = sessions.Size().unwrap_or(0);
        let mut playing_session: Option<GlobalSystemMediaTransportControlsSession> = None;
        let mut last_app_paused: Option<GlobalSystemMediaTransportControlsSession> = None;
        let mut other_paused: Option<GlobalSystemMediaTransportControlsSession> = None;

        for i in 0..size {
            if let Ok(session) = sessions.GetAt(i) {
                // Verify that this session has valid media properties (avoid empty dummy sessions)
                let has_valid_media = if let Ok(op) = session.TryGetMediaPropertiesAsync() {
                    if let Ok(props) = op.get() {
                        let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
                        let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();
                        !title.trim().is_empty() || !artist.trim().is_empty()
                    } else {
                        false
                    }
                } else {
                    false
                };

                if !has_valid_media {
                    continue;
                }

                let source_app = session.SourceAppUserModelId().map(|s| s.to_string()).unwrap_or_default();

                if let Ok(playback) = session.GetPlaybackInfo() {
                    if let Ok(status) = playback.PlaybackStatus() {
                        if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                            playing_session = Some(session);
                            break;
                        } else if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused
                            || status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped
                        {
                            if let Some(ref la) = last_app {
                                if &source_app == la && last_app_paused.is_none() {
                                    last_app_paused = Some(session.clone());
                                }
                            }
                            if other_paused.is_none() {
                                other_paused = Some(session);
                            }
                        }
                    }
                }
            }
        }

        if let Some(s) = playing_session {
            if let Ok(app_id) = s.SourceAppUserModelId() {
                *LAST_ACTIVE_APP.lock().unwrap() = Some(app_id.to_string());
            }
            return Some(s);
        }
        if let Some(s) = last_app_paused {
            return Some(s);
        }
        if let Some(s) = other_paused {
            return Some(s);
        }
    }

    // 2. Fallback to default current session
    if let Ok(current) = manager.GetCurrentSession() {
        if let Ok(app_id) = current.SourceAppUserModelId() {
            *LAST_ACTIVE_APP.lock().unwrap() = Some(app_id.to_string());
        }
        return Some(current);
    }

    None
}

#[cfg(windows)]
fn load_thumbnail_base64_sync(props: &GlobalSystemMediaTransportControlsSessionMediaProperties) -> Option<String> {
    let thumb_ref = props.Thumbnail().ok()?;
    let stream = thumb_ref.OpenReadAsync().ok()?.get().ok()?;
    crate::image_util::stream_to_data_url(&stream)
}

#[cfg(windows)]
fn load_thumbnail_safe(props: &GlobalSystemMediaTransportControlsSessionMediaProperties) -> Option<String> {
    // Run thumbnail reading with a 400ms timeout so a hanging stream will NEVER freeze the application
    let props_clone = props.clone();
    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let result = load_thumbnail_base64_sync(&props_clone);
        let _ = tx.send(result);
    });

    rx.recv_timeout(Duration::from_millis(400)).unwrap_or(None)
}

#[cfg(windows)]
pub fn fetch_current_media() -> Option<MediaInfo> {
    let manager = match get_session_manager() {
        Some(m) => m,
        None => {
            *LAST_ACTIVE_APP.lock().unwrap() = None;
            return None;
        }
    };

    // If there are 0 sessions registered in Windows, all media players were closed!
    if let Ok(sessions) = manager.GetSessions() {
        if sessions.Size().unwrap_or(0) == 0 {
            *LAST_ACTIVE_APP.lock().unwrap() = None;
            return None;
        }
    }

    let session = match get_active_session(&manager) {
        Some(s) => s,
        None => {
            // No active or valid paused session exists -> media player was closed or stopped!
            *LAST_ACTIVE_APP.lock().unwrap() = None;
            return None;
        }
    };

    let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
    let playback = session.GetPlaybackInfo().ok()?;
    let timeline = session.GetTimelineProperties().ok();

    let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
    let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();
    let album = props.AlbumTitle().map(|s| s.to_string()).unwrap_or_default();
    let source_app = session.SourceAppUserModelId().map(|s| s.to_string()).unwrap_or_default();

    if title.trim().is_empty() && artist.trim().is_empty() {
        return None;
    }

    let is_playing = playback
        .PlaybackStatus()
        .map(|st| st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
        .unwrap_or(false);

    let (position_sec, duration_sec) = if let Some(tl) = timeline {
        let dur = tl.EndTime().map(|d| (d.Duration / 10_000_000) as u64).unwrap_or(0);
        let base_ticks = tl.Position().map(|d| d.Duration).unwrap_or(0);

        let current_ticks = if is_playing {
            if let Ok(last_updated) = tl.LastUpdatedTime() {
                if last_updated.UniversalTime > 0 {
                    // Windows FILETIME: 100ns intervals since Jan 1, 1601 UTC
                    // UNIX_EPOCH is Jan 1, 1970 UTC (offset: 116_444_736_000_000_000 ticks)
                    let now_ticks = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| (d.as_nanos() / 100) as i64 + 116_444_736_000_000_000)
                        .unwrap_or(last_updated.UniversalTime);
                    let elapsed = (now_ticks - last_updated.UniversalTime).max(0);
                    base_ticks + elapsed
                } else {
                    base_ticks
                }
            } else {
                base_ticks
            }
        } else {
            base_ticks
        };

        let final_pos = (current_ticks.max(0) / 10_000_000) as u64;
        let clamped_pos = if dur > 0 && final_pos > dur { dur } else { final_pos };
        (clamped_pos, dur)
    } else {
        (0, 0)
    };

    // Check cached thumbnail
    let track_key = format!("{}::{}", title, artist);
    let mut cache = CACHED_THUMBNAIL.lock().unwrap();

    let thumbnail = if let Some((ref cached_key, ref cached_thumb)) = *cache {
        if cached_key == &track_key {
            cached_thumb.clone()
        } else {
            let new_thumb = load_thumbnail_safe(&props);
            *cache = Some((track_key, new_thumb.clone()));
            new_thumb
        }
    } else {
        let new_thumb = load_thumbnail_safe(&props);
        *cache = Some((track_key, new_thumb.clone()));
        new_thumb
    };

    let media_info = MediaInfo {
        title,
        artist,
        album,
        thumbnail,
        is_playing,
        position_sec,
        duration_sec,
        source_app,
    };

    Some(media_info)
}

#[cfg(not(windows))]
pub fn fetch_current_media() -> Option<MediaInfo> {
    None
}

#[cfg(windows)]
pub fn toggle_play_pause() -> Result<(), String> {
    let manager = get_session_manager().ok_or_else(|| "No SMTC manager".to_string())?;
    let session = get_active_session(&manager).ok_or_else(|| "No active session".to_string())?;

    // Try Play first if session is currently paused/stopped
    let is_paused_or_stopped = session
        .GetPlaybackInfo()
        .ok()
        .and_then(|p| p.PlaybackStatus().ok())
        .map(|st| {
            st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused
                || st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped
        })
        .unwrap_or(false);

    if is_paused_or_stopped {
        if let Ok(op) = session.TryPlayAsync() {
            if let Ok(success) = op.get() {
                if success {
                    return Ok(());
                }
            }
        }
    }

    let _ = session
        .TryTogglePlayPauseAsync()
        .map_err(|e| e.to_string())?
        .get();
    Ok(())
}

#[cfg(not(windows))]
pub fn toggle_play_pause() -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
pub fn skip_next() -> Result<(), String> {
    let manager = get_session_manager().ok_or_else(|| "No SMTC manager".to_string())?;
    let session = get_active_session(&manager).ok_or_else(|| "No active session".to_string())?;
    let _ = session
        .TrySkipNextAsync()
        .map_err(|e| e.to_string())?
        .get();
    Ok(())
}

#[cfg(not(windows))]
pub fn skip_next() -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
pub fn skip_previous() -> Result<(), String> {
    let manager = get_session_manager().ok_or_else(|| "No SMTC manager".to_string())?;
    let session = get_active_session(&manager).ok_or_else(|| "No active session".to_string())?;
    let _ = session
        .TrySkipPreviousAsync()
        .map_err(|e| e.to_string())?
        .get();
    Ok(())
}

#[cfg(not(windows))]
pub fn skip_previous() -> Result<(), String> {
    Ok(())
}
