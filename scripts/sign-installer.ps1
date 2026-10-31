# Skrip Penandatanganan Mandiri (Authenticode Signature) untuk file installer .exe
# Menggunakan PowerShell Authenticode built-in (tidak wajib install Windows SDK / signtool)

param (
    [string]$TargetFile
)

$ErrorActionPreference = "Stop"

$Subject = "CN=Adam Raga"
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq $Subject } | Select-Object -First 1

if (-not $cert) {
    Write-Warning "Sertifikat '$Subject' tidak ditemukan. Menjalankan setup-code-signing.ps1 terlebih dahulu..."
    & (Join-Path $PSScriptRoot "setup-code-signing.ps1")
    $cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq $Subject } | Select-Object -First 1
}

if (-not $cert) {
    throw "Gagal menemukan atau membuat sertifikat code signing."
}

# Tentukan target file jika tidak dispesifikasikan
if (-not $TargetFile) {
    $bundleDir = Join-Path $PSScriptRoot "..\src-tauri\target\release\bundle\nsis"
    if (Test-Path $bundleDir) {
        $exe = Get-ChildItem -Path $bundleDir -Filter "*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($exe) {
            $TargetFile = $exe.FullName
        }
    }
}

if (-not $TargetFile -or -not (Test-Path $TargetFile)) {
    Write-Host "File installer belum ditemukan. Jalankan 'npm run tauri build' terlebih dahulu." -ForegroundColor Yellow
    Write-Host "Atau gunakan parameter: .\scripts\sign-installer.ps1 -TargetFile 'path\to\installer.exe'"
    exit 0
}

Write-Host "Menandatangani binary: $TargetFile ..." -ForegroundColor Cyan
$result = Set-AuthenticodeSignature -FilePath $TargetFile -Certificate $cert -TimestampServer "http://timestamp.digicert.com" -HashAlgorithm SHA256

if ($result.Status -eq "Valid") {
    Write-Host "[BERHASIL] File ditandatangani dengan aman!" -ForegroundColor Green
    Write-Host "Status: $($result.Status)" -ForegroundColor Green
    Write-Host "Publisher: $($result.SignerCertificate.Subject)" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Penandatanganan selesai dengan status: $($result.Status) - $($result.StatusMessage)" -ForegroundColor Yellow
}
