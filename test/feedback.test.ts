import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildReportUrl, describeBrowser, torontoTimestamp } from '../src/lib/feedback.ts';

test('timestamps are written in Toronto time', () => {
  // 2026-07-01 16:30 UTC is 12:30 EDT; 2026-01-15 16:30 UTC is 11:30 EST.
  assert.equal(torontoTimestamp(new Date(Date.UTC(2026, 6, 1, 16, 30))), '2026-07-01 12:30 EDT');
  assert.equal(torontoTimestamp(new Date(Date.UTC(2026, 0, 15, 16, 30))), '2026-01-15 11:30 EST');
});

test('the report link pre-fills the environment and nothing else', () => {
  const url = new URL(
    buildReportUrl({
      version: '1.2.3',
      browser: 'Microsoft Edge 131',
      os: 'win (x86-64)',
      language: 'ja',
      now: new Date(Date.UTC(2026, 6, 1, 16, 30)),
    }),
  );
  assert.equal(url.origin + url.pathname, 'https://github.com/moriyama-dev/plainshot/issues/new');
  const body = url.searchParams.get('body') ?? '';
  assert.match(body, /- Plainshot: 1\.2\.3/);
  assert.match(body, /- Browser: Microsoft Edge 131/);
  assert.match(body, /- OS: win \(x86-64\)/);
  assert.match(body, /- Language: ja/);
  assert.match(body, /- Reported at: 2026-07-01 12:30 EDT/);
  assert.doesNotMatch(body, /https?:\/\//, 'no page URL may leak into a report');
});

test('the browser is named by its brand, not the Chromium base', () => {
  const ua = 'Mozilla/5.0';
  assert.equal(
    describeBrowser(
      [
        { brand: 'Not)A;Brand', version: '8' },
        { brand: 'Chromium', version: '131' },
        { brand: 'Microsoft Edge', version: '131' },
      ],
      ua,
    ),
    'Microsoft Edge 131',
  );
  assert.equal(describeBrowser([{ brand: 'Chromium', version: '131' }], ua), 'Chromium 131');
  assert.equal(describeBrowser(undefined, ua), ua);
});
