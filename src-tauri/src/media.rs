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
    // 1. Scan sessions and prioritize an actively playing session
    if let Ok(sessions) = manager.GetSessions() {
        let size = sessions.Size().unwrap_or(0);
        let mut playing_session: Option<GlobalSystemMediaTransportControlsSession> = None;
        let mut paused_session: Option<GlobalSystemMediaTransportControlsSession> = None;

        for i in 0..size {
            if let Ok(session) = sessions.GetAt(i) {
                if let Ok(playback) = session.GetPlaybackInfo() {
                    if let Ok(status) = playback.PlaybackStatus() {
                        if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                            playing_session = Some(session);
                            break;
                        } else if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                            if paused_session.is_none() {
                                paused_session = Some(session);
                            }
                        }
                    }
                }
            }
        }

        if let Some(s) = playing_session {
            return Some(s);
        }
        if let Some(s) = paused_session {
            return Some(s);
        }
    }

    // 2. Fallback to default current session
    manager.GetCurrentSession().ok()
}

#[cfg(windows)]
fn load_thumbnail_base64_sync(props: &GlobalSystemMediaTransportControlsSessionMediaProperties) -> Option<String> {
    use windows::Storage::Streams::DataReader;

    let thumb_ref = props.Thumbnail().ok()?;
    let stream = thumb_ref.OpenReadAsync().ok()?.get().ok()?;
    let size = stream.Size().unwrap_or(0) as u32;
    if size == 0 || size > 4_000_000 {
        return None;
    }

    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size).ok()?.get().ok()?;

    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;

    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Some(format!("data:image/jpeg;base64,{}", encoded))
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
    let manager = get_session_manager()?;
    let session = get_active_session(&manager)?;

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
        let pos = tl.Position().map(|d| (d.Duration / 10_000_000) as u64).unwrap_or(0);
        let dur = tl.EndTime().map(|d| (d.Duration / 10_000_000) as u64).unwrap_or(0);
        (pos, dur)
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

    Some(MediaInfo {
        title,
        artist,
        album,
        thumbnail,
        is_playing,
        position_sec,
        duration_sec,
        source_app,
    })
}

#[cfg(not(windows))]
pub fn fetch_current_media() -> Option<MediaInfo> {
    None
}

#[cfg(windows)]
pub fn toggle_play_pause() -> Result<(), String> {
    let manager = get_session_manager().ok_or_else(|| "No SMTC manager".to_string())?;
    let session = get_active_session(&manager).ok_or_else(|| "No active session".to_string())?;
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
