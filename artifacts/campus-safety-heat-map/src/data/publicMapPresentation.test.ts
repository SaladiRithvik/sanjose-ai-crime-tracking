import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicHeatColorAt, publicHeatOpacity, publicMapSeverity, OVERVIEW_LABELS, isMapEligible, activityMarkerColor } from './publicMapPresentation';
import { collectiveDensityAt } from './collectiveHeat';
import { clusterReports } from './mapClusters';
import { incidentSeverity } from './incidentPresentation';
import type { ReportRecord } from './reports';

test('public severity varies per report without changing type badges elsewhere', () => {
  const sample = { incidentType: 'Theft', priorityStatus: 'Low' } as ReportRecord;
  assert.equal(publicMapSeverity(sample), 'Low');
  assert.equal(publicMapSeverity({ ...sample, priorityStatus: 'Normal' }), 'Medium');
  assert.equal(publicMapSeverity({ ...sample, priorityStatus: 'High' }), 'High');
  assert.equal(incidentSeverity('Theft'), 'Medium');
});

test('overview permits exactly the six requested landmarks', () => {
  assert.equal(OVERVIEW_LABELS.size, 6);
  assert.ok(OVERVIEW_LABELS.has('SJSU Campus'));
  assert.ok(OVERVIEW_LABELS.has('MLK Library'));
  assert.ok(!OVERVIEW_LABELS.has('City Hall'));
});

test('only active approved reports with confirmed valid locations are eligible', () => {
  const report = { moderationStatus: 'approved', locationConfirmed: true, location: 'Student Union',
    coordinates: { latitude: 37.3366, longitude: -121.8804 } } as ReportRecord;
  assert.equal(isMapEligible(report), true);
  for (const moderationStatus of ['pending', 'denied', 'removed'] as const)
    assert.equal(isMapEligible({ ...report, moderationStatus }), false);
  assert.equal(isMapEligible({ ...report, resolvedAt: '2026-10-06' }), false);
  assert.equal(isMapEligible({ ...report, locationConfirmed: false }), false);
  assert.equal(isMapEligible({ ...report, location: ' ' }), false);
  for (const coordinates of [{ latitude: 0, longitude: 0 }, { latitude: 91, longitude: 0 },
    { latitude: NaN, longitude: 0 }, { latitude: 37, longitude: 181 }])
    assert.equal(isMapEligible({ ...report, coordinates }), false);
});

test('marker concentration colors progress from cream to burgundy', () => {
  assert.deepEqual([1, 3, 6, 10, 16].map(activityMarkerColor),
    ['#F7E8B5', '#E5B84B', '#C96A32', '#9E1B1B', '#641414']);
});

test('public heat is transparent without reports, additive, warm and zoom-faded', () => {
  const point = { latitude: 37.33548, longitude: -121.885 };
  assert.deepEqual(publicHeatColorAt(collectiveDensityAt(point, [], 90)), [0, 0, 0, 0]);
  const single = publicHeatColorAt(collectiveDensityAt(point, [point], 90));
  const hotspot = publicHeatColorAt(collectiveDensityAt(point, Array(7).fill(point), 90));
  assert.ok(hotspot[3] > single[3]);
  assert.ok(hotspot[0] > hotspot[1] && hotspot[1] > hotspot[2]);
  assert.ok(hotspot[0] < single[0]); // darker warm concentration
  assert.equal(publicHeatOpacity(15), 1);
  assert.ok(publicHeatOpacity(18) < publicHeatOpacity(17));
  assert.ok(publicHeatOpacity(19) < 0.1);
  const distant = { ...point, latitude: point.latitude + 0.01 };
  assert.deepEqual(publicHeatColorAt(collectiveDensityAt(distant, [point], 90)), [0, 0, 0, 0]);
});

test('smaller public clustering keeps nearby but distinct hotspots separate', () => {
  const points = [
    { report: 'a', x: 0, y: 0 }, { report: 'b', x: 5, y: 5 },
    { report: 'c', x: 38, y: 0 }, { report: 'd', x: 43, y: 5 },
  ];
  assert.equal(clusterReports(points, 28).length, 2);
  assert.equal(clusterReports(points, 42).length, 1);
});