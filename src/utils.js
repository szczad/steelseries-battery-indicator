import Gio from "gi://Gio";

const LOG_NAME = "steelseries-battery-indicator@szczad.pl";

/**
 * @param {string[]} Arguments to the command line.
 *
 * @returns {Promise<{code: int, stdout: string, stderr: string}>}
 */
export async function callCommand(argv) {
  let cancelId = 0;
  const cancellable = new Gio.Cancellable();
  const proc = new Gio.Subprocess({
    argv,
    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
  });
  proc.init(cancellable);

  if (cancellable instanceof Gio.Cancellable) {
    cancelId = cancellable.connect(() => proc.force_exit());
  }

  try {
    const [_, stdout, stderr] = await proc.communicate_utf8(null, cancellable);
    const status = proc.get_exit_status();

    return {
      code: status,
      stdout: stdout ? stdout.trim() : stdout,
      stderr: stderr ? stderr.trim() : stderr,
    };
  } finally {
    if (cancelId > 0) cancellable.disconnect(cancelId);
  }
}

/** @param {string} Text to be sent to the console */
export function log(text) {
  console.log(`[${LOG_NAME}]: ${text}`);
}
