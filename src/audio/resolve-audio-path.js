import path from 'node:path';

/**
 * @param {string} filePath
 * @param {string | undefined} audioBaseDir
 * @returns {string}
 */
export function resolveAudioPath(filePath, audioBaseDir) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  if (audioBaseDir) {
    return path.join(audioBaseDir, filePath);
  }

  return filePath;
}
