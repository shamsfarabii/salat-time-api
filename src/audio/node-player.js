import { spawn, spawnSync } from 'node:child_process';
import { platform } from 'node:os';

/** @typedef {{ command: string, args: (filePath: string) => string[] }} PlayerConfig */

/** mpv / ffplay / mpg123 decode MP3; aplay only accepts raw PCM and distorts MP3. */
const LINUX_MP3_PLAYERS = [
  {
    command: 'mpv',
    args: (filePath) => ['--no-video', '--really-quiet', filePath],
  },
  {
    command: 'ffplay',
    args: (filePath) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', filePath],
  },
  {
    command: 'mpg123',
    args: (filePath) => ['-q', filePath],
  },
];

/**
 * @param {string} command
 * @returns {boolean}
 */
function isCommandAvailable(command) {
  const result = spawnSync('sh', ['-c', `command -v ${command}`], {
    stdio: 'ignore',
  });

  return result.status === 0;
}

/**
 * @returns {PlayerConfig | null}
 */
function findLinuxMp3PlayerConfig() {
  for (const player of LINUX_MP3_PLAYERS) {
    if (isCommandAvailable(player.command)) {
      return player;
    }
  }

  return null;
}

/**
 * @returns {PlayerConfig | null}
 */
function getPlatformPlayerConfig() {
  const os = platform();

  if (os === 'darwin') {
    return { command: 'afplay', args: (filePath) => [filePath] };
  }

  if (os === 'linux') {
    return findLinuxMp3PlayerConfig();
  }

  if (os === 'win32') {
    return {
      command: 'powershell',
      args: (filePath) => [
        '-NoProfile',
        '-Command',
        `(New-Object Media.SoundPlayer '${filePath.replace(/'/g, "''")}').PlaySync()`,
      ],
    };
  }

  return null;
}

/**
 * Create a Node.js audio player backed by the platform CLI tool.
 *
 * @returns {(filePath: string, context: { prayer: string, time: Date }) => Promise<void>}
 */
export function createNodeAudioPlayer() {
  const config = getPlatformPlayerConfig();

  if (!config) {
    const os = platform();

    if (os === 'linux') {
      throw new Error(
        'No MP3 audio player found on Linux. Install one of: mpv, ffmpeg (ffplay), or mpg123. ' +
          'On Fedora: sudo dnf install mpv',
      );
    }

    throw new Error(
      `No built-in audio player for platform "${os}". Provide a custom playAudio callback.`,
    );
  }

  return (filePath) =>
    new Promise((resolve, reject) => {
      const child = spawn(config.command, config.args(filePath), {
        stdio: 'ignore',
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${config.command} exited with code ${code}`));
      });
    });
}
