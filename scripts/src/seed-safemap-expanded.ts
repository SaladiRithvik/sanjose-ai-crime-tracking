import { createExpandedMapSamples, db, pool, reportsTable } from '@workspace/db';

try {
  const inserted = await db.insert(reportsTable).values(createExpandedMapSamples())
    .onConflictDoNothing().returning({ id: reportsTable.id });
  console.log(`Inserted ${inserted.length} approved map samples; existing reports were not changed.`);
} finally {
  await pool.end();
}
