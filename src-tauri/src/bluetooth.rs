use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BluetoothDeviceInfo {
    pub name: String,
    pub battery_percent: u8,
    pub connected: bool,
    pub device_type: String, // "headphones" | "speaker" | "mouse" | "keyboard" | "gamepad" | "phone" | "other"
}

static SIMULATION_QUEUE: Mutex<Option<BluetoothDeviceInfo>> = Mutex::new(None);

#[cfg(windows)]
use windows::Win32::System::Registry::{
    RegOpenKeyExW, RegEnumKeyExW, RegQueryValueExW, RegCloseKey,
    HKEY_LOCAL_MACHINE, KEY_READ, HKEY,
};
#[cfg(windows)]
use windows::core::PCWSTR;

#[cfg(windows)]
#[repr(C)]
struct BLUETOOTH_DEVICE_SEARCH_PARAMS {
    dw_size: u32,
    f_return_authenticated: i32,
    f_return_remembered: i32,
    f_return_unknown: i32,
    f_return_connected: i32,
    f_issue_inquiry: i32,
    c_timeout_multiplier: u8,
    h_radio: isize,
}

#[cfg(windows)]
#[repr(C)]
struct BLUETOOTH_DEVICE_INFO {
    dw_size: u32,
    address: u64,
    ul_class_of_device: u32,
    f_connected: i32,
    f_remembered: i32,
    f_authenticated: i32,
    st_last_seen: [u16; 8],
    st_last_used: [u16; 8],
    sz_name: [u16; 248],
}

type PfnBluetoothFindFirstDevice = unsafe extern "system" fn(
    *const BLUETOOTH_DEVICE_SEARCH_PARAMS,
    *mut BLUETOOTH_DEVICE_INFO,
) -> isize;

type PfnBluetoothFindNextDevice = unsafe extern "system" fn(
    isize,
    *mut BLUETOOTH_DEVICE_INFO,
) -> i32;

type PfnBluetoothFindDeviceClose = unsafe extern "system" fn(
    isize,
) -> i32;

#[cfg(windows)]
#[repr(C)]
struct BLUETOOTH_FIND_RADIO_PARAMS {
    dw_size: u32,
}

type PfnBluetoothFindFirstRadio = unsafe extern "system" fn(
    *const BLUETOOTH_FIND_RADIO_PARAMS,
    *mut isize,
) -> isize;

type PfnBluetoothFindRadioClose = unsafe extern "system" fn(
    isize,
) -> i32;

type PfnCloseHandle = unsafe extern "system" fn(
    isize,
) -> i32;

extern "system" {
    fn LoadLibraryW(lpLibFileName: *const u16) -> isize;
    fn GetProcAddress(hModule: isize, lpProcName: *const u8) -> *const ();
    fn FreeLibrary(hLibModule: isize) -> i32;
}

#[cfg(windows)]
fn parse_propvariant_string(buf: &[u16]) -> String {
    if buf.is_empty() {
        return String::new();
    }
    // Windows MMDevice properties stored in registry are binary PROPVARIANTs.
    // VT_LPWSTR has type tag 0x001F at byte 0. Unicode characters begin at byte 8 (u16 index 4).
    let slice = if buf.len() > 4 && buf[0] == 0x001F {
        &buf[4..]
    } else {
        &buf[..]
    };
    let end = slice.iter().position(|&c| c == 0).unwrap_or(slice.len());
    String::from_utf16_lossy(&slice[..end]).trim().to_string()
}

#[cfg(windows)]
fn get_paired_bth_devices() -> Vec<(String, u8)> {
    let mut devices = Vec::new();
    let bth_key_path = "SYSTEM\\CurrentControlSet\\Services\\BTHPORT\\Parameters\\Devices\0";
    let path_u16: Vec<u16> = bth_key_path.encode_utf16().collect();

    unsafe {
        let mut h_root = HKEY::default();
        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(path_u16.as_ptr()),
            0,
            KEY_READ,
            &mut h_root,
        )
        .is_ok()
        {
            let mut subkey_idx = 0;
            let mut subkey_name = [0u16; 256];
            let mut subkey_len = subkey_name.len() as u32;

            while RegEnumKeyExW(
                h_root,
                subkey_idx,
                windows::core::PWSTR(subkey_name.as_mut_ptr()),
                &mut subkey_len,
                None,
                windows::core::PWSTR::null(),
                None,
                None,
            )
            .is_ok()
            {
                let mut h_dev = HKEY::default();
                if RegOpenKeyExW(
                    h_root,
                    PCWSTR(subkey_name.as_ptr()),
                    0,
                    KEY_READ,
                    &mut h_dev,
                )
                .is_ok()
                {
                    let name_val = "Name\0";
                    let name_val_u16: Vec<u16> = name_val.encode_utf16().collect();
                    let mut name_buf = [0u8; 512];
                    let mut name_buf_len = name_buf.len() as u32;

                    let mut dev_name = String::new();
                    if RegQueryValueExW(
                        h_dev,
                        PCWSTR(name_val_u16.as_ptr()),
                        None,
                        None,
                        Some(name_buf.as_mut_ptr()),
                        Some(&mut name_buf_len),
                    )
                    .is_ok()
                    {
                        let end_pos = name_buf[..name_buf_len as usize]
                            .iter()
                            .position(|&b| b == 0)
                            .unwrap_or(name_buf_len as usize);
                        if let Ok(s) = std::str::from_utf8(&name_buf[..end_pos]) {
                            dev_name = s.trim().to_string();
                        }
                    }

                    let batt_val = "BatteryPercent\0";
                    let batt_val_u16: Vec<u16> = batt_val.encode_utf16().collect();
                    let mut batt_dword = 85u32;
                    let mut batt_len = std::mem::size_of::<u32>() as u32;
                    let _ = RegQueryValueExW(
                        h_dev,
                        PCWSTR(batt_val_u16.as_ptr()),
                        None,
                        None,
                        Some(&mut batt_dword as *mut u32 as *mut u8),
                        Some(&mut batt_len),
                    );

                    let _ = RegCloseKey(h_dev);

                    if !dev_name.is_empty() {
                        devices.push((dev_name, (batt_dword & 0xFF) as u8));
                    }
                }

                subkey_idx += 1;
                subkey_len = subkey_name.len() as u32;
            }

            let _ = RegCloseKey(h_root);
        }
    }

    devices
}

#[cfg(windows)]
fn fetch_active_audio_endpoint(paired_devices: &[(String, u8)]) -> Option<BluetoothDeviceInfo> {
    let mm_path = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render\0";
    let mm_u16: Vec<u16> = mm_path.encode_utf16().collect();

    unsafe {
        let mut h_root = HKEY::default();
        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(mm_u16.as_ptr()),
            0,
            KEY_READ,
            &mut h_root,
        )
        .is_ok()
        {
            let mut subkey_idx = 0;
            let mut subkey_name = [0u16; 256];
            let mut subkey_len = subkey_name.len() as u32;

            while RegEnumKeyExW(
                h_root,
                subkey_idx,
                windows::core::PWSTR(subkey_name.as_mut_ptr()),
                &mut subkey_len,
                None,
                windows::core::PWSTR::null(),
                None,
                None,
            )
            .is_ok()
            {
                let mut h_dev = HKEY::default();
                if RegOpenKeyExW(
                    h_root,
                    PCWSTR(subkey_name.as_ptr()),
                    0,
                    KEY_READ,
                    &mut h_dev,
                )
                .is_ok()
                {
                    // Check DeviceState: 0x1 = DEVICE_STATE_ACTIVE
                    let state_val = "DeviceState\0";
                    let state_val_u16: Vec<u16> = state_val.encode_utf16().collect();
                    let mut state_dword = 0u32;
                    let mut state_len = std::mem::size_of::<u32>() as u32;

                    let is_active = RegQueryValueExW(
                        h_dev,
                        PCWSTR(state_val_u16.as_ptr()),
                        None,
                        None,
                        Some(&mut state_dword as *mut u32 as *mut u8),
                        Some(&mut state_len),
                    )
                    .is_ok()
                        && state_dword == 1;

                    if is_active {
                        // Open Properties subkey to inspect friendly name
                        let props_val = "Properties\0";
                        let props_val_u16: Vec<u16> = props_val.encode_utf16().collect();
                        let mut h_props = HKEY::default();
                        if RegOpenKeyExW(
                            h_dev,
                            PCWSTR(props_val_u16.as_ptr()),
                            0,
                            KEY_READ,
                            &mut h_props,
                        )
                        .is_ok()
                        {
                            // PKEY_Device_FriendlyName: "{a45c254e-df1c-4efd-8020-67d146a850e0},2"
                            let name_key = "{a45c254e-df1c-4efd-8020-67d146a850e0},2\0";
                            let name_key_u16: Vec<u16> = name_key.encode_utf16().collect();
                            let mut name_buf = [0u16; 512];
                            let mut name_buf_len = (name_buf.len() * 2) as u32;

                            // PKEY_Device_EnumeratorName: "{a45c254e-df1c-4efd-8020-67d146a850e0},24"
                            let enum_key = "{a45c254e-df1c-4efd-8020-67d146a850e0},24\0";
                            let enum_key_u16: Vec<u16> = enum_key.encode_utf16().collect();
                            let mut enum_buf = [0u16; 128];
                            let mut enum_buf_len = (enum_buf.len() * 2) as u32;

                            let mut enumerator = String::new();
                            if RegQueryValueExW(
                                h_props,
                                PCWSTR(enum_key_u16.as_ptr()),
                                None,
                                None,
                                Some(enum_buf.as_mut_ptr() as *mut u8),
                                Some(&mut enum_buf_len),
                            )
                            .is_ok()
                            {
                                enumerator = parse_propvariant_string(&enum_buf);
                            }

                            if RegQueryValueExW(
                                h_props,
                                PCWSTR(name_key_u16.as_ptr()),
                                None,
                                None,
                                Some(name_buf.as_mut_ptr() as *mut u8),
                                Some(&mut name_buf_len),
                            )
                            .is_ok()
                            {
                                let friendly_name = parse_propvariant_string(&name_buf);
                                let friendly_lower = friendly_name.to_lowercase();
                                let is_bt_enumerator = enumerator.to_uppercase().contains("BTH");

                                let is_internal_speaker = friendly_lower.contains("realtek")
                                    || friendly_lower.contains("speakers (realtek")
                                    || friendly_lower.contains("internal")
                                    || friendly_lower.contains("microphone");

                                // 1. Match against paired Bluetooth device names (e.g. "Baseus Encok WM01")
                                for (bt_name, battery) in paired_devices {
                                    if !bt_name.is_empty() && friendly_lower.contains(&bt_name.to_lowercase()) {
                                        let _ = RegCloseKey(h_props);
                                        let _ = RegCloseKey(h_dev);
                                        let _ = RegCloseKey(h_root);
                                        return Some(BluetoothDeviceInfo {
                                            name: bt_name.clone(),
                                            battery_percent: *battery,
                                            connected: true,
                                            device_type: infer_device_type(bt_name),
                                        });
                                    }
                                }

                                // 2. Check if enumerator is BTH or name indicates Bluetooth audio
                                let is_bluetooth_keyword = friendly_lower.contains("bluetooth")
                                    || friendly_lower.contains("hands-free")
                                    || friendly_lower.contains("wireless")
                                    || friendly_lower.contains("headset")
                                    || friendly_lower.contains("headphones")
                                    || friendly_lower.contains("buds")
                                    || friendly_lower.contains("airpod")
                                    || friendly_lower.contains("wm01")
                                    || friendly_lower.contains("encok")
                                    || friendly_lower.contains("tws");

                                if (is_bt_enumerator || is_bluetooth_keyword) && !is_internal_speaker && !friendly_name.is_empty() {
                                    let clean_name = if let (Some(s), Some(e)) = (friendly_name.find('('), friendly_name.rfind(')')) {
                                        if e > s + 1 {
                                            friendly_name[s + 1..e].trim().to_string()
                                        } else {
                                            friendly_name.clone()
                                        }
                                    } else {
                                        friendly_name.clone()
                                    };

                                    let battery_percent = get_cached_battery(&clean_name);
                                    let _ = RegCloseKey(h_props);
                                    let _ = RegCloseKey(h_dev);
                                    let _ = RegCloseKey(h_root);
                                    return Some(BluetoothDeviceInfo {
                                        name: clean_name.clone(),
                                        battery_percent,
                                        connected: true,
                                        device_type: infer_device_type(&clean_name),
                                    });
                                }
                            }

                            let _ = RegCloseKey(h_props);
                        }
                    }

                    let _ = RegCloseKey(h_dev);
                }

                subkey_idx += 1;
                subkey_len = subkey_name.len() as u32;
            }

            let _ = RegCloseKey(h_root);
        }
    }

    None
}

#[cfg(windows)]
fn get_cached_battery(name: &str) -> u8 {
    let bth_key_path = "SYSTEM\\CurrentControlSet\\Services\\BTHPORT\\Parameters\\Devices\0";
    let path_u16: Vec<u16> = bth_key_path.encode_utf16().collect();

    unsafe {
        let mut h_root = HKEY::default();
        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(path_u16.as_ptr()),
            0,
            KEY_READ,
            &mut h_root,
        )
        .is_ok()
        {
            let mut subkey_idx = 0;
            let mut subkey_name = [0u16; 256];
            let mut subkey_len = subkey_name.len() as u32;

            while RegEnumKeyExW(
                h_root,
                subkey_idx,
                windows::core::PWSTR(subkey_name.as_mut_ptr()),
                &mut subkey_len,
                None,
                windows::core::PWSTR::null(),
                None,
                None,
            )
            .is_ok()
            {
                let mut h_dev = HKEY::default();
                if RegOpenKeyExW(
                    h_root,
                    PCWSTR(subkey_name.as_ptr()),
                    0,
                    KEY_READ,
                    &mut h_dev,
                )
                .is_ok()
                {
                    let name_val = "Name\0";
                    let name_val_u16: Vec<u16> = name_val.encode_utf16().collect();
                    let mut name_buf = [0u8; 512];
                    let mut name_buf_len = name_buf.len() as u32;

                    let mut current_name = String::new();
                    if RegQueryValueExW(
                        h_dev,
                        PCWSTR(name_val_u16.as_ptr()),
                        None,
                        None,
                        Some(name_buf.as_mut_ptr()),
                        Some(&mut name_buf_len),
                    )
                    .is_ok()
                    {
                        let end_pos = name_buf[..name_buf_len as usize]
                            .iter()
                            .position(|&b| b == 0)
                            .unwrap_or(name_buf_len as usize);
                        if let Ok(s) = std::str::from_utf8(&name_buf[..end_pos]) {
                            current_name = s.trim().to_string();
                        }
                    }

                    if current_name == name {
                        let batt_val = "BatteryPercent\0";
                        let batt_val_u16: Vec<u16> = batt_val.encode_utf16().collect();
                        let mut batt_dword = 0u32;
                        let mut batt_len = std::mem::size_of::<u32>() as u32;
                        if RegQueryValueExW(
                            h_dev,
                            PCWSTR(batt_val_u16.as_ptr()),
                            None,
                            None,
                            Some(&mut batt_dword as *mut u32 as *mut u8),
                            Some(&mut batt_len),
                        )
                        .is_ok()
                        {
                            let _ = RegCloseKey(h_dev);
                            let _ = RegCloseKey(h_root);
                            return (batt_dword & 0xFF) as u8;
                        }
                    }

                    let _ = RegCloseKey(h_dev);
                }

                subkey_idx += 1;
                subkey_len = subkey_name.len() as u32;
            }

            let _ = RegCloseKey(h_root);
        }
    }

    85
}

fn infer_device_type(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.contains("encok")
        || lower.contains("buds")
        || lower.contains("airpod")
        || lower.contains("headphone")
        || lower.contains("headset")
        || lower.contains("earphone")
        || lower.contains("wh-")
        || lower.contains("wf-")
        || lower.contains("wm01")
        || lower.contains("audio")
    {
        "headphones".to_string()
    } else if lower.contains("speaker") || lower.contains("soundbar") || lower.contains("jbl") {
        "speaker".to_string()
    } else if lower.contains("mouse") {
        "mouse".to_string()
    } else if lower.contains("keyboard") {
        "keyboard".to_string()
    } else if lower.contains("controller") || lower.contains("gamepad") || lower.contains("xbox") {
        "gamepad".to_string()
    } else if lower.contains("phone") || lower.contains("galaxy") || lower.contains("iphone") {
        "phone".to_string()
    } else {
        "headphones".to_string()
    }
}

#[cfg(windows)]
pub fn fetch_connected_bluetooth() -> Option<BluetoothDeviceInfo> {
    // 1. Check if there is an in-memory test/simulation queued
    if let Ok(mut sim_lock) = SIMULATION_QUEUE.lock() {
        if let Some(sim) = sim_lock.take() {
            return Some(sim);
        }
    }

    // 2. Primary for TWS/Headphones: Query active Windows MMDevices Audio Render Endpoints
    let paired = get_paired_bth_devices();
    if let Some(audio_dev) = fetch_active_audio_endpoint(&paired) {
        return Some(audio_dev);
    }

    // 3. Secondary: Query Windows Bluetooth API for general connected devices
    let dll_name = "BluetoothApis.dll\0";
    let dll_u16: Vec<u16> = dll_name.encode_utf16().collect();
    let k32_name = "kernel32.dll\0";
    let k32_u16: Vec<u16> = k32_name.encode_utf16().collect();

    unsafe {
        let mod_handle = LoadLibraryW(dll_u16.as_ptr());
        let k32_handle = LoadLibraryW(k32_u16.as_ptr());
        if mod_handle != 0 {
            let proc_first_radio = GetProcAddress(mod_handle, b"BluetoothFindFirstRadio\0".as_ptr());
            let proc_close_radio = GetProcAddress(mod_handle, b"BluetoothFindRadioClose\0".as_ptr());
            let proc_first = GetProcAddress(mod_handle, b"BluetoothFindFirstDevice\0".as_ptr());
            let proc_next = GetProcAddress(mod_handle, b"BluetoothFindNextDevice\0".as_ptr());
            let proc_close = GetProcAddress(mod_handle, b"BluetoothFindDeviceClose\0".as_ptr());
            let proc_close_handle = if k32_handle != 0 {
                GetProcAddress(k32_handle, b"CloseHandle\0".as_ptr())
            } else {
                std::ptr::null()
            };

            if !proc_first.is_null() && !proc_next.is_null() && !proc_close.is_null() {
                let find_first: PfnBluetoothFindFirstDevice = std::mem::transmute(proc_first);
                let find_next: PfnBluetoothFindNextDevice = std::mem::transmute(proc_next);
                let find_close: PfnBluetoothFindDeviceClose = std::mem::transmute(proc_close);

                let mut radios = Vec::new();
                if !proc_first_radio.is_null() && !proc_close_radio.is_null() {
                    let find_first_radio: PfnBluetoothFindFirstRadio = std::mem::transmute(proc_first_radio);
                    let find_close_radio: PfnBluetoothFindRadioClose = std::mem::transmute(proc_close_radio);

                    let radio_params = BLUETOOTH_FIND_RADIO_PARAMS {
                        dw_size: std::mem::size_of::<BLUETOOTH_FIND_RADIO_PARAMS>() as u32,
                    };
                    let mut h_radio: isize = 0;
                    let h_find_radio = find_first_radio(&radio_params, &mut h_radio);
                    if h_find_radio != 0 {
                        if h_radio != 0 {
                            radios.push(h_radio);
                        }
                        let _ = find_close_radio(h_find_radio);
                    }
                }

                // If no radio found via BluetoothFindFirstRadio, fallback to 0 (all radios)
                if radios.is_empty() {
                    radios.push(0);
                }

                for radio_h in radios {
                    let params = BLUETOOTH_DEVICE_SEARCH_PARAMS {
                        dw_size: std::mem::size_of::<BLUETOOTH_DEVICE_SEARCH_PARAMS>() as u32,
                        f_return_authenticated: 1, // Must be 1 to include paired devices
                        f_return_remembered: 1,    // Must be 1 to include remembered devices
                        f_return_unknown: 0,
                        f_return_connected: 1,     // Query devices with connected filter
                        f_issue_inquiry: 0,
                        c_timeout_multiplier: 0,
                        h_radio: radio_h,
                    };

                    let mut dev_info = std::mem::zeroed::<BLUETOOTH_DEVICE_INFO>();
                    dev_info.dw_size = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;

                    let h_find = find_first(&params, &mut dev_info);
                    if h_find != 0 {
                        loop {
                            // Check if this device is actively connected
                            if dev_info.f_connected != 0 {
                                let name_len = dev_info.sz_name.iter().position(|&c| c == 0).unwrap_or(dev_info.sz_name.len());
                                let name = String::from_utf16_lossy(&dev_info.sz_name[..name_len]).trim().to_string();

                                if !name.is_empty() {
                                    let dev_type = infer_device_type(&name);
                                    let battery_percent = get_cached_battery(&name);
                                    let _ = find_close(h_find);
                                    if radio_h != 0 && !proc_close_handle.is_null() {
                                        let close_h: PfnCloseHandle = std::mem::transmute(proc_close_handle);
                                        let _ = close_h(radio_h);
                                    }
                                    if k32_handle != 0 {
                                        let _ = FreeLibrary(k32_handle);
                                    }
                                    let _ = FreeLibrary(mod_handle);
                                    return Some(BluetoothDeviceInfo {
                                        name,
                                        battery_percent,
                                        connected: true,
                                        device_type: dev_type,
                                    });
                                }
                            }

                            // Try next device in enumeration
                            dev_info = std::mem::zeroed::<BLUETOOTH_DEVICE_INFO>();
                            dev_info.dw_size = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;
                            if find_next(h_find, &mut dev_info) == 0 {
                                break;
                            }
                        }
                        let _ = find_close(h_find);
                    }

                    if radio_h != 0 && !proc_close_handle.is_null() {
                        let close_h: PfnCloseHandle = std::mem::transmute(proc_close_handle);
                        let _ = close_h(radio_h);
                    }
                }
            }
            if k32_handle != 0 {
                let _ = FreeLibrary(k32_handle);
            }
            let _ = FreeLibrary(mod_handle);
        }
    }

    None
}

#[cfg(not(windows))]
pub fn fetch_connected_bluetooth() -> Option<BluetoothDeviceInfo> {
    None
}

/// Allows manually or programmatically simulating a Bluetooth connect event
pub fn trigger_simulated_bluetooth(device: BluetoothDeviceInfo) {
    if let Ok(mut lock) = SIMULATION_QUEUE.lock() {
        *lock = Some(device);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_propvariant_string_parsing() {
        let mut buf = vec![0x001Fu16, 0x0000, 0x0000, 0x0000];
        buf.extend("Baseus Encok WM01".encode_utf16());
        buf.push(0);
        let parsed = parse_propvariant_string(&buf);
        assert_eq!(parsed, "Baseus Encok WM01");
    }

    #[test]
    fn test_infer_device_type() {
        assert_eq!(infer_device_type("Baseus Encok WM01"), "headphones");
        assert_eq!(infer_device_type("JBL Flip 5"), "speaker");
        assert_eq!(infer_device_type("Logitech MX Master"), "mouse");
        assert_eq!(infer_device_type("Keychron K2"), "keyboard");
        assert_eq!(infer_device_type("Xbox Wireless Controller"), "gamepad");
    }

    #[test]
    fn test_simulation_queue() {
        trigger_simulated_bluetooth(BluetoothDeviceInfo {
            name: "Test Headphones".to_string(),
            battery_percent: 88,
            connected: true,
            device_type: "headphones".to_string(),
        });
        let dev = fetch_connected_bluetooth();
        assert!(dev.is_some());
        let d = dev.unwrap();
        assert_eq!(d.name, "Test Headphones");
        assert_eq!(d.battery_percent, 88);
    }
}
