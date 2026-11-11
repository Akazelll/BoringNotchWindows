//! Ekstraksi ikon aplikasi dari berkas exe, untuk panggilan yang tidak punya
//! toast (jadi tidak bisa memakai logo WinRT seperti notifikasi).
//!
//! Jalur: `SHGetFileInfoW` -> `HICON` -> `DrawIconEx` ke DIB 32bpp -> BMP -> data URL.
//! BMP dipilih karena WebView2 (Chromium) merendernya apa adanya, sehingga tidak
//! perlu encoder PNG.

#[cfg(windows)]
use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, DrawIconEx, DI_NORMAL, HICON};

/// Sisi ikon yang diekstrak, dalam piksel. 32 adalah ukuran ikon besar standar
/// Windows; di atas itu banyak exe hanya menyediakan ikon yang di-upscale.
#[cfg(windows)]
const ICON_SIZE: i32 = 32;

/// Batas luminansi rata-rata. Logo yang lebih gelap dari ini akan hilang di latar
/// notch (#09090b), jadi lebih jujur mengembalikan `None` dan membiarkan frontend
/// memakai glyph lama daripada menampilkan kotak yang tak terlihat.
#[cfg(windows)]
const MIN_AVG_LUMINANCE: f32 = 0.18;

/// Ikon aplikasi dari path exe sebagai data URL BMP.
///
/// `None` bila path tidak ada, ikon gagal dibaca, atau ikonnya terlalu gelap
/// untuk terlihat di latar notch.
#[cfg(windows)]
pub fn extract_exe_icon(exe_path: &str) -> Option<String> {
    if exe_path.trim().is_empty() || !std::path::Path::new(exe_path).exists() {
        return None;
    }

    unsafe {
        let mut info = SHFILEINFOW::default();
        let wide = to_wide(exe_path);

        let ok = SHGetFileInfoW(
            windows::core::PCWSTR(wide.as_ptr()),
            Default::default(),
            Some(&mut info),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );
        if ok == 0 || info.hIcon.is_invalid() {
            return None;
        }

        let result = render_icon_to_bmp(info.hIcon);
        let _ = DestroyIcon(info.hIcon);
        result
    }
}

/// Ikon aplikasi dengan cache per-path, dibungkus batas waktu.
///
/// Membaca dari disk bisa lambat (path jaringan lebih lambat lagi), jadi hasilnya
/// di-cache: steady-state jadi nol biaya. Kegagalan sengaja TIDAK di-cache, supaya
/// ikon masih bisa muncul kalau percobaan pertama kebetulan gagal.
#[cfg(windows)]
pub fn extract_exe_icon_cached(exe_path: &str) -> Option<String> {
    use std::collections::HashMap;
    use std::sync::Mutex;

    static CACHE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);
    static FAILED: Mutex<Option<HashMap<String, ()>>> = Mutex::new(None);

    let key = exe_path.to_lowercase();
    if key.is_empty() {
        return None;
    }

    if let Ok(guard) = CACHE.lock() {
        if let Some(map) = guard.as_ref() {
            if let Some(hit) = map.get(&key) {
                return Some(hit.clone());
            }
        }
    }

    // Jangan ulangi ekstraksi yang sudah diketahui gagal untuk path yang sama.
    if let Ok(guard) = FAILED.lock() {
        if let Some(map) = guard.as_ref() {
            if map.contains_key(&key) {
                return None;
            }
        }
    }

    let owned = exe_path.to_string();
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(extract_exe_icon(&owned));
    });

    let result = rx.recv_timeout(std::time::Duration::from_millis(400)).unwrap_or(None);

    match result {
        Some(url) => {
            if let Ok(mut guard) = CACHE.lock() {
                guard.get_or_insert_with(HashMap::new).insert(key, url.clone());
            }
            Some(url)
        }
        None => {
            if let Ok(mut guard) = FAILED.lock() {
                guard.get_or_insert_with(HashMap::new).insert(key, ());
            }
            None
        }
    }
}

#[cfg(windows)]
fn to_wide(s: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

/// Render `HICON` ke DIB 32bpp lalu susun berkas BMP lengkap.
#[cfg(windows)]
unsafe fn render_icon_to_bmp(icon: HICON) -> Option<String> {
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, SelectObject, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HBITMAP, HDC, HGDIOBJ,
    };

    let screen_dc = CreateCompatibleDC(None);
    if screen_dc.is_invalid() {
        return None;
    }

    let bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: ICON_SIZE,
            // Tinggi negatif menandakan baris disimpan atas-ke-bawah, sesuai urutan
            // yang diharapkan berkas BMP untuk piksel itu.
            biHeight: -ICON_SIZE,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };

    let mut bits: *mut core::ffi::c_void = std::ptr::null_mut();
    let dib: HBITMAP = match CreateDIBSection(screen_dc, &bmi, DIB_RGB_COLORS, &mut bits, None, 0) {
        Ok(b) if !b.is_invalid() && !bits.is_null() => b,
        _ => {
            let _ = DeleteDC(screen_dc);
            return None;
        }
    };

    let old = SelectObject(screen_dc, HGDIOBJ(dib.0));
    let drawn = DrawIconEx(
        screen_dc,
        0,
        0,
        icon,
        ICON_SIZE,
        ICON_SIZE,
        0,
        None,
        DI_NORMAL,
    );

    let result = if drawn.is_ok() {
        let len = (ICON_SIZE * ICON_SIZE * 4) as usize;
        let pixels = std::slice::from_raw_parts(bits as *const u8, len).to_vec();
        build_bmp(pixels)
    } else {
        None
    };

    SelectObject(screen_dc, old);
    let _ = DeleteObject(HGDIOBJ(dib.0));
    let _ = DeleteDC(screen_dc);
    let _ = HDC::default();

    result
}

/// Susun berkas BMP dari piksel BGRA, sekaligus menjinakkan alpha.
///
/// Dua kasus yang harus ditangani: (1) ikon legacy datang dengan alpha nol semua
/// karena `DrawIconEx` memakai mask, sehingga logo akan tembus pandang total —
/// alpha dipaksa penuh. (2) ikon yang sangat gelap akan hilang di latar notch,
/// jadi ditolak supaya frontend memakai glyph lama.
#[cfg(windows)]
fn build_bmp(mut pixels: Vec<u8>) -> Option<String> {
    // BGRA: tiga kanal warna lebih 1 alpha.
    let all_transparent = pixels.chunks(4).all(|px| px.get(3).copied().unwrap_or(0) == 0);
    if all_transparent {
        for px in pixels.chunks_mut(4) {
            if let Some(a) = px.get_mut(3) {
                *a = 255;
            }
        }
    }

    let (mut sum, mut count) = (0.0f32, 0u32);
    for px in pixels.chunks(4) {
        let (Some(&b), Some(&g), Some(&r), Some(&a)) = (px.first(), px.get(1), px.get(2), px.get(3))
        else {
            continue;
        };
        if a == 0 {
            continue;
        }
        // Koefisien luminansi Rec. 601 pada kanal BGR milik BMP.
        let luma = 0.114 * b as f32 + 0.587 * g as f32 + 0.299 * r as f32;
        sum += luma * (a as f32 / 255.0);
        count += 1;
    }
    if count == 0 || (sum / count as f32) / 255.0 < MIN_AVG_LUMINANCE {
        return None;
    }

    let pixel_bytes = pixels.len() as u32;
    let file_size = 14 + 40 + pixel_bytes;
    let mut out = Vec::with_capacity(file_size as usize);

    // BITMAPFILEHEADER
    out.extend_from_slice(b"BM");
    out.extend_from_slice(&file_size.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes()); // reserved
    out.extend_from_slice(&0u16.to_le_bytes()); // reserved
    out.extend_from_slice(&(14u32 + 40).to_le_bytes()); // offset piksel

    // BITMAPINFOHEADER
    out.extend_from_slice(&40u32.to_le_bytes());
    out.extend_from_slice(&ICON_SIZE.to_le_bytes());
    out.extend_from_slice(&(-ICON_SIZE).to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes()); // planes
    out.extend_from_slice(&32u16.to_le_bytes()); // bpp
    out.extend_from_slice(&0u32.to_le_bytes()); // no compression
    out.extend_from_slice(&pixel_bytes.to_le_bytes());
    out.extend_from_slice(&0i32.to_le_bytes()); // x ppm
    out.extend_from_slice(&0i32.to_le_bytes()); // y ppm
    out.extend_from_slice(&0u32.to_le_bytes()); // colors used
    out.extend_from_slice(&0u32.to_le_bytes()); // important colors

    out.extend_from_slice(&pixels);

    Some(crate::image_util::data_url("image/bmp", &out))
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    fn has_icon(path: &str) -> bool {
        std::path::Path::new(path).exists()
    }

    #[test]
    fn bmp_header_is_well_formed() {
        // Piksel putih penuh, 2x2, sudah BGRA.
        let pixels = vec![255u8; 2 * 2 * 4];
        let url = build_bmp(pixels).expect("putih harus lolos guard luminansi");
        let b64 = url.strip_prefix("data:image/bmp;base64,").expect("mime harus bmp");

        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD.decode(b64).unwrap();
        assert_eq!(&bytes[0..2], b"BM", "signature BMP");
        // Offset piksel dan ukuran berkas harus konsisten dengan header yang ditulis.
        let offset = u32::from_le_bytes(bytes[10..14].try_into().unwrap());
        let declared = u32::from_le_bytes(bytes[2..6].try_into().unwrap());
        assert_eq!(offset, 54, "offset piksel = 14 + 40");
        assert_eq!(declared as usize, bytes.len(), "ukuran berkas di header");
    }

    #[test]
    fn transparent_bmp_gets_opaque_alpha() {
        // Alpha nol semua (ikon legacy lewat mask) harus dipaksa jadi 255,
        // bukan ditolak, karena ikonnya sendiri terang.
        let mut pixels = Vec::new();
        for _ in 0..4 {
            pixels.extend_from_slice(&[200, 200, 200, 0]); // BGR terang, alpha 0
        }
        let url = build_bmp(pixels).expect("harus lolos setelah alpha dipaksa");
        assert!(url.starts_with("data:image/bmp;base64,"));
    }

    #[test]
    fn very_dark_icon_is_rejected() {
        // Hitam pekat akan hilang di latar notch, jadi harus ditolak
        // supaya frontend memakai glyph lama.
        let pixels = vec![0u8; 4 * 4];
        assert!(build_bmp(pixels).is_none());
    }

    #[test]
    fn missing_path_yields_none() {
        assert!(extract_exe_icon("C:\\tidak\\ada\\palsu.exe").is_none());
        assert!(extract_exe_icon("").is_none());
    }

    #[test]
    fn real_exe_produces_a_bmp_data_url() {
        // Membuktikan seluruh pipeline SHGetFileInfo -> DIB -> BMP -> base64
        // tanpa perlu panggilan telepon apa pun.
        let candidate = std::env::var("SystemRoot")
            .map(|r| format!("{}\\System32\\notepad.exe", r))
            .unwrap_or_else(|_| "C:\\Windows\\System32\\notepad.exe".to_string());

        if !has_icon(&candidate) {
            eprintln!("lewati: {} tidak ada", candidate);
            return;
        }

        let url = extract_exe_icon(&candidate).expect("notepad harus punya ikon");
        assert!(url.starts_with("data:image/bmp;base64,"), "mime harus bmp: {}", &url[..30.min(url.len())]);
    }

    /// Menulis ikon nyata ke berkas supaya bisa disuntikkan ke uji browser,
    /// menjembatani byte hasil kode Rust ke render browser sungguhan.
    #[test]
    fn dump_icon_for_browser_test() {
        let candidates = [
            std::env::var("SystemRoot")
                .map(|r| format!("{}\\System32\\notepad.exe", r))
                .unwrap_or_else(|_| "C:\\Windows\\System32\\notepad.exe".to_string()),
            std::env::var("LOCALAPPDATA")
                .map(|r| format!("{}\\Discord\\app-1.0.9267\\Discord.exe", r))
                .unwrap_or_default(),
            std::env::var("SystemRoot")
                .map(|r| format!("{}\\explorer.exe", r))
                .unwrap_or_else(|_| "C:\\Windows\\explorer.exe".to_string()),
        ];

        let mut dumped = Vec::new();
        for path in candidates.iter().filter(|p| has_icon(p)) {
            if let Some(url) = extract_exe_icon(path) {
                let name = std::path::Path::new(path)
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_lowercase())
                    .unwrap_or_else(|| "icon".to_string());
                let out = format!("target/icon-test-{}.txt", name);
                if std::fs::write(&out, &url).is_ok() {
                    dumped.push(format!("{} ({} KiB)", out, url.len() / 1024));
                }
            }
        }

        assert!(!dumped.is_empty(), "minimal satu exe harus menghasilkan ikon");
        eprintln!("ikon ditulis: {}", dumped.join(", "));
    }
}
