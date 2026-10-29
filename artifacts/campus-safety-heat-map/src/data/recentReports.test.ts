import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRecentReport, RECENT_REPORT_WINDOW_MS } from './recentReports';

const now = Date.parse('2026-10-06T20:00:00Z');
const timestamp = (age: number) => new Date(now - age).toISOString();

test('Recent applies exclusively within the last hour of submission', () => {
  assert.equal(isRecentReport(timestamp(0), now), true);
  assert.equal(isRecentReport(timestamp(RECENT_REPORT_WINDOW_MS - 1), now), true);
  assert.equal(isRecentReport(timestamp(RECENT_REPORT_WINDOW_MS), now), false);
  assert.equal(isRecentReport(timestamp(RECENT_REPORT_WINDOW_MS + 1), now), false);
  assert.equal(isRecentReport(timestamp(-1), now), false);
  assert.equal(isRecentReport('', now), false);
  assert.equal(isRecentReport('invalid', now), false);
});

test('Recent expires using elapsed time and respects timezone offsets', () => {
  const submittedAt = '2026-10-06T12:30:00-07:00';
  assert.equal(isRecentReport(submittedAt, now), true);
  assert.equal(isRecentReport(submittedAt, now + 30 * 60 * 1000), false);
});
