// Builds the links behind the "Report a problem" and "GitHub" entries in the
// toolbar button's context menu. Nothing is sent anywhere: the browser opens a
// pre-filled GitHub issue form and the user decides whether to submit it.

export const REPOSITORY_URL = 'https://github.com/moriyama-dev/plainshot';

export interface ReportEnvironment {
  version: string;
  browser: string;
  os: string;
  language: string;
  now: Date;
}

/** Wall-clock time in Toronto, where the maintainer reads the reports. */
export function torontoTimestamp(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} ${get('timeZoneName')}`;
}

export function buildReportUrl(env: ReportEnvironment): string {
  // Deliberately no page URL: the page the user was on may be private.
  const body = [
    '### What happened?',
    '',
    '',
    '### Steps to reproduce',
    '',
    '1. ',
    '',
    '### Environment',
    '',
    `- Plainshot: ${env.version}`,
    `- Browser: ${env.browser}`,
    `- OS: ${env.os}`,
    `- Language: ${env.language}`,
    `- Reported at: ${torontoTimestamp(env.now)}`,
    '',
  ].join('\n');
  return `${REPOSITORY_URL}/issues/new?body=${encodeURIComponent(body)}`;
}

interface Brand {
  brand: string;
  version: string;
}

/** "Microsoft Edge 131" / "Google Chrome 131", falling back to the UA string. */
export function describeBrowser(brands: Brand[] | undefined, userAgent: string): string {
  const named = (brands ?? []).find(
    ({ brand }) => !/not.?a.?brand/i.test(brand) && brand !== 'Chromium',
  );
  const chromium = (brands ?? []).find(({ brand }) => brand === 'Chromium');
  const pick = named ?? chromium;
  return pick ? `${pick.brand} ${pick.version}` : userAgent;
}
