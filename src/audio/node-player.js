import { spawn } from 'node:child_process';
import { platform } from 'node:os';

/**
 * @returns {{ command: string, args: (filePath: string) => string[] } | null}
 */
function getPlatformPlayerConfig() {
  const os = platform();

  if (os === 'darwin') {
    return { command: 'afplay', args: (filePath) => [filePath] };
  }

  if (os === 'linux') {
    return { command: 'aplay', args: (filePath) => [filePath] };
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
    throw new Error(
      `No built-in audio player for platform "${platform()}". Provide a custom playAudio callback.`,
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
