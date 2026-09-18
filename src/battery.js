export const BATTERY_STATUS = Object.freeze({
  UNKNOWN: "unknown",
  CHARGING: "charging",
  DISCHARGING: "discharging",
});

export function parseBatteryOutput(output) {
  const match = output
    ?.trim()
    .match(/^(Charging|Discharging)\s+.*?(\d{1,3})\s*%$/u);

  if (!match) return null;

  const level = Number.parseInt(match[2], 10);
  if (level < 0 || level > 100) return null;

  return {
    status:
      match[1] === "Charging"
        ? BATTERY_STATUS.CHARGING
        : BATTERY_STATUS.DISCHARGING,
    level,
  };
}
