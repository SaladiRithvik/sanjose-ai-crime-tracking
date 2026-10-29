import app from "./app";
import { logger } from "./lib/logger";
import { createExpandedMapSamples, db, reportsTable } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Stable sample IDs make this safe in development and on publish. Conflicts
// preserve existing reports and later reviewer decisions, including removal.
try {
  const added = await db.insert(reportsTable).values(createExpandedMapSamples())
    .onConflictDoNothing().returning({ id: reportsTable.id });
  logger.info({ inserted: added.length }, "Expanded public-map samples initialized");
} catch (err) {
  logger.error({ err }, "Could not initialize public-map sample data");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
