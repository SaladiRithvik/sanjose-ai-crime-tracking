import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesMapTimeRange, mapUpdatedLabel } from './publicMapFilters';
import { PUBLIC_MAP_BOUNDS, DOWNTOWN_LANDMARKS, insideCampus } from './publicMapGeography';
import { CAMPUS_BOUNDARY } from './campusLandmarks';
import { collectiveDensityAt, displayHeatDensity, heatColorAt } from './collectiveHeat';
import { PUBLIC_MAP_SEVERITY_COLORS, SEVERITY_COLORS } from './incidentPresentation';

const now = new Date('2026-10-03T12:00:00Z');
const report = (incidentDate: string, submittedAt = '2026-10-02T20:00:00Z') => ({ incidentDate, submittedAt });

test('All includes undated and historical reports', () => {
  assert.equal(matchesMapTimeRange(report('2025-03-28'), 'all', now), true);
  assert.equal(matchesMapTimeRange(report('', ''), 'all', now), true);
});

test('7 and 30 days include today with exact inclusive calendar cutoffs', () => {
  for (const day of ['2026-10-03', '2026-10-02', '2026-09-27']) {
    assert.equal(matchesMapTimeRange(report(day), '7', now), true);
  }
  assert.equal(matchesMapTimeRange(report('2026-09-26'), '7', now), false);
  assert.equal(matchesMapTimeRange(report('2026-09-04'), '30', now), true);
  assert.equal(matchesMapTimeRange(report('2026-09-03'), '30', now), false);
  assert.equal(matchesMapTimeRange(report('2026-10-04'), '30', now), false);
});

test('San José calendar date is used, not the UTC calendar date', () => {
  const beforeMidnight = new Date('2026-10-03T06:59:00Z');
  assert.equal(matchesMapTimeRange(report('2026-10-02'), '7', beforeMidnight), true);
  assert.equal(matchesMapTimeRange(report('2026-10-03'), '7', beforeMidnight), false);
  assert.equal(matchesMapTimeRange(report('', '2026-10-03T03:00:00Z'), '7', beforeMidnight), true);
});

test('undated reports use submission date; invalid supplied dates are not invented', () => {
  assert.equal(matchesMapTimeRange(report(''), '7', now), true);
  assert.equal(matchesMapTimeRange(report('', '2025-01-01T12:00:00Z'), '7', now), false);
  assert.equal(matchesMapTimeRange(report('', 'invalid'), '7', now), false);
  assert.equal(matchesMapTimeRange(report('2026-02-31'), '30', now), false);
  assert.equal(matchesMapTimeRange(report('invalid'), '7', now), false);
});

test('Updated is the latest real report/review date in San José', () => {
  assert.equal(mapUpdatedLabel([
    { submittedAt: '2026-10-01T12:00:00Z', moderatedAt: '2026-10-03T01:00:00Z' },
    { submittedAt: '2026-10-02T12:00:00Z' },
  ]), 'Oct 2, 2026');
  assert.equal(mapUpdatedLabel([]), 'Date unavailable');
});

test('overview bounds include all downtown landmark anchors and campus', () => {
  const [southWest, northEast] = PUBLIC_MAP_BOUNDS;
  for (const point of [...DOWNTOWN_LANDMARKS, ...CAMPUS_BOUNDARY.map(([latitude, longitude]) => ({ latitude, longitude }))]) {
    assert.ok(point.latitude >= southWest[0] && point.latitude <= northEast[0]);
    assert.ok(point.longitude >= southWest[1] && point.longitude <= northEast[1]);
  }
  assert.ok(insideCampus(37.3352, -121.8811, CAMPUS_BOUNDARY));
  assert.equal(insideCampus(37.3299203, -121.902496, CAMPUS_BOUNDARY), false);
});

test('stronger overlap does not broaden isolated heat or change other screens colors', () => {
  const point = { latitude: 37.3352, longitude: -121.8811 };
  assert.equal(collectiveDensityAt(point, [point]), 1);
  assert.equal(heatColorAt(displayHeatDensity(1))[3], 31);
  assert.ok(heatColorAt(displayHeatDensity(2))[3] > 60);
  assert.equal(collectiveDensityAt({ latitude: point.latitude + 0.01, longitude: point.longitude }, [point]), 0);
  assert.deepEqual(heatColorAt(displayHeatDensity(8)).slice(0, 3), [220, 38, 38]);
  assert.equal(SEVERITY_COLORS.Low, '#eab308');
  assert.notEqual(PUBLIC_MAP_SEVERITY_COLORS.Low, SEVERITY_COLORS.Low);
});