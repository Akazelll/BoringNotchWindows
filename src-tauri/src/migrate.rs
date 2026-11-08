// Migrasi data sekali jalan dari brand lama ke "bento".
//
// Rename `productName` + `identifier` memindahkan tiga hal:
//   1. %APPDATA%\<identifier>\<db>                     — SQLite lirik + to-do
//   2. %LOCALAPPDATA%\<identifier>\EBWebView           — profil Chromium, memuat SELURUH localStorage
//   3. HKCU\...\Run → APP_REG_NAME                     — preferensi autostart
//
// Direktori instalasi lama (`%LOCALAPPDATA%\Boring Notch`, dari productName) sengaja TIDAK
// disalin: isinya hanya exe + uninstaller, tidak ada data pengguna.
//
// (1) dan (2) tidak bisa dimigrasi dari JavaScript: key localStorage tidak berpindah karena
// origin webview tetap `http://tauri.localhost`, hanya direktori profilnya yang berubah — jadi
// nilainya benar-benar ada di database leveldb milik profil, bukan di namespace origin.
//
// Dipanggil dari main() SEBELUM run(), dan itu wajib: Tauri membuat window (dan profil webview
// baru, sekaligus mengunci direktorinya) di dalam run() — setup() pun berjalan setelah window
// dibuat. `main()` adalah satu-satunya titik yang mendahului keduanya.
//
// Sifatnya best-effort: gagal = aplikasi tetap jalan dengan data kosong, tidak pernah panic.

use std::path::{Path, PathBuf};

const OLD_ID: &str = "com.boringnotch.windows";
const NEW_ID: &str = "com.bento.windows";
const OLD_DB: &str = "boring-notch.db";
const NEW_DB: &str = "bento.db";

/// `%APPDATA%` — dipakai plugin SQL lewat `app_config_dir()`.
fn roaming_dir() -> Option<PathBuf> {
    std::env::var_os("APPDATA").map(PathBuf::from)
}

/// `%LOCALAPPDATA%` — dipakai webview lewat `app_local_data_dir()`.
fn local_dir() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
}

/// Titik masuk. Menelan semua error dengan sengaja.
pub fn run_once() {
    if let Err(err) = try_migrate() {
        // Hanya terlihat di build debug (release memakai windows_subsystem = "windows").
        eprintln!("[bento] migrasi dilewati: {err}");
    }
}

fn try_migrate() -> Result<(), String> {
    let local = local_dir().ok_or("LOCALAPPDATA tidak tersedia")?;
    // APPDATA hanya dipakai untuk DB; kalau tidak ada, profil tetap dimigrasi.
    let roaming = roaming_dir();

    let result = migrate_dirs(&local, roaming.as_deref());

    // Preferensi autostart. Kalau penulisan nilai baru ditolak (mis. sedang jalan sebagai build
    // dev), `migrate_autostart` sengaja TIDAK menghapus nilai lama — dicatat, bukan digagalkan.
    if let Err(err) = crate::autostart::migrate_autostart() {
        eprintln!("[bento] migrasi autostart dilewati: {err}");
    }

    result
}

/// Inti migrasi, terpisah dari pembacaan env var supaya bisa diuji terhadap direktori sementara.
fn migrate_dirs(local: &Path, roaming: Option<&Path>) -> Result<(), String> {
    let new_profile_root = local.join(NEW_ID);
    let old_profile = local.join(OLD_ID).join("EBWebView");

    // Dua penjaga terpisah, keduanya berbasis keadaan TUJUAN yang spesifik. Sengaja bukan
    // "direktori baru sudah ada": direktori itu dibuat kosong oleh Tauri pada launch pertama,
    // jauh sebelum salinan profil sempat dibuat.
    let profile_done = new_profile_root
        .join("EBWebView")
        .join("Default")
        .join("Local Storage")
        .join("leveldb")
        .exists();

    if !profile_done && old_profile.exists() {
        let dest_parent = new_profile_root.join("EBWebView");
        std::fs::create_dir_all(&dest_parent).map_err(|e| format!("buat direktori profil: {e}"))?;
        copy_dir(&old_profile, &dest_parent).map_err(|e| format!("salin profil webview: {e}"))?;
    }

    if let Some(roaming) = roaming {
        let new_db_dir = roaming.join(NEW_ID);
        let new_db = new_db_dir.join(NEW_DB);
        // Dibuat lebih dulu: direktori ini juga dibuat oleh Tauri, tapi di sini supaya lokasi
        // tujuannya pasti ada sebelum penyalinan.
        std::fs::create_dir_all(&new_db_dir).map_err(|e| format!("buat direktori data: {e}"))?;

        if !new_db.exists() {
            let old_db_dir = roaming.join(OLD_ID);
            if old_db_dir.join(OLD_DB).exists() {
                // .db dulu, baru sidecar. Kalau hanya .db disalin sementara -wal belum
                // checkpoint, transaksi terakhir hilang tanpa gejala: file terbuka normal.
                // Sufiks ditulis eksplisit (bukan `with_extension`) supaya nama akhirnya
                // terbaca langsung di sini — jalur ini menyangkut data pengguna.
                for suffix in ["", "-wal", "-shm", "-journal"] {
                    copy_if_exists(
                        &old_db_dir.join(format!("{OLD_DB}{suffix}")),
                        &new_db_dir.join(format!("{NEW_DB}{suffix}")),
                    )?;
                }
            }
        }
    }

    Ok(())
}

fn copy_if_exists(from: &Path, to: &Path) -> Result<(), String> {
    if !from.exists() {
        return Ok(());
    }
    std::fs::copy(from, to).map_err(|e| format!("salin {}: {e}", from.display()))?;
    Ok(())
}

/// Salin rekursif. Menyalin seluruh pohon profil (~150 MB) sengaja dipilih daripada hanya
/// leveldb: ia membawa Local State, Preferences, dan Cookies sekaligus, sehingga tidak ada
/// profil Chromium yang ter-materialisasi separuh.
fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let source = entry.path();
        let dest = to.join(entry.file_name());
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            copy_dir(&source, &dest)?;
        } else if file_type.is_file() {
            // Kegagalan satu file tidak boleh membatalkan seluruh profil: cache yang terkunci
            // atau rusak lebih baik dilewati daripada menggagalkan migrasi data pengguna.
            if let Err(e) = std::fs::copy(&source, &dest) {
                eprintln!("[bento] lewati {}: {e}", source.display());
            }
        }
        // Symlink di profil webview tidak pernah jadi data pengguna — dilewati.
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Direktori unik per pemanggilan, dihapus saat drop.
    struct TempRoot(PathBuf);

    impl TempRoot {
        fn new(tag: &str) -> Self {
            let unique = format!(
                "bento-migrate-{tag}-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_nanos())
                    .unwrap_or(0)
            );
            let path = std::env::temp_dir().join(unique);
            std::fs::create_dir_all(&path).expect("buat temp root");
            TempRoot(path)
        }

        fn join(&self, rel: &str) -> PathBuf {
            self.0.join(rel)
        }
    }

    impl Drop for TempRoot {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn write(path: &Path, contents: &str) {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("buat parent");
        }
        std::fs::write(path, contents).expect("tulis berkas");
    }

    fn read(path: &Path) -> String {
        std::fs::read_to_string(path).expect("baca berkas")
    }

    /// Menyiapkan sumber seperti kondisi nyata: profil webview dengan leveldb, dan DB dengan ketiga
    /// sidecar. Mengembalikan (local, roaming).
    fn seed(root: &TempRoot) -> (PathBuf, PathBuf) {
        let local = root.join("local");
        let roaming = root.join("roaming");

        write(&local.join(format!("{OLD_ID}/EBWebView/Default/Local Storage/leveldb/000005.ldb")), "kunci");
        write(&local.join(format!("{OLD_ID}/EBWebView/Default/Local Storage/leveldb/MANIFEST-000001")), "manifest");
        write(&local.join(format!("{OLD_ID}/EBWebView/Local State")), "state");
        // Cache yang besar dan tidak penting: tetap ikut, tapi tidak diuji isinya.
        write(&local.join(format!("{OLD_ID}/EBWebView/GrShaderCache/blob")), "cache");

        let db_dir = roaming.join(OLD_ID);
        write(&db_dir.join(OLD_DB), "DATA-UTAMA");
        write(&db_dir.join(format!("{OLD_DB}-wal")), "WAL");
        write(&db_dir.join(format!("{OLD_DB}-shm")), "SHM");

        (local, roaming)
    }

    #[test]
    fn menyalin_profil_dan_db_beserta_sidecar() {
        let root = TempRoot::new("copy");
        let (local, roaming) = seed(&root);

        migrate_dirs(&local, Some(&roaming)).expect("migrasi berhasil");

        // Profil: leveldb dinegosiasi ada di tujuan, plus Local State.
        let new_profile = local.join(format!("{NEW_ID}/EBWebView"));
        assert!(new_profile.join("Default/Local Storage/leveldb/000005.ldb").exists(), "leveldb tidak tersalin");
        assert!(new_profile.join("Default/Local Storage/leveldb/MANIFEST-000001").exists());
        assert!(new_profile.join("Local State").exists());

        // DB dan ketiga sidecar harus ada dengan nama baru.
        let new_db_dir = roaming.join(NEW_ID);
        assert_eq!(read(&new_db_dir.join(NEW_DB)), "DATA-UTAMA");
        assert_eq!(read(&new_db_dir.join(format!("{NEW_DB}-wal"))), "WAL", "-wal wajib ikut");
        assert_eq!(read(&new_db_dir.join(format!("{NEW_DB}-shm"))), "SHM", "-shm wajib ikut");

        // Salin, bukan pindah: sumber harus utuh supaya hasil bisa diulang.
        assert!(roaming.join(OLD_ID).join(OLD_DB).exists(), "sumber terhapus");
        assert!(local.join(format!("{OLD_ID}/EBWebView/Local State")).exists());
    }

    #[test]
    fn idempoten_tidak_menimpa_data_baru() {
        let root = TempRoot::new("idem");
        let (local, roaming) = seed(&root);

        migrate_dirs(&local, Some(&roaming)).expect("migrasi pertama");
        let new_db = roaming.join(NEW_ID).join(NEW_DB);

        // Aplikasi baru menulis sesuatu ke DB barunya...
        std::fs::write(&new_db, "DITULIS-APLIKASI-BARU").expect("tulis ulang");

        // ...lalu migrasi jalan lagi pada launch berikutnya: isinya tidak boleh tertimpa.
        migrate_dirs(&local, Some(&roaming)).expect("migrasi kedua");
        assert_eq!(read(&new_db), "DITULIS-APLIKASI-BARU", "migrasi mengulang secara destruktif");
    }

    #[test]
    fn sumber_tidak_ada_bukan_kesalahan() {
        let root = TempRoot::new("kosong");
        let local = root.join("local");
        let roaming = root.join("roaming");
        std::fs::create_dir_all(&local).expect("buat local");

        // Mesin baru: tidak ada data lama sama sekali. Harus sukses tanpa panic.
        migrate_dirs(&local, Some(&roaming)).expect("migrasi pada mesin bersih");
    }

    #[test]
    fn tanpa_roaming_profil_tetap_dimigrasi() {
        let root = TempRoot::new("noroa");
        let (local, _roaming) = seed(&root);

        // APPDATA tidak tersedia: DB dilewati, tapi profil (localStorage) tetap harus tersalin.
        migrate_dirs(&local, None).expect("migrasi tanpa APPDATA");
        assert!(local
            .join(format!("{NEW_ID}/EBWebView/Default/Local Storage/leveldb/000005.ldb"))
            .exists());
    }

    #[test]
    fn direktori_baru_yang_sudah_ada_tidak_menghalangi_salinan_profil() {
        // Kasus nyata: Tauri sudah membuat %LOCALAPPDATA%\com.bento.windows kosong pada launch
        // pertama, sebelum kode migrasi ini ada. Penjaga harus berbasis leveldb, bukan keberadaan
        // direktori tujuan.
        let root = TempRoot::new("prekursor");
        let (local, roaming) = seed(&root);
        std::fs::create_dir_all(local.join(format!("{NEW_ID}/EBWebView"))).expect("direktori baru kosong");

        migrate_dirs(&local, Some(&roaming)).expect("migrasi");
        assert!(local
            .join(format!("{NEW_ID}/EBWebView/Default/Local Storage/leveldb/000005.ldb"))
            .exists());
    }
}

