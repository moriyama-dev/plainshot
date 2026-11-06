import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAC_BINARY = 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

/** CHROME_PATH, or a Chrome for Testing unpacked into .cache/browsers. */
export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    join(ROOT, '.cache/browsers/chrome-linux64/chrome'),
    join(ROOT, '.cache/browsers/chrome-mac-arm64', MAC_BINARY),
    join(ROOT, '.cache/browsers/chrome-mac-x64', MAC_BINARY),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error('No browser found. Set CHROME_PATH or install one into .cache/browsers.');
  }
  return found;
}
