import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq, desc, isNull, inArray, sql } from "drizzle-orm";
import { db, reportsTable, reportUploadsTable } from "@workspace/db";
import {
  CreateSafemapSessionBody, CreateSafemapReportBody, UpdateSafemapReportBody,
  UpdateSafemapReportParams, ListSafemapReportsResponse,
  TriageSafemapReportBody,
} from "@workspace/api-zod";
import { establishSession, endSession, loadSafemapSession, requireAnalyst, requireReporter, limitPrototypeWrites } from "../lib/safemapSession";
import { reportResponse } from "../lib/reportResponse";
import { finalizeReportPhoto } from "../lib/reportPhoto";
import photosRouter from "./safemapPhotos";
import { triageDescription } from "../lib/reportTriage";

const router: IRouter = Router();
router.use("/safemap", loadSafemapSession, limitPrototypeWrites);
router.use(photosRouter);
router.get("/safemap/session", (req, res) => {
  res.set("Cache-Control", "no-store").json({ role: req.safemapSession?.role ?? null });
});
router.post("/safemap/session", async (req, res): Promise<void> => {
  const parsed = CreateSafemapSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid entry." }); return; }
  const { role, email, password } = parsed.data;
  // Keep the existing public demonstration credentials; do not label these as secure accounts.
  if ((role === "student" && (email?.trim().toLowerCase() !== "student@sjsu.edu" || password !== "demo123"))
    || (role === "analyst" && (email?.trim().toLowerCase() !== "analyst@sjsu.edu" || password !== "analyst123"))) {
    res.status(401).json({ error: "Credentials did not match." }); return;
  }
  await establishSession(req, res, role);
  res.set("Cache-Control", "no-store").json({ role });
});
router.delete("/safemap/session", async (req, res): Promise<void> => {
  await endSession(req, res);
  res.sendStatus(204);
});
// Shared credentials never grant access to another browser's private submissions.
const ownerKey = (req: import("express").Request) =>
  req.safemapOwnerHash;
router.post("/safemap/triage", requireReporter, async (req, res): Promise<void> => {
  const parsed = TriageSafemapReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid description." }); return; }
  const triage = await triageDescription(parsed.data.description, ownerKey(req)!);
  res.set("Cache-Control", "no-store").json({ triage });
});
router.get("/safemap/my-reports", requireReporter, async (req, res): Promise<void> => {
  const rows = await db.select().from(reportsTable).where(eq(reportsTable.ownerKey, ownerKey(req)!))
    .orderBy(desc(reportsTable.createdAt));
  res.set("Cache-Control", "no-store").json(rows.map(row => reportResponse(row, true)));
});
router.get("/safemap/reports", async (req, res): Promise<void> => {
  const analyst = req.safemapSession?.role === "analyst";
  const rows = await db.select().from(reportsTable)
    .where(analyst ? undefined : and(eq(reportsTable.status, "approved"), isNull(reportsTable.resolvedAt),
      eq(reportsTable.locationConfirmed, true),
      sql`trim(${reportsTable.locationLabel}) <> '' AND ${reportsTable.latitude} BETWEEN -90 AND 90 AND ${reportsTable.longitude} BETWEEN -180 AND 180 AND NOT (${reportsTable.latitude} = 0 AND ${reportsTable.longitude} = 0)`))
    .orderBy(desc(reportsTable.createdAt), desc(reportsTable.id));
  res.set("Cache-Control", "no-store").json(ListSafemapReportsResponse.parse(rows.map(row => reportResponse(row, analyst))));
});
router.post("/safemap/reports", requireReporter, async (req, res): Promise<void> => {
  const parsed = CreateSafemapReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid report. Check the report fields." }); return; }
  const data = parsed.data;
  if (!data.locationConfirmed || (!data.description.trim() && !data.image) || !data.location.trim()
    || (data.incidentDate && (!/^\d{4}-\d{2}-\d{2}$/.test(data.incidentDate) || Number.isNaN(Date.parse(data.incidentDate))))
    || (data.incidentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.incidentTime))) {
    res.status(400).json({ error: "Confirm the location and enter valid report details." }); return;
  }
  if (data.image) {
    const [upload] = await db.select().from(reportUploadsTable).where(and(
      eq(reportUploadsTable.imageUrl, data.image), eq(reportUploadsTable.ownerHash, req.safemapSession!.tokenHash),
    ));
    if (!upload) { res.status(400).json({ error: "Invalid photo reference." }); return; }
    try { await finalizeReportPhoto(upload); }
    catch (error) {
      if (error instanceof Error && error.message === "PHOTO_INVALID") { res.status(400).json({ error: "The photo upload is incomplete or invalid." }); return; }
      throw error;
    }
  }
  const triage = await triageDescription(data.description, ownerKey(req)!);
  const urgent = data.urgent === true || triage?.urgency === "Emergency";
  const [row] = await db.insert(reportsTable).values({
    id: `SJSU-${randomUUID()}`, description: data.description.trim(), incidentCategory: data.incidentType,
    latitude: data.coordinates.latitude, longitude: data.coordinates.longitude,
    locationLabel: data.location.trim(), locationSource: data.locationSource,
    locationAddress: data.locationSource === "address" ? data.locationAddress : null,
    locationConfirmed: true, incidentDate: data.incidentDate, incidentTime: data.incidentTime,
    imageUrl: data.image || null, anonymous: data.privacyMode === "anonymous",
    reporterDisplayName: data.privacyMode === "identified" ? data.displayName?.trim() || null : null,
    reporterRole: req.safemapSession!.role, status: "pending", isDemo: false, source: "user",
    ownerKey: ownerKey(req), urgent, priority: urgent ? "Critical" : "Normal", triage,
  }).returning();
  res.status(201).json(reportResponse(row, true));
});
router.patch("/safemap/reports/:id", requireAnalyst, async (req, res): Promise<void> => {
  const params = UpdateSafemapReportParams.safeParse(req.params);
  const body = UpdateSafemapReportBody.safeParse(req.body);
  if (!params.success || !body.success || !Object.keys(body.data).length) {
    res.status(400).json({ error: "Invalid report change." }); return;
  }
  const change = body.data;
  if (change.resolved === true) {
    if (Object.keys(change).some(key => key !== "resolved" && key !== "resolutionNote")) {
      res.status(400).json({ error: "Resolution must be separate from reviewing or editing a report." }); return;
    }
    const [row] = await db.update(reportsTable).set({
      resolvedAt: new Date(), resolvedBy: "analyst@sjsu.edu",
      resolutionNote: change.resolutionNote?.trim() ?? "", updatedAt: new Date(),
    }).where(and(eq(reportsTable.id, params.data.id),
      inArray(reportsTable.status, ["pending", "approved", "denied"]),
      isNull(reportsTable.resolvedAt))).returning();
    if (!row) { res.status(409).json({ error: "Only reviewed, unresolved reports can be resolved. Refresh and try again." }); return; }
    res.json(reportResponse(row, true)); return;
  }
  if (change.resolutionNote !== undefined) {
    res.status(400).json({ error: "Resolution notes require marking the report resolved." }); return;
  }
  if (change.moderationStatus === "denied" && !["Resolved", "False Report", "Missing Critical Information", "Duplicate Report", "Other", "Spam", "Duplicate", "Not enough detail"].includes(change.moderationReason ?? "")) {
    res.status(400).json({ error: "Choose a denial reason." }); return;
  }
  if (change.description !== undefined && !change.description.trim()) { res.status(400).json({ error: "Description cannot be blank." }); return; }
  if (change.moderationStatus === "removed" && (change.description !== undefined || change.priorityStatus !== undefined)) {
    res.status(400).json({ error: "Removal cannot change report contents." }); return;
  }
  const requiredStatus = change.moderationStatus === "removed" ? "approved" : "pending";
  if (change.moderationStatus === "approved") {
    const [candidate] = await db.select().from(reportsTable).where(eq(reportsTable.id, params.data.id));
    if (!candidate || !candidate.locationConfirmed || !candidate.locationLabel.trim()
      || !Number.isFinite(candidate.latitude) || !Number.isFinite(candidate.longitude)
      || Math.abs(candidate.latitude) > 90 || Math.abs(candidate.longitude) > 180
      || (candidate.latitude === 0 && candidate.longitude === 0)) {
      res.status(400).json({ error: "A confirmed valid location is required before approval." }); return;
    }
  }
  // Conditional UPDATE is atomic: stale reviewers cannot undo another analyst's decision.
  const [row] = await db.update(reportsTable).set({
    ...(change.moderationStatus === "denied" ? {
      resolvedAt: new Date(), resolvedBy: "analyst@sjsu.edu",
      resolutionNote: change.moderationReason || "False Report",
    } : {}),
    ...(change.moderationStatus ? {
      status: change.moderationStatus,
      analystNotes: change.moderationReason || `${change.moderationStatus} by analyst.`,
      moderatedAt: new Date(),
      reviewedBy: "analyst@sjsu.edu",
      analystComment: change.analystComment?.trim() ?? "",
    } : {}),
    ...(change.description !== undefined ? { description: change.description.trim() } : {}),
    ...(change.priorityStatus ? { priority: change.priorityStatus } : {}),
    updatedAt: new Date(),
  }).where(and(eq(reportsTable.id, params.data.id), eq(reportsTable.status, requiredStatus), isNull(reportsTable.resolvedAt))).returning();
  if (!row) { res.status(409).json({ error: "This report was already reviewed or removed. Refresh and try again." }); return; }
  res.json(reportResponse(row, true));
});
export default router;