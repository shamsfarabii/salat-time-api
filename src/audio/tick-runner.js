/**
 * Returns a tick function that skips when the previous check is still running.
 *
 * @param {() => Promise<unknown>} checkNow
 * @param {(error: unknown) => void} [onError]
 * @returns {() => void}
 */
export function createNonOverlappingTickRunner(checkNow, onError) {
  let inFlight = false;

  return () => {
    if (inFlight) {
      return;
    }

    inFlight = true;
    checkNow()
      .catch((error) => {
        onError?.(error);
      })
      .finally(() => {
        inFlight = false;
      });
  };
}
