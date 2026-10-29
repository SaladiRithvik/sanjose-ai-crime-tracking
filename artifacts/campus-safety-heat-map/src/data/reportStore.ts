import {
  createSafemapReport, listSafemapReports, requestSafemapUpload, updateSafemapReport,
  type SafemapChange, type SafemapSubmission,
} from '@workspace/api-client-react';
import type { ReportRecord } from './reports';

export async function loadReports(): Promise<ReportRecord[]> {
  return (await listSafemapReports()) as ReportRecord[];
}

async function uploadPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const type = blob.type;
  if ((type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') || blob.size > 5 * 1024 * 1024) {
    throw new Error('Unsupported photo.');
  }
  const { uploadURL, imageUrl } = await requestSafemapUpload({ contentType: type, size: blob.size });
  const put = await fetch(uploadURL, { method: 'PUT', headers: { 'Content-Type': type }, body: blob });
  if (!put.ok) throw new Error('Photo upload failed.');
  return imageUrl;
}

export async function submitReportToServer(submission: Omit<SafemapSubmission, 'image'>, photoDataUrl?: string): Promise<ReportRecord> {
  const image = photoDataUrl ? await uploadPhoto(photoDataUrl) : undefined;
  return (await createSafemapReport(image ? { ...submission, image } : submission)) as ReportRecord;
}

export async function changeReport(id: string, change: SafemapChange): Promise<ReportRecord> {
  return (await updateSafemapReport(id, change)) as ReportRecord;
}
