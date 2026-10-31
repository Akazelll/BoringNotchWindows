#[cfg(windows)]
use windows::Win32::System::Registry::{
    RegOpenKeyExW, RegSetValueExW, RegDeleteValueW, RegQueryValueExW, RegCloseKey,
    HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_SZ, HKEY,
};
#[cfg(windows)]
use windows::core::PCWSTR;

const RUN_KEY_PATH: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run\0";
const APP_REG_NAME: &str = "BoringNotch\0";

#[cfg(windows)]
pub fn is_autostart_enabled() -> bool {
    unsafe {
        let path_u16: Vec<u16> = RUN_KEY_PATH.encode_utf16().collect();
        let name_u16: Vec<u16> = APP_REG_NAME.encode_utf16().collect();

        let mut hkey = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(path_u16.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        )
        .is_ok()
        {
            let res = RegQueryValueExW(
                hkey,
                PCWSTR(name_u16.as_ptr()),
                None,
                None,
                None,
                None,
            );
            let _ = RegCloseKey(hkey);
            return res.is_ok();
        }
    }
    false
}

#[cfg(windows)]
pub fn enable_autostart() -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_path_str = format!("\"{}\"", current_exe.to_string_lossy());
    let mut val_bytes: Vec<u8> = Vec::new();
    for c in exe_path_str.encode_utf16() {
        val_bytes.extend_from_slice(&c.to_le_bytes());
    }
    val_bytes.extend_from_slice(&[0, 0]); // null terminator

    unsafe {
        let path_u16: Vec<u16> = RUN_KEY_PATH.encode_utf16().collect();
        let name_u16: Vec<u16> = APP_REG_NAME.encode_utf16().collect();

        let mut hkey = HKEY::default();
        let open_res = RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(path_u16.as_ptr()),
            0,
            KEY_WRITE,
            &mut hkey,
        );
        if !open_res.is_ok() {
            return Err(format!("Failed to open registry key: {:?}", open_res));
        }

        let set_res = RegSetValueExW(
            hkey,
            PCWSTR(name_u16.as_ptr()),
            0,
            REG_SZ,
            Some(&val_bytes),
        );
        let _ = RegCloseKey(hkey);

        if !set_res.is_ok() {
            return Err(format!("Failed to set registry value: {:?}", set_res));
        }
    }

    Ok(())
}

#[cfg(windows)]
pub fn disable_autostart() -> Result<(), String> {
    unsafe {
        let path_u16: Vec<u16> = RUN_KEY_PATH.encode_utf16().collect();
        let name_u16: Vec<u16> = APP_REG_NAME.encode_utf16().collect();

        let mut hkey = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(path_u16.as_ptr()),
            0,
            KEY_WRITE,
            &mut hkey,
        )
        .is_ok()
        {
            let _ = RegDeleteValueW(hkey, PCWSTR(name_u16.as_ptr()));
            let _ = RegCloseKey(hkey);
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn is_autostart_enabled() -> bool {
    false
}

#[cfg(not(windows))]
pub fn enable_autostart() -> Result<(), String> {
    Ok(())
}

#[cfg(not(windows))]
pub fn disable_autostart() -> Result<(), String> {
    Ok(())
}
