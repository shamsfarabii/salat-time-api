/**
 * Wrap a playAudio function so only one file plays at a time.
 * Additional requests wait in FIFO order instead of overlapping.
 *
 * The returned function has a `playExclusive` method that runs multiple
 * playbacks back-to-back in a single queue slot so other schedulers cannot
 * interleave audio between them (e.g. Start cue then Adhan).
 *
 * @template TContext
 * @param {(filePath: string, context: TContext) => Promise<void>} playAudio
 * @returns {((filePath: string, context: TContext) => Promise<void>) & {
 *   playExclusive: (
 *     fn: (playOne: (filePath: string, context: TContext) => Promise<void>) => Promise<void>,
 *   ) => Promise<void>,
 * }}
 */
export function createPlaybackQueue(playAudio) {
  /** @type {Promise<void>} */
  let tail = Promise.resolve();

  /**
   * @param {() => Promise<void>} task
   * @returns {Promise<void>}
   */
  const enqueue = (task) => {
    const run = tail.then(task);
    tail = run.catch(() => {
      // Keep the queue alive after a failed playback.
    });
    return run;
  };

  /**
   * @param {string} filePath
   * @param {TContext} context
   * @returns {Promise<void>}
   */
  const queuedPlay = (filePath, context) =>
    enqueue(() => playAudio(filePath, context));

  queuedPlay.playExclusive = (fn) =>
    enqueue(() => fn((filePath, context) => playAudio(filePath, context)));

  return queuedPlay;
}
