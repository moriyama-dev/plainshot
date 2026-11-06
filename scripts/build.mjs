import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

if (!existsSync(join(PUBLIC, 'icons', 'icon128.png'))) {
  const { writeIcons } = await import('./make-icons.mjs');
  writeIcons();
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

await build({
  entryPoints: [join(ROOT, 'src', 'background', 'service-worker.ts')],
  outfile: join(DIST, 'background', 'service-worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  // Matches minimum_chrome_version in the manifest.
  target: 'chrome116',
  // Deliberately unminified: functions in capture/injected.ts are serialised
  // with toString() and evaluated in the page, and a bundler that hoists a
  // shared helper out of one of them would break it silently.
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
});

cpSync(PUBLIC, DIST, { recursive: true });

// The store rejects a package whose manifest version drifts from the release,
// so package.json stays the single source of truth.
const manifestPath = join(DIST, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = pkg.version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`built ${pkg.name} ${pkg.version} into dist/`);
