import { db, reportsTable } from "@workspace/db";
import { and, eq, like } from "drizzle-orm";

export function cleanSampleText(text: string): string {
  return text.replace(/^Fictional (?:example|demo report):\s*/i, "")
    .replace(/^Fictional demo\s*[—-]\s*/i, "")
    .replace(/This (?:example|sample)[^.]*\./gi, "")
    .replace(/This is an invented example\./gi, "")
    .replace(/Fictional Demo Reporter/g, "Reporter").trim();
}

export const pendingSamples = [
  { id: "SJSU-2001", description: "A person is unconscious right now near the Student Union entrance. Someone nearby is calling 911.", incidentCategory: "Medical Concern", locationLabel: "Student Union", latitude: 37.3365, longitude: -121.8806, urgent: true },
  { id: "SJSU-2002", description: "The pathway light near the library entrance is out. It has been dark there since last evening.", incidentCategory: "Other Safety Concern", locationLabel: "MLK Library", latitude: 37.3355, longitude: -121.8840, urgent: false },
  { id: "SJSU-2003", description: "A bicycle was missing when I returned to the rack outside Campus Village this afternoon.", incidentCategory: "Theft", locationLabel: "Campus Village", latitude: 37.3310, longitude: -121.8769, urgent: false },
  { id: "SJSU-2004", description: "FREE MONEY!!! Buy our miracle crypto now! Guaranteed 1000% returns. Click https://example.com/win and send your card details!", incidentCategory: "Other Safety Concern", locationLabel: "Campus plaza", latitude: 37.3360, longitude: -121.8811, urgent: false },
  { id: "SJSU-2005", description: "Cheap sunglasses SALE SALE SALE!!! Visit https://example.com/shop for discount codes. This is an advertisement, not a safety incident.", incidentCategory: "Other Safety Concern", locationLabel: "Downtown", latitude: 37.3363, longitude: -121.8882, urgent: false },
].map(report => ({
  ...report, isDemo: true, source: "sample", status: "pending" as const,
  priority: report.urgent ? "Critical" : "Normal", anonymous: true, reporterRole: "student",
  locationSource: "manual", locationConfirmed: true,
  incidentDate: new Date().toISOString().slice(0, 10), incidentTime: "10:00",
}));

/** One-time rename leaves subsequently reviewed samples and all user submissions untouched. */
export async function updateLegacySamples() {
  const rows = await db.select().from(reportsTable)
    .where(and(eq(reportsTable.isDemo, true), like(reportsTable.id, "DEMO-%")));
  await db.transaction(async tx => {
    for (const [index, row] of rows.sort((a, b) => a.id.localeCompare(b.id)).entries()) {
      await tx.update(reportsTable).set({
        id: `SJSU-${String(index + 1).padStart(4, "0")}`, status: "approved",
        locationLabel: cleanSampleText(row.locationLabel), description: cleanSampleText(row.description),
        reporterDisplayName: row.reporterDisplayName ? cleanSampleText(row.reporterDisplayName) : null,
        analystNotes: "", analystComment: "", reviewedBy: "Analyst", moderatedAt: new Date(),
      }).where(eq(reportsTable.id, row.id));
    }
    await tx.insert(reportsTable).values(pendingSamples).onConflictDoNothing();
  });
}