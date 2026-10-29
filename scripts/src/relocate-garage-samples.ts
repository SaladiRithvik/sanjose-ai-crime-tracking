/** Explicit, idempotent update of existing samples only. Never creates reports. */
import assert from 'node:assert/strict';
import { db, pool, reportsTable } from '@workspace/db';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

// Frozen migration targets matching the 2026-10-07 verified landmark positions.
// Deliberately independent of future UI edits so reruns do not relocate samples again.
const garages = [
  { name: 'South Garage', latitude: 37.33310134, longitude: -121.88082848, address: '377 S 7th St' },
  { name: 'West Garage', latitude: 37.33237942, longitude: -121.88301061, address: '350 S 4th St' },
  { name: 'North Garage', latitude: 37.33930115, longitude: -121.88073330, address: '65 S 10th St' },
  { name: 'South Campus Garage', latitude: 37.32078367, longitude: -121.86535697, address: '1278 S 10th St' },
];
const ids = Array.from({ length: 16 }, (_, i) => `SJSU-DEMO-VOLUME-${i + 1}`);
try {
  await db.transaction(async tx => {
    const snapshot = async () => (await tx.execute(sql`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'approved' AND resolved_at IS NULL)::int AS active,
        md5(coalesce(string_agg(to_jsonb(r)::text, '' ORDER BY id)
          FILTER (WHERE NOT (id IN ${ids} AND is_demo AND source = 'sample')), '')) AS untouched
      FROM reports r`)).rows[0];
    const before = await snapshot();
    const records = await tx.select().from(reportsTable).where(and(
      inArray(reportsTable.id, ids), eq(reportsTable.isDemo, true),
      eq(reportsTable.source, 'sample'), eq(reportsTable.status, 'approved'),
      isNull(reportsTable.resolvedAt),
    )).for('update');
    assert.equal(records.length, 16, 'Expected 16 active approved samples; no changes applied.');
    for (const record of records) {
      const index = ids.indexOf(record.id);
      const garage = garages[Math.floor(index / 4)];
      const offset = index % 4;
      // Four small offsets within the garage footprint, not on neighboring blocks.
      const latitude = garage.latitude + (offset < 2 ? -1 : 1) * 0.000035;
      const longitude = garage.longitude + (offset % 2 ? -1 : 1) * 0.00004;
      const address = garage.address;
      if (record.latitude === latitude && record.longitude === longitude
        && record.locationLabel === garage.name && record.locationAddress === address) continue;
      assert.ok(record.description.includes(record.locationLabel), 'Sample description must match its old location.');
      const changed = await tx.update(reportsTable).set({
        latitude, longitude, locationLabel: garage.name, locationAddress: address,
        description: record.description.split(record.locationLabel).join(garage.name),
        updatedAt: new Date(),
      }).where(and(eq(reportsTable.id, record.id), eq(reportsTable.isDemo, true),
        eq(reportsTable.source, 'sample'))).returning({ id: reportsTable.id });
      assert.equal(changed.length, 1);
    }
    assert.deepEqual(await snapshot(), before, 'Report totals or non-target records changed; rolling back.');
    console.log(JSON.stringify({ ...before, garages: garages.map(g => ({ name: g.name, reports: 4 })) }));
  });
} finally {
  await pool.end();
}
