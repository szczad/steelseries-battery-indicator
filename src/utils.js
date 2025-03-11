import Gio from "gi://Gio";
import { LOG_NAME } from "./constants.js";

/**
 * @param {string[]} Arguments to the command line.
 */
export function callCommandAsync(argv, callback) {
  const proc = new Gio.Subprocess({
    argv,
    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
  });
  proc.init(null);

  proc.communicate_utf8_async(null, null, (_proc, res) => {
    try {
      let [ok, stdout, stderr] = _proc.communicate_utf8_finish(res);
      let code = _proc.get_exit_status();
      log(`DEBUG: ${ok}|${code}|${stdout}|${stderr}`);
      callback({
        code: code,
        stdout: stdout ? stdout.trim() : stdout,
        stderr: stderr ? stderr.trim() : stderr,
      });
    } catch (e) {
      callback({ code: 255, stdout: null, stderr: null, error: e });
    }
  });
}

/** @param {string} Text to be sent to the console */
export function log(text) {
  console.log(`[${LOG_NAME}]: ${text}`);
}
