// Lokasi perangkat lewat Windows Location Provider (WiFi/GPS).
//
// Deteksi berbasis IP (get.geojs.io / ipapi.co) menunjuk gateway ISP, bukan posisi perangkat:
// terukur di mesin pengembang, IP memberi Jakarta sementara perangkat ada di Kudus, dan jadwal
// salatnya meleset 14-16 menit. Geolocator memberi posisi sebenarnya (akurasi ~150 m via WiFi).
//
// Kalau izin ditolak, tidak ada provider, atau timeout, frontend jatuh ke rantai IP lama.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLocation {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy_m: Option<f64>,
}

#[cfg(windows)]
fn read_geolocator() -> Result<DeviceLocation, String> {
    use windows::Devices::Geolocation::{GeolocationAccessStatus, Geolocator};
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

    // Apartment harus diinisialisasi di thread tempat objek WinRT dibuat. S_FALSE (sudah
    // diinisialisasi) dan RPC_E_CHANGED_MODE diabaikan — pola sama seperti notifications.rs.
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    let access = Geolocator::RequestAccessAsync()
        .map_err(|e| format!("izin lokasi tidak bisa diminta: {e}"))?
        .get()
        .map_err(|e| format!("izin lokasi gagal dibaca: {e}"))?;

    // Unspecified (0) BUKAN penolakan: aplikasi Win32 tanpa paket MSIX sering mendapat nilai ini
    // padahal izin "Let desktop apps access your location" menyala. Hanya Denied yang gagal.
    if access == GeolocationAccessStatus::Denied {
        return Err("akses lokasi ditolak".to_string());
    }

    let locator = Geolocator::new().map_err(|e| format!("Geolocator gagal dibuat: {e}"))?;

    // Akurasi Default (WiFi/IP), bukan High: desktop tanpa GPS bisa menunggu fix lama.
    let position = locator
        .GetGeopositionAsync()
        .map_err(|e| format!("lokasi perangkat tidak tersedia: {e}"))?
        .get()
        .map_err(|e| format!("lokasi perangkat tidak tersedia: {e}"))?;

    let coordinate = position
        .Coordinate()
        .map_err(|e| format!("koordinat perangkat gagal dibaca: {e}"))?;
    let basic = coordinate
        .Point()
        .and_then(|point| point.Position())
        .map_err(|e| format!("koordinat perangkat gagal dibaca: {e}"))?;

    if !basic.Latitude.is_finite() || !basic.Longitude.is_finite() {
        return Err("koordinat perangkat tidak valid".to_string());
    }

    Ok(DeviceLocation {
        latitude: basic.Latitude,
        longitude: basic.Longitude,
        accuracy_m: coordinate.Accuracy().ok(),
    })
}

/// Lokasi perangkat. Dijalankan di thread worker dengan batas waktu supaya provider lokasi yang
/// menggantung (dialog izin, provider mati) tidak pernah membekukan UI — pola media.rs.
pub fn get_device_location() -> Result<DeviceLocation, String> {
    #[cfg(windows)]
    {
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let _ = tx.send(read_geolocator());
        });
        rx.recv_timeout(std::time::Duration::from_secs(8))
            .map_err(|_| "lokasi perangkat timeout".to_string())?
    }
    #[cfg(not(windows))]
    {
        Err("lokasi perangkat hanya tersedia di Windows".to_string())
    }
}
