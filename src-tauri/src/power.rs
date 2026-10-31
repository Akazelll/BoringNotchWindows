use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub level: u8,
    pub is_charging: bool,
}

pub fn get_system_battery() -> BatteryInfo {
    #[cfg(windows)]
    unsafe {
        use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
        let mut status = SYSTEM_POWER_STATUS::default();
        if GetSystemPowerStatus(&mut status).is_ok() {
            let level = if status.BatteryLifePercent <= 100 {
                status.BatteryLifePercent
            } else {
                100
            };
            let is_charging = (status.ACLineStatus == 1) || ((status.BatteryFlag & 8) != 0);
            return BatteryInfo {
                level,
                is_charging,
            };
        }
    }

    BatteryInfo {
        level: 85,
        is_charging: false,
    }
}
