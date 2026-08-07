import { spawn, spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { createPlaybackQueue } from './playback-queue.js';

/** @typedef {{ command: string, args: (filePath: string) => string[] }} PlayerConfig */

/** mpv / ffplay / mpg123 decode MP3; aplay only accepts raw PCM and distorts MP3. */
const MP3_CLI_PLAYERS = [
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
  if (platform() === 'win32') {
    const result = spawnSync('where', [command], {
      stdio: 'ignore',
      shell: true,
    });

    return result.status === 0;
  }

  const result = spawnSync('sh', ['-c', `command -v ${command}`], {
    stdio: 'ignore',
  });

  return result.status === 0;
}

/**
 * @returns {PlayerConfig | null}
 */
function findCliMp3PlayerConfig() {
  for (const player of MP3_CLI_PLAYERS) {
    if (isCommandAvailable(player.command)) {
      return player;
    }
  }

  return null;
}

/**
 * Windows Media Player COM object decodes MP3; SoundPlayer only supports WAV.
 *
 * @returns {PlayerConfig}
 */
function getWindowsWmPlayerConfig() {
  return {
    command: 'powershell',
    args: (filePath) => {
      const escapedPath = filePath.replace(/'/g, "''");
      return [
        '-NoProfile',
        '-Command',
        `$player=New-Object -ComObject WMPlayer.OCX;` +
          `$player.URL='${escapedPath}';` +
          `$player.controls.play();` +
          `while($player.playState -eq 3){Start-Sleep -Milliseconds 200};` +
          `$player.close()`,
      ];
    },
  };
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
    return findCliMp3PlayerConfig();
  }

  if (os === 'win32') {
    return findCliMp3PlayerConfig() ?? getWindowsWmPlayerConfig();
  }

  return null;
}

/**
 * @param {PlayerConfig} config
 * @returns {(filePath: string) => Promise<void>}
 */
function createRawPlayer(config) {
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

/**
 * Create a Node.js audio player backed by the platform CLI tool.
 * Playback is serialized so overlapping scheduler ticks cannot stack audio.
 *
 * @returns {(filePath: string, context?: unknown) => Promise<void>}
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

  return createPlaybackQueue(createRawPlayer(config));
}
