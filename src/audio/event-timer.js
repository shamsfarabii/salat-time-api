/** Maximum delay accepted by Node's `setTimeout` (~24.8 days). */
export const MAX_SET_TIMEOUT_MS = 2_147_483_647;

/**
 * Milliseconds from `now` until `target` (0 if `target` is in the past).
 *
 * @param {Date} target
 * @param {Date} [now]
 * @returns {number}
 */
export function delayUntil(target, now = new Date()) {
  return Math.max(0, target.getTime() - now.getTime());
}

/**
 * Local midnight at the start of the calendar day after `now`.
 *
 * @param {Date} now
 * @returns {Date}
 */
export function startOfNextLocalDay(now) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

/**
 * Schedules work after a delay, chunking when `delayMs` exceeds {@link MAX_SET_TIMEOUT_MS}.
 *
 * @returns {{
 *   schedule: (delayMs: number, onFire: () => void) => void,
 *   clear: () => void,
 *   stop: () => void,
 *   stopped: boolean,
 * }}
 */
export function createDeferredTimer() {
  let timerId = null;
  let stopped = false;

  const clear = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  /**
   * @param {number} delayMs
   * @param {() => void} onFire
   */
  const schedule = (delayMs, onFire) => {
    clear();
    if (stopped) {
      return;
    }

    const chunkMs = Math.min(Math.max(0, delayMs), MAX_SET_TIMEOUT_MS);
    timerId = setTimeout(() => {
      timerId = null;
      if (stopped) {
        return;
      }

      const remainingMs = delayMs - chunkMs;
      if (remainingMs > 0) {
        schedule(remainingMs, onFire);
        return;
      }

      onFire();
    }, chunkMs);
  };

  const stop = () => {
    stopped = true;
    clear();
  };

  return {
    schedule,
    clear,
    stop,
    get stopped() {
      return stopped;
    },
  };
}