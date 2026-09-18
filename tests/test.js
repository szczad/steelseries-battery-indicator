import Gio from "gi://Gio";
import GLib from "gi://GLib";

import { BATTERY_STATUS, parseBatteryOutput } from "../src/battery.js";
import { runCommand } from "../src/utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertState(output, status, level) {
  const state = parseBatteryOutput(output);
  assert(state?.status === status, `Unexpected status for ${output}`);
  assert(state?.level === level, `Unexpected level for ${output}`);
}

async function assertRejects(callback, pattern) {
  try {
    await callback();
  } catch (error) {
    if (pattern)
      assert(pattern.test(error.message), `Unexpected error: ${error.message}`);
    return;
  }

  throw new Error("Expected rejection");
}

assertState(
  "Charging [          ] 0 %",
  BATTERY_STATUS.CHARGING,
  0,
);
assertState(
  "Discharging [==========] 100 %",
  BATTERY_STATUS.DISCHARGING,
  100,
);
assertState(
  "Discharging\u00a0[=====     ]\u00a050\u00a0%",
  BATTERY_STATUS.DISCHARGING,
  50,
);

for (const output of [
  "",
  "Unable to get the battery level. Is the mouse turned on?",
  "Charging",
  "Discharging [==========] 101 %",
  "Unknown [=====     ] 50 %",
])
  assert(parseBatteryOutput(output) === null, `Accepted invalid output: ${output}`);

const output = await runCommand(["/usr/bin/printf", "  ready  \n"], 1_000);
assert(output === "ready", "Command output was not trimmed");

await assertRejects(
  () => runCommand(["/bin/sh", "-c", "printf failure >&2; exit 7"], 1_000),
  /failure/u,
);
await assertRejects(
  () => runCommand(["/missing/steelseries-test-command"], 1_000),
);

const timeoutStart = GLib.get_monotonic_time();
await assertRejects(
  () => runCommand(["/usr/bin/sleep", "30"], 100),
  /timed out/u,
);
assert(
  GLib.get_monotonic_time() - timeoutStart < 2_000_000,
  "Timed out process did not stop promptly",
);

const cancellable = new Gio.Cancellable();
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
  cancellable.cancel();
  return GLib.SOURCE_REMOVE;
});
await assertRejects(
  () => runCommand(["/usr/bin/sleep", "30"], 5_000, cancellable),
);

print("All tests passed");
