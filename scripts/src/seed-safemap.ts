import { db, pool, reportsTable } from "@workspace/db";
import { cleanSampleText, pendingSamples, updateLegacySamples } from "./safemap-samples";

type SeedReport = typeof reportsTable.$inferInsert;

const sampleReports: SeedReport[] = [
  { id: "DEMO-001", description: "Fictional example: a backpack was reported missing after a study session.", incidentCategory: "Lost Property", latitude: 37.3365, longitude: -121.8806, locationLabel: "Fictional demo — Student Union", incidentDate: "2025-03-12", incidentTime: "14:20", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-002", description: "Fictional example: repeated unwanted messages were reported near the library.", incidentCategory: "Harassing Communications", latitude: 37.3355, longitude: -121.884, locationLabel: "Fictional demo — MLK Library", incidentDate: "2025-03-14", incidentTime: "18:45", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-003", description: "Fictional example: a bicycle was reported missing from a public rack.", incidentCategory: "Theft", latitude: 37.3339, longitude: -121.8907, locationLabel: "Fictional demo — Paseo de San Antonio", incidentDate: "2025-03-16", incidentTime: "12:10", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-004", description: "Fictional example: a visitor described a suspicious payment request.", incidentCategory: "Fraud", latitude: 37.3367, longitude: -121.8937, locationLabel: "Fictional demo — San Pedro Square", incidentDate: "2025-03-17", incidentTime: "20:30", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-005", description: "Fictional example: damage to a public-facing fixture was noticed.", incidentCategory: "Vandalism", latitude: 37.3305, longitude: -121.8864, locationLabel: "Fictional demo — South First Street", incidentDate: "2025-03-19", incidentTime: "09:15", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-006", description: "Fictional example: a pathway light was reported out.", incidentCategory: "Other Safety Concern", latitude: 37.333, longitude: -121.8835, locationLabel: "Fictional demo — Washington Square", incidentDate: "2025-03-20", incidentTime: "16:05", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-007", description: "Fictional example: an item was reported missing from a parked vehicle.", incidentCategory: "Theft from Vehicle", latitude: 37.331, longitude: -121.8769, locationLabel: "Fictional demo — Campus Village", incidentDate: "2025-03-21", incidentTime: "22:40", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-008", description: "Fictional example: a wallet was reported missing after a transit trip.", incidentCategory: "Lost Property", latitude: 37.3363, longitude: -121.8882, locationLabel: "Fictional demo — Downtown transit area", incidentDate: "2025-03-23", incidentTime: "07:50", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-009", description: "Fictional example: damage to a parked vehicle was described.", incidentCategory: "Vandalism of Vehicle", latitude: 37.335, longitude: -121.8786, locationLabel: "Fictional demo — SJSU east campus walkway", incidentDate: "2025-03-24", incidentTime: "11:25", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-010", description: "Fictional example: a student reported a suspicious account notification.", incidentCategory: "Identity Theft", latitude: 37.3326, longitude: -121.8803, locationLabel: "Fictional demo — Paseo de San Carlos", incidentDate: "2025-03-25", incidentTime: "15:35", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-011", description: "Fictional example: a reusable bottle was left behind.", incidentCategory: "Lost Property", latitude: 37.33632, longitude: -121.8801, locationLabel: "Fictional demo — Student Union area", incidentDate: "2025-03-26", incidentTime: "10:05", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-012", description: "Fictional example: a sign along a walkway was found scratched. The reporter did not see who caused the damage or know when it happened.", incidentCategory: "Vandalism", latitude: 37.33675, longitude: -121.8809, locationLabel: "Fictional demo — Central campus walkway", incidentDate: "2025-03-27", incidentTime: "21:15", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-013", description: "Fictional example: someone asked for help after feeling faint in an outdoor gathering space. Staff were notified; no diagnosis or outcome is implied.", incidentCategory: "Medical Concern", latitude: 37.336, longitude: -121.8811, locationLabel: "Fictional demo — Central campus plaza", incidentDate: "2025-03-28", incidentTime: "13:40", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-014", description: "Fictional example: a bicycle accessory was missing when its owner returned to a rack. The bicycle itself remained there.", incidentCategory: "Theft", latitude: 37.3357, longitude: -121.8835, locationLabel: "Fictional demo — West campus edge", incidentDate: "2025-03-29", incidentTime: "17:20", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-015", description: "Fictional example: a pedestrian described repeated unwelcome remarks while walking past the library area. They could not identify the person involved.", incidentCategory: "Harassment", latitude: 37.33535, longitude: -121.88435, locationLabel: "Fictional demo — Library-area sidewalk", incidentDate: "2025-03-30", incidentTime: "19:05", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-016", description: "Fictional example: a person noticed an unattended bag near a pathway and informed staff. This example does not claim an actual threat.", incidentCategory: "Suspicious Activity", latitude: 37.33505, longitude: -121.8839, locationLabel: "Fictional demo — West campus pathway", incidentDate: "2025-03-31", incidentTime: "08:30", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-017", description: "Fictional example: a public-facing fixture was found with chipped glass. The time and cause of the damage were unknown.", incidentCategory: "Property Damage", latitude: 37.33648, longitude: -121.8933, locationLabel: "Fictional demo — Downtown north plaza", incidentDate: "2025-04-01", incidentTime: "11:10", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-018", description: "Fictional example: a cardholder noticed an unfamiliar small purchase after visiting the area. They checked their transaction history and contacted their card provider; the cause was not established.", incidentCategory: "Fraudulent Use of Credit/Debit Card", latitude: 37.33695, longitude: -121.89422, locationLabel: "Fictional demo — Downtown west blocks", incidentDate: "2025-04-02", incidentTime: "16:35", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-019", description: "Fictional example: two cyclists described a minor collision near a crossing. Neither reported an injury.", incidentCategory: "Non-Injury Traffic Accident", latitude: 37.3327, longitude: -121.8822, locationLabel: "Fictional demo — South campus edge", incidentDate: "2025-04-03", incidentTime: "09:05", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-020", description: "Fictional example: graffiti was noticed on a wall. The reporter did not know when it appeared.", incidentCategory: "Vandalism", latitude: 37.3324, longitude: -121.883, locationLabel: "Fictional demo — South campus walkway", incidentDate: "2025-04-04", incidentTime: "07:45", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-021", description: "Fictional example: a student described unwanted messages and asked staff where to document them. The reporter did not identify a suspect, and no conclusion was reached.", incidentCategory: "Harassing Communications", latitude: 37.33535, longitude: -121.87815, locationLabel: "Fictional demo — East campus plaza", incidentDate: "2025-04-05", incidentTime: "15:25", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-022", description: "Fictional example: a car window was found damaged and a bag was missing from a parked vehicle. The time of the damage was unknown.", incidentCategory: "Theft from Vehicle", latitude: 37.3348, longitude: -121.87765, locationLabel: "Fictional demo — East campus area", incidentDate: "2025-04-06", incidentTime: "22:00", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-023", description: "Fictional example: a parked car mirror was found damaged. No one reported seeing the damage occur.", incidentCategory: "Vandalism of Vehicle", latitude: 37.33015, longitude: -121.886, locationLabel: "Fictional demo — Downtown south block", incidentDate: "2025-04-07", incidentTime: "14:10", locationSource: "manual", locationConfirmed: true },
  { id: "DEMO-024", description: "Fictional example: several lamps along a walkway were described as dim. This sample illustrates reporting an environmental concern, not a documented hazard.", incidentCategory: "Other Safety Concern", latitude: 37.32995, longitude: -121.8857, locationLabel: "Fictional demo — South First corridor", incidentDate: "2025-04-08", incidentTime: "20:25", locationSource: "manual", locationConfirmed: true },
].map(report => {
  const createdAt = new Date(`${report.incidentDate}T${report.incidentTime}:00`);
  return {
    ...report,
    anonymous: true,
    reporterRole: "student",
    status: "approved",
    isDemo: true,
    source: "demo",
    priority: "Normal",
    analystNotes: "Fictional demonstration record; pre-approved map example.",
    createdAt,
    updatedAt: createdAt,
    moderatedAt: createdAt,
  };
});

const pendingDemoReports: SeedReport[] = [
  {
    id: "DEMO-REVIEW-001",
    description: "Fictional demo report: a bicycle accessory was reported missing from a campus rack. This example does not describe a real incident.",
    incidentCategory: "Lost Property",
    latitude: 37.3359,
    longitude: -121.8816,
    locationLabel: "Fictional demo — SJSU campus bicycle rack",
    locationSource: "manual",
    locationConfirmed: true,
    incidentTime: "09:10",
    imageUrl: "/api/safemap/demo-images/bicycle.svg",
    anonymous: false,
    reporterDisplayName: "Fictional Demo Reporter A",
    reporterRole: "student",
  },
  {
    id: "DEMO-REVIEW-002",
    description: "Fictional demo report: a small piece of glass was noticed near a walkway. The source is unknown; no injury is implied.",
    incidentCategory: "Property Damage",
    latitude: 37.3347,
    longitude: -121.8828,
    locationLabel: "Fictional demo — SJSU campus walkway",
    locationSource: "manual",
    locationConfirmed: true,
    incidentTime: "11:35",
    anonymous: true,
    reporterRole: "student",
  },
  {
    id: "DEMO-REVIEW-003",
    description: "Fictional demo report: a campus path was described as needing a routine maintenance check. No immediate hazard is asserted.",
    incidentCategory: "Other Safety Concern",
    latitude: 37.3371,
    longitude: -121.8794,
    locationLabel: "Fictional demo — SJSU campus path",
    locationSource: "manual",
    locationConfirmed: true,
    incidentTime: "13:20",
    imageUrl: "/api/safemap/demo-images/glass.svg",
    anonymous: false,
    reporterDisplayName: "Fictional Demo Reporter B",
    reporterRole: "student",
  },
  {
    id: "DEMO-REVIEW-004",
    description: "Fictional demo report: two maintenance carts lightly bumped near the courtyard, briefly obstructing the passage. No injuries were reported. This is an invented example.",
    incidentCategory: "Non-Injury Traffic Accident",
    latitude: 37.3334,
    longitude: -121.8799,
    locationLabel: "Fictional demo — SJSU campus courtyard",
    locationSource: "manual",
    locationConfirmed: true,
    incidentTime: "15:45",
    anonymous: true,
    reporterRole: "student",
  },
  {
    id: "DEMO-REVIEW-005",
    description: "Fictional demo report: markings were noticed on a wall beside a campus pathway and referred for cleanup. No person is identified and no real vandalism is being reported.",
    incidentCategory: "Vandalism",
    latitude: 37.3342,
    longitude: -121.8852,
    locationLabel: "Fictional demo — SJSU campus pathway",
    locationSource: "manual",
    locationConfirmed: true,
    incidentTime: "18:05",
    imageUrl: "/api/safemap/demo-images/walkway.svg",
    anonymous: false,
    reporterDisplayName: "Fictional Demo Reporter C",
    reporterRole: "resident",
  },
];

const now = new Date();
const incidentDate = now.toISOString().slice(0, 10);
const currentDateDemos = pendingDemoReports.map(report => ({
  ...report,
  incidentDate,
  status: "pending" as const,
  isDemo: true,
  source: "demo",
  priority: "Normal",
  analystNotes: "Fictional demonstration record; awaiting review.",
  createdAt: now,
  updatedAt: now,
  moderatedAt: now,
}));

try {
  await updateLegacySamples();
  const seeded = await db
    .insert(reportsTable)
    .values([
      ...[...sampleReports, ...currentDateDemos].map((report, index) => ({
        ...report, id: `SJSU-${String(index + 1).padStart(4, "0")}`, status: "approved" as const,
        locationLabel: cleanSampleText(report.locationLabel),
        description: cleanSampleText(report.description),
        reporterDisplayName: report.reporterDisplayName ? cleanSampleText(report.reporterDisplayName) : null,
        analystNotes: "", reviewedBy: "Analyst",
      })),
      ...pendingSamples,
    ])
    .onConflictDoNothing()
    .returning({ id: reportsTable.id });
  console.log(`SafeMap seed complete: inserted ${seeded.length} of 29 fictional demo reports.`);
} finally {
  await pool.end();
}