import { Router, type IRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, reportsTable, reportUploadsTable } from "@workspace/db";
import { RequestSafemapUploadBody, RequestSafemapUploadResponse } from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import { requireReporter } from "../lib/safemapSession";
import { demoIllustration } from "../data/demoIllustrations";

const router: IRouter = Router();
const storage = new ObjectStorageService();
router.get("/safemap/demo-images/:name", (req, res) => {
  const name = String(req.params.name).replace(/\.svg$/, "");
  const svg = demoIllustration(name);
  if (!svg) { res.sendStatus(404); return; }
  res.set({ "Content-Type": "image/svg+xml", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600" }).send(svg);
});
router.post("/safemap/uploads", requireReporter, async (req, res): Promise<void> => {
  const parsed = RequestSafemapUploadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a JPG, PNG or WEBP image up to 5 MB." }); return; }
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  const id = objectPath.split("/").at(-1)!;
  const imageUrl = `/api/safemap/photos/${id}`;
  await db.insert(reportUploadsTable).values({
    imageUrl, objectPath, ownerHash: req.safemapSession!.tokenHash,
    contentType: parsed.data.contentType, size: parsed.data.size,
  });
  res.set("Cache-Control", "no-store").json(RequestSafemapUploadResponse.parse({ uploadURL, imageUrl }));
});
router.get("/safemap/photos/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id);
  if (!/^[a-f0-9-]{36}$/.test(id)) { res.sendStatus(404); return; }
  const imageUrl = `/api/safemap/photos/${id}`;
  const [upload] = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.imageUrl, imageUrl));
  if (!upload) { res.sendStatus(404); return; }
  const isReviewer = req.safemapSession?.role === "analyst";
  const isOwner = req.safemapSession?.tokenHash === upload.ownerHash;
  if (!isReviewer && !isOwner) {
    const [publicReport] = await db.select({ id: reportsTable.id }).from(reportsTable).where(and(
      eq(reportsTable.imageUrl, imageUrl), eq(reportsTable.status, "approved"), eq(reportsTable.anonymous, false),
      isNull(reportsTable.resolvedAt),
    ));
    if (!publicReport) { res.sendStatus(404); return; }
  }
  const file = await storage.getObjectEntityFile(upload.objectPath);
  res.set({ "Content-Type": upload.contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
  file.createReadStream().on("error", error => {
    req.log.error({ errorType: error.name }, "Could not stream report photo");
    if (!res.headersSent) res.sendStatus(503);
    else res.destroy();
  }).pipe(res);
});
export default router;