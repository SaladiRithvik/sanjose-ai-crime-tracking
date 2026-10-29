import assert from 'node:assert/strict';
import test from 'node:test';
import { clusterDiameter, clusterReports, separateNearbyReports } from './mapClusters';

test('cluster sizes remain compact even for large counts', () => {
  assert.deepEqual([1, 2, 3, 5, 6, 9, 100].map(clusterDiameter), [32, 32, 36, 36, 40, 40, 40]);
});

test('overview grouping retains every report', () => {
  const points = [0, 25, 200].map((x, report) => ({ report, x, y: 0 }));
  const groups = clusterReports(points, 40);
  assert.deepEqual(groups.map(group => group.items.length), [2, 1]);
  assert.equal(groups.flatMap(group => group.items).length, 3);
});

test('identical close-up locations separate without changing source coordinates', () => {
  const points = Array.from({ length: 9 }, (_, report) => ({ report, x: 100, y: 100 }));
  const before = structuredClone(points);
  const separated = separateNearbyReports(points);
  assert.equal(separated.length, 9);
  assert.equal(new Set(separated.map(point => `${point.x},${point.y}`)).size, 9);
  for (let a = 0; a < separated.length; a++) {
    for (let b = a + 1; b < separated.length; b++) {
      assert.ok(Math.hypot(separated[a].x - separated[b].x, separated[a].y - separated[b].y) > 26);
    }
  }
  assert.deepEqual(points, before);
  assert.deepEqual(separateNearbyReports([{ report: 1, x: 50, y: 60 }])[0], {
    items: [{ report: 1, x: 50, y: 60 }], x: 50, y: 60,
  });
});
