use serde::Serialize;

/// Kursor dianggap diam setelah selama ini tidak bergeser lebih dari `MOVE_DEADZONE`.
const IDLE_THRESHOLD_SECS: u64 = 60;

/// Ambang pergeseran minimum supaya jitter perangkat tidak terus me-reset timer idle.
const MOVE_DEADZONE: i32 = 2;

/// Jarak layar (px) saat pupil mencapai simpangan maksimum.
const FOCUS_DISTANCE: f32 = 800.0;

/// Geseran pupil maksimum, px.
const MAX_TX: f32 = 7.0;
const MAX_TY: f32 = 5.0;

/// Di bawah jarak ini pupil membesar — meniru referensi RobotEyes.
const FOCUS_ZOOM_DISTANCE: f32 = 60.0;
const FOCUS_ZOOM_SCALE: f32 = 1.08;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CursorState {
    /// Geseran pupil horizontal, px (maks ±MAX_TX).
    pub tx: f32,
    /// Geseran pupil vertikal, px (maks ±MAX_TY).
    pub ty: f32,
    /// Skala pupil: 1.0 normal, FOCUS_ZOOM_SCALE saat kursor dekat.
    pub sc: f32,
    /// Kursor diam >= IDLE_THRESHOLD_SECS.
    pub is_idle: bool,
}

impl Default for CursorState {
    fn default() -> Self {
        Self {
            tx: 0.0,
            ty: 0.0,
            sc: 1.0,
            is_idle: false,
        }
    }
}

impl CursorState {
    /// Bandingkan secara kasar: perubahan sepersepuluh px tidak perlu dikirim ke frontend.
    pub fn changed_enough(&self, other: &Self) -> bool {
        (self.tx - other.tx).abs() >= 0.1
            || (self.ty - other.ty).abs() >= 0.1
            || (self.sc - other.sc).abs() >= 0.01
            || self.is_idle != other.is_idle
    }
}

#[cfg(windows)]
mod imp {
    use super::*;
    use std::sync::Mutex;
    use std::time::Instant;
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    /// Posisi terakhir yang dianggap "bergerak", beserta waktunya.
    static LAST_MOVE: Mutex<Option<(i32, i32, Instant)>> = Mutex::new(None);

    pub fn fetch_cursor_state(window: &tauri::WebviewWindow) -> Option<CursorState> {
        let mut pt = POINT::default();
        unsafe { GetCursorPos(&mut pt).ok()? };

        // Titik asal "mata": tengah notch, sedikit di bawah bibir atas layar.
        let origin = window.outer_position().ok()?;
        let size = window.outer_size().ok()?;
        let scale = window
            .primary_monitor()
            .ok()
            .flatten()
            .map(|m| m.scale_factor() as f32)
            .unwrap_or(1.0)
            .max(0.1);

        let origin_x = origin.x as f32 + size.width as f32 / 2.0;
        let origin_y = origin.y as f32 + size.height as f32 / 2.0;

        // Posisi kursor dan jarak datang dalam satuan fisik; arah tidak bergantung DPI,
        // jadi bagi dengan `scale` supaya hasilnya langsung sebanding dengan CSS px.
        let dx = (pt.x as f32 - origin_x) / scale;
        let dy = (pt.y as f32 - origin_y) / scale;
        let dist = (dx * dx + dy * dy).sqrt();

        let (tx, ty, sc) = if dist < 0.5 {
            (0.0, 0.0, 1.0)
        } else {
            let k = (dist / FOCUS_DISTANCE).min(1.0);
            (
                round1(dx / dist * k * MAX_TX),
                round1(dy / dist * k * MAX_TY),
                if dist < FOCUS_ZOOM_DISTANCE {
                    FOCUS_ZOOM_SCALE
                } else {
                    1.0
                },
            )
        };

        Some(CursorState {
            tx,
            ty,
            sc,
            is_idle: track_idle(pt.x, pt.y),
        })
    }

    /// Perbarui penanda gerak, lalu laporkan apakah kursor sudah diam cukup lama.
    fn track_idle(x: i32, y: i32) -> bool {
        let Ok(mut lock) = LAST_MOVE.lock() else {
            return false;
        };
        match *lock {
            Some((last_x, last_y, at)) => {
                let moved = (x - last_x).abs() + (y - last_y).abs() > MOVE_DEADZONE;
                if moved {
                    *lock = Some((x, y, Instant::now()));
                    false
                } else {
                    at.elapsed().as_secs() >= IDLE_THRESHOLD_SECS
                }
            }
            None => {
                *lock = Some((x, y, Instant::now()));
                false
            }
        }
    }

    fn round1(v: f32) -> f32 {
        (v * 10.0).round() / 10.0
    }
}

#[cfg(windows)]
pub use imp::fetch_cursor_state;

#[cfg(not(windows))]
pub fn fetch_cursor_state(_window: &tauri::WebviewWindow) -> Option<CursorState> {
    None
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn changed_enough_ignores_sub_pixel_drift() {
        let a = CursorState::default();
        let b = CursorState {
            tx: 0.05,
            ..CursorState::default()
        };
        assert!(!a.changed_enough(&b));
    }

    #[test]
    fn changed_enough_detects_real_movement_and_idle_flip() {
        let a = CursorState::default();
        let moved = CursorState {
            tx: 3.0,
            ..CursorState::default()
        };
        assert!(a.changed_enough(&moved));

        let idle = CursorState {
            is_idle: true,
            ..CursorState::default()
        };
        assert!(a.changed_enough(&idle));
    }

    #[test]
    fn default_state_looks_straight_ahead() {
        let s = CursorState::default();
        assert_eq!((s.tx, s.ty, s.sc), (0.0, 0.0, 1.0));
        assert!(!s.is_idle);
    }
}
