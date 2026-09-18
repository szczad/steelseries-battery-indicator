import Gio from "gi://Gio";
import GLib from "gi://GLib";

export function runCommand(argv, timeoutMs, cancellable = null) {
  return new Promise((resolve, reject) => {
    const operation = cancellable ?? new Gio.Cancellable();
    const proc = new Gio.Subprocess({
      argv,
      flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    });
    let cancelId = 0;
    let timeoutId = 0;
    let timedOut = false;

    const cleanup = () => {
      if (timeoutId) GLib.Source.remove(timeoutId);
      if (cancelId) operation.disconnect(cancelId);
      timeoutId = 0;
      cancelId = 0;
    };

    try {
      proc.init(operation);
      cancelId = operation.connect(() => proc.force_exit());
      timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeoutMs, () => {
        timeoutId = 0;
        timedOut = true;
        operation.cancel();
        return GLib.SOURCE_REMOVE;
      });

      proc.communicate_utf8_async(null, operation, (_proc, result) => {
        try {
          const [, stdout, stderr] = _proc.communicate_utf8_finish(result);
          const status = _proc.get_exit_status();

          if (status !== 0) {
            reject(new Error(stderr?.trim() || `Command exited with ${status}`));
          } else {
            resolve(stdout?.trim() ?? "");
          }
        } catch (error) {
          reject(timedOut ? new Error("Command timed out") : error);
        } finally {
          cleanup();
        }
      });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
