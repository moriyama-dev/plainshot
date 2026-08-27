import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const RELEASE = join(ROOT, 'release');

if (!existsSync(join(DIST, 'manifest.json'))) {
  console.error('dist/ is missing or incomplete. Run "npm run build" first.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const archive = join(RELEASE, `${pkg.name}-${pkg.version}.zip`);

mkdirSync(RELEASE, { recursive: true });
rmSync(archive, { force: true });

// Zipping the contents of dist/, not dist/ itself: the store expects
// manifest.json at the root of the archive.
execFileSync('zip', ['-r', '-q', '-X', archive, '.', '-x', '.*', '-x', '*/.*', '-x', '*.map'], {
  cwd: DIST,
  stdio: 'inherit',
});

console.log(`packaged ${archive}`);
