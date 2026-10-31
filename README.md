# Boring Notch for Windows (Tauri)

Porting macOS [boring.notch](https://github.com/TheBoredTeam/boring.notch) ke Windows menggunakan Tauri v2, Rust, dan React + Tailwind CSS.

## Fitur Utama

- **Floating Notch Overlay:** Nempel di bagian atas-tengah monitor utama Windows, transparan dan frameless.
- **Dynamic Sizing / Anti-blocking:**
  - **Compact Pill (230x38px):** Menampilkan thumbnail cover album, judul lagu, visualizer bar animasi, dan persentase baterai.
  - **Expanded Card (460x168px):** Muncul otomatis saat kursor mouse hover di notch. Menampilkan cover album besar, info lagu & artis, kontrol playback (Prev / Play-Pause / Next), progress bar (scrubber), dan indikator pengisian baterai.
  - Ukuran window Tauri otomatis di-resize sehingga area layar di sekitar pill tidak menghalangi klik ke aplikasi di bawahnya.
- **Integrasi Windows SMTC (System Media Transport Controls):**
  - Menggunakan API Windows `GlobalSystemMediaTransportControlsSessionManager` via crate `windows` (Rust).
  - Mendeteksi musik yang sedang diputar di Windows (Spotify, YouTube di Chrome/Edge, Apple Music, VLC, dll.) beserta thumbnail album dan timeline secara real-time.
- **Integrasi Windows Power API:**
  - Membaca status daya dan baterai laptop via Windows API (`GetSystemPowerStatus`).

## Struktur Projek

```
├── src/                      # Frontend (React + Tailwind CSS)
│   ├── components/
│   │   ├── CompactPill.tsx   # Tampilan compact saat idle
│   │   ├── ExpandedCard.tsx  # Tampilan card ekspansi saat hover
│   │   └── Visualizer.tsx    # Bar visualizer audio animasi
│   ├── hooks/
│   │   ├── useMedia.ts       # Hook kontrol media (Tauri SMTC + mock preview)
│   │   ├── useBattery.ts     # Hook status baterai
│   │   └── useWindowResize.ts# Hook pengatur ukuran window dinamis
│   ├── App.tsx               # Komponen utama Notch
│   ├── types.ts              # Type definitions
│   └── index.css             # Glassmorphism & styling
├── src-tauri/                # Backend (Rust + Tauri v2)
│   ├── src/
│   │   ├── lib.rs            # Setup window, background tasks, invoke handlers
│   │   ├── main.rs           # Entry point
│   │   ├── media.rs          # Handler Windows SMTC (Now Playing & controls)
│   │   └── power.rs          # Handler Windows Power / Battery API
│   ├── Cargo.toml            # Dependensi Rust (tauri v2, windows, tokio)
│   └── tauri.conf.json       # Konfigurasi transparent & frameless window
```

## Menjalankan Aplikasi

### 1. Preview Frontend di Browser
```bash
npm run dev
```
Buka `http://localhost:1420` untuk menguji interaksi animasi, mock media player, dan transisi hover.

### 2. Menjalankan Versi Desktop Windows (Tauri)
Syarat:
- Rust & Cargo (`rustup`)
- Microsoft C++ Build Tools (MSVC)

```bash
npm run tauri dev
```
