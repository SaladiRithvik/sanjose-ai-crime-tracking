import { db, pool, reportsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { pendingSamples } from "./safemap-samples";

// Analyze the requested pending fixtures through the same validated AI endpoint as reporters.
// Cookies stay in memory and are never logged.
try {
  const session = await fetch("http://localhost:80/api/safemap/session", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "resident" }),
  });
  if (!session.ok) throw new Error("Could not start sample analysis session");
  const cookie = session.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  for (const sample of pendingSamples) {
    const [row] = await db.select().from(reportsTable).where(and(
      eq(reportsTable.id, sample.id), eq(reportsTable.isDemo, true), isNull(reportsTable.triage),
    ));
    if (!row) continue;
    const response = await fetch("http://localhost:80/api/safemap/triage", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ description: row.description }),
    });
    if (!response.ok) throw new Error("Could not analyze sample report");
    const { triage } = await response.json() as { triage: unknown };
    if (triage) await db.update(reportsTable).set({ triage })
      .where(and(eq(reportsTable.id, sample.id), isNull(reportsTable.triage)));
    process.stdout.write(`${sample.id}: ${triage ? "AI suggestion saved" : "AI summary unavailable"}\n`);
  }
  await fetch("http://localhost:80/api/safemap/session", { method: "DELETE", headers: { Cookie: cookie } });
} finally { await pool.end(); }