import { eq } from "drizzle-orm";
import { db, reportUploadsTable } from "@workspace/db";
import { ObjectStorageService } from "./objectStorage";

/** Validate and copy staged bytes to an immutable path before analyst review. */
export async function finalizeReportPhoto(upload: typeof reportUploadsTable.$inferSelect) {
  const service = new ObjectStorageService();
  const file = await service.getObjectEntityFile(upload.objectPath);
  const [metadata] = await file.getMetadata();
  if (Number(metadata.size) !== upload.size || metadata.contentType !== upload.contentType) {
    throw new Error("PHOTO_INVALID");
  }
  const [bytes] = await file.download();
  const valid = upload.contentType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : upload.contentType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new Error("PHOTO_INVALID");
  if (upload.objectPath.includes("/uploads/")) {
    const targetName = file.name.replace("/uploads/", "/reports/");
    await file.copy(file.bucket.file(targetName));
    await db.update(reportUploadsTable).set({ objectPath: upload.objectPath.replace("/uploads/", "/reports/") })
      .where(eq(reportUploadsTable.imageUrl, upload.imageUrl));
  }
}