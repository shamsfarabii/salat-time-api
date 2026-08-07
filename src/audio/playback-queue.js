/**
 * Wrap a playAudio function so only one file plays at a time.
 * Additional requests wait in FIFO order instead of overlapping.
 *
 * @template TContext
 * @param {(filePath: string, context: TContext) => Promise<void>} playAudio
 * @returns {(filePath: string, context: TContext) => Promise<void>}
 */
export function createPlaybackQueue(playAudio) {
  /** @type {Promise<void>} */
  let tail = Promise.resolve();

  return (filePath, context) => {
    const run = tail.then(() => playAudio(filePath, context));
    tail = run.catch(() => {
      // Keep the queue alive after a failed playback.
    });
    return run;
  };
}
