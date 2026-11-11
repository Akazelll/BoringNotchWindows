//! Konversi gambar dari WinRT ke data URL untuk dikirim ke frontend lewat JSON.
//!
//! Dipakai bersama oleh album art (media), logo notifikasi, dan ikon aplikasi
//! pada panggilan. Ketiganya membaca `RandomAccessStreamReference` yang sama.

#[cfg(windows)]
pub fn data_url(mime: &str, bytes: &[u8]) -> String {
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    format!("data:{};base64,{}", mime, encoded)
}

/// Batas atas ukuran gambar. Album art dan logo aplikasi jauh di bawah ini;
/// nilai ini hanya untuk menolak stream aneh yang bisa menghabiskan memori.
#[cfg(windows)]
const MAX_IMAGE_BYTES: u64 = 4_000_000;

/// Stream gambar yang sudah dibuka -> data URL.
///
/// Menerima stream, bukan `RandomAccessStreamReference`, karena ada dua bentuk
/// referensi di crate `windows` (kelas dan interface) yang keduanya punya
/// `OpenReadAsync`; pemanggil membukanya sendiri lalu menyerahkan hasilnya.
///
/// Mime dibaca dari stream, TIDAK dihardcode: ikon aplikasi umumnya PNG sedangkan
/// album art JPEG, dan memberi label jpeg pada byte PNG bisa ditolak browser.
/// `None` bila stream kosong, terlalu besar, atau gagal dibaca. Byte kosong harus
/// ditolak, karena data URL kosong menghasilkan `<img>` rusak yang tidak memicu `onError`.
#[cfg(windows)]
pub fn stream_to_data_url(
    stream: &windows::Storage::Streams::IRandomAccessStreamWithContentType,
) -> Option<String> {
    use windows::Storage::Streams::DataReader;

    let size = stream.Size().unwrap_or(0);
    if size == 0 || size > MAX_IMAGE_BYTES {
        return None;
    }

    let mime = stream
        .ContentType()
        .map(|m| m.to_string())
        .ok()
        .filter(|m| m.starts_with("image/"))
        .unwrap_or_else(|| "image/jpeg".to_string());

    let reader = DataReader::CreateDataReader(stream).ok()?;
    reader.LoadAsync(size as u32).ok()?.get().ok()?;

    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;

    if bytes.is_empty() {
        return None;
    }

    Some(data_url(&mime, &bytes))
}

/// Referensi gambar apa pun -> data URL, dengan batas waktu.
///
/// Wajib dipakai dari loop poll: membuka dan membaca stream bisa menggantung, dan
/// tanpa batas waktu satu stream menggantung membekukan seluruh loop 600ms.
///
/// Yang dipindah ke thread adalah referensinya, bukan stream yang sudah terbuka:
/// `RandomAccessStreamReference` memenuhi `Send`, sedangkan stream yang sudah
/// terbuka tidak. Jadi pembukaan stream juga terjadi di dalam thread.
#[cfg(windows)]
pub fn reference_to_data_url_with_timeout(
    reference: &windows::Storage::Streams::RandomAccessStreamReference,
    timeout: std::time::Duration,
) -> Option<String> {
    let reference = reference.clone();
    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let opened = reference.OpenReadAsync().ok().and_then(|op| op.get().ok());
        let _ = tx.send(opened.and_then(|s| stream_to_data_url(&s)));
    });

    rx.recv_timeout(timeout).unwrap_or(None)
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn data_url_prefixes_the_real_mime() {
        assert_eq!(data_url("image/png", b"x"), "data:image/png;base64,eA==");
        assert_eq!(data_url("image/bmp", b""), "data:image/bmp;base64,");
    }
}
