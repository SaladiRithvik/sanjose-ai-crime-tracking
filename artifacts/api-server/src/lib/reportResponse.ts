import { type StoredReport } from "@workspace/db";
import { CreateSafemapReportResponse } from "@workspace/api-zod";

export function reportResponse(row: StoredReport, analyst = false) {
  const privateDetails = analyst || row.isDemo || !row.anonymous;
  const validCoordinates = Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
    && Math.abs(row.latitude) <= 90 && Math.abs(row.longitude) <= 180
    && !(row.latitude === 0 && row.longitude === 0);
  // Invalid legacy coordinates remain unchanged in storage. The response explicitly
  // marks them unconfirmed and labels the error; (0,0) is a non-mappable sentinel.
  return CreateSafemapReportResponse.parse({
    urgent: row.urgent,
    ...(analyst ? { triage: row.triage ?? null, analystComment: row.analystComment, reviewedBy: row.reviewedBy } : {}),
    id: row.id,
    isDemo: row.isDemo,
    reporterType: analyst ? row.reporterRole : "resident",
    privacyMode: row.anonymous ? "anonymous" : "identified",
    ...(analyst && !row.anonymous && row.reporterDisplayName ? { displayName: row.reporterDisplayName } : {}),
    ...(privateDetails && row.imageUrl ? { image: row.imageUrl } : {}),
    coordinates: validCoordinates ? { latitude: row.latitude, longitude: row.longitude } : { latitude: 0, longitude: 0 },
    locationSource: row.locationSource,
    ...(analyst && row.locationAddress ? { locationAddress: row.locationAddress } : {}),
    locationConfirmed: row.locationConfirmed && validCoordinates,
    location: !validCoordinates ? `Invalid location — coordinates require correction (${row.latitude}, ${row.longitude})`
      : privateDetails ? row.locationLabel : "Anonymous report location",
    incidentDate: row.incidentDate,
    incidentTime: row.incidentTime,
    description: privateDetails ? row.description : "Anonymous report; details withheld.",
    incidentType: row.incidentCategory,
    moderationStatus: row.status,
    priorityStatus: row.priority,
    moderationReason: analyst ? row.analystNotes : "",
    ...(row.moderatedAt ? { moderatedAt: row.moderatedAt.toISOString() } : {}),
    ...(row.resolvedAt ? { resolvedAt: row.resolvedAt.toISOString(),
      ...(analyst ? { resolvedBy: row.resolvedBy, resolutionNote: row.resolutionNote } : {}),
    } : {}),
    submittedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    source: row.source,
  });
}