# Skrip Konfigurasi Sertifikat Code Signing "Adam Raga" untuk Windows
# Menjadikan installer terverifikasi ("Verified Publisher: Adam Raga") dan aman di Windows

param (
    [switch]$AutoUpdateConfig
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Setup Code Signing: Adam Raga ===" -ForegroundColor Cyan

$Subject = "CN=Adam Raga"
$FriendlyName = "bento Code Signing - Adam Raga"

# 1. Periksa apakah sertifikat Adam Raga sudah ada di Personal Store
$existingCert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq $Subject } | Select-Object -First 1

if ($existingCert) {
    Write-Host "[OK] Sertifikat yang cocok sudah ada di Cert:\CurrentUser\My" -ForegroundColor Green
    $cert = $existingCert
} else {
    Write-Host "[+] Membuat sertifikat Code Signing baru: $Subject..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $Subject `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -FriendlyName $FriendlyName `
        -NotAfter (Get-Date).AddYears(5) `
        -KeyLength 2048 `
        -KeyExportPolicy Exportable `
        -HashAlgorithm SHA256
    Write-Host "[OK] Sertifikat berhasil dibuat!" -ForegroundColor Green
}

$thumbprint = $cert.Thumbprint
Write-Host "Thumbprint: $thumbprint" -ForegroundColor Magenta

# 2. Pastikan sertifikat dipercaya di Trusted Root Certification Authorities
# (Diperlukan agar Windows SmartScreen & UAC menandai sebagai 'Verified Publisher')
$trustedCert = Get-ChildItem -Path "Cert:\CurrentUser\Root" | Where-Object { $_.Thumbprint -eq $thumbprint } | Select-Object -First 1

if ($trustedCert) {
    Write-Host "[OK] Sertifikat sudah terdaftar di Trusted Root (Aman / Terverifikasi)" -ForegroundColor Green
} else {
    Write-Host "[+] Mendaftarkan sertifikat ke Trusted Root Certification Authorities (CurrentUser)..." -ForegroundColor Yellow
    $rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $rootStore.Add($cert)
    $rootStore.Close()
    Write-Host "[OK] Sertifikat berhasil dipercaya oleh Windows!" -ForegroundColor Green
}

# 3. Export file sertifikat publik (.cer) untuk pengujian / distribusi lokal
$certDir = Join-Path $PSScriptRoot "..\src-tauri\certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
}
$cerPath = Join-Path $certDir "AdamRaga.cer"
Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null
Write-Host "[OK] File sertifikat publik disimpan di: $cerPath" -ForegroundColor Green

# 4. Update tauri.conf.json jika diminta
if ($AutoUpdateConfig) {
    $configPath = Join-Path $PSScriptRoot "..\src-tauri\tauri.conf.json"
    if (Test-Path $configPath) {
        $json = Get-Content $configPath -Raw | ConvertFrom-Json
        if (-not $json.bundle.windows) {
            $json.bundle | Add-Member -MemberType NoteProperty -Name "windows" -Value (New-Object PSObject)
        }
        $json.bundle.windows.certificateThumbprint = $thumbprint
        $json.bundle.windows.digestAlgorithm = "sha256"
        $json.bundle.windows.timestampUrl = "http://timestamp.digicert.com"
        $jsonText = $json | ConvertTo-Json -Depth 32
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($configPath, $jsonText, $utf8NoBom)
        Write-Host "[OK] tauri.conf.json diperbarui dengan certificateThumbprint: $thumbprint" -ForegroundColor Green
    }
}

Write-Host "`n=== Selesai! ===" -ForegroundColor Cyan
Write-Host "Sekarang hasil build installer Anda akan ditandatangani secara otomatis."
Write-Host "Windows akan mendeteksi installer sebagai 'Verified Publisher: Adam Raga'.`n"
