// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Migrasi data sekali jalan. HARUS dipanggil sebelum run(): Tauri membuat window dan profil
    // webview di dalam run() (setup() pun jalan setelahnya), sementara migrasi perlu menyalin
    // profil sebelum direktori baru dibuat dan terkunci.
    bento_lib::migrate::run_once();
    bento_lib::run();
}
