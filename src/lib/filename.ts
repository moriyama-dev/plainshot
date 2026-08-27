/** Characters the downloads API rejects, plus anything awkward in a shell. */
const UNSAFE = /[\\/:*?"<>|]+/g;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function timestamp(now: Date): string {
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function hostLabel(url: string | undefined): string {
  if (!url) return 'page';
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'page';
  } catch {
    return 'page';
  }
}

export function buildFilename(url: string | undefined, now: Date, extension: string): string {
  const host = hostLabel(url).replace(UNSAFE, '-').slice(0, 60);
  return `plainshot/${host}-${timestamp(now)}.${extension}`;
}
