import { INITIAL_CHARGING_BANNER_STATE, transitionChargingBanner } from "./chargingBannerState.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const off = { level: 80, isCharging: false };
const on = { level: 80, isCharging: true };

const waiting = transitionChargingBanner(INITIAL_CHARGING_BANNER_STATE, on, false);
assert(!waiting.initialized, "placeholder must not initialize startup state");

const startupOn = transitionChargingBanner(INITIAL_CHARGING_BANNER_STATE, on, true);
assert(startupOn.mode === "connected", "startup while charging shows connected");
assert(startupOn.wasCharging === true, "startup records charging baseline");

const startupOff = transitionChargingBanner(INITIAL_CHARGING_BANNER_STATE, off, true);
assert(startupOff.mode === null, "startup not charging shows no banner");

const connected = transitionChargingBanner(startupOff, on, true);
assert(connected.mode === "connected", "later charge transition shows connected");
const disconnected = transitionChargingBanner(startupOn, off, true);
assert(disconnected.mode === "disconnected", "later disconnect shows disconnected");

console.log("chargingBannerState: ok");