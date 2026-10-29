import { createHash, randomBytes } from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, prototypeSessionsTable } from "@workspace/db";

export type PrototypeRole = "student" | "analyst" | "resident" | "viewer";
export type PrototypeSession = { tokenHash: string; role: PrototypeRole };
declare global {
  namespace Express {
    interface Request { safemapSession?: PrototypeSession; safemapOwnerHash?: string }
  }
}
const cookieName = "safemap_session";
const maxAge = 24 * 60 * 60 * 1000;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function loadSafemapSession(req: Request, res: Response, next: NextFunction) {
  try {
    // Ownership is private to this browser, even though sign-in credentials are shared.
    let owner = req.cookies?.safemap_report_owner;
    if (typeof owner !== "string" || !/^[a-f0-9]{64}$/.test(owner)) {
      owner = randomBytes(32).toString("hex");
      res.cookie("safemap_report_owner", owner, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
        path: "/api/safemap", maxAge: 90 * maxAge,
      });
    }
    req.safemapOwnerHash = hashToken(`report-owner:${owner}`);
    const token = req.cookies?.[cookieName];
    if (typeof token === "string" && /^[a-f0-9]{64}$/.test(token)) {
      const [session] = await db.select().from(prototypeSessionsTable).where(and(
        eq(prototypeSessionsTable.tokenHash, hashToken(token)),
        gt(prototypeSessionsTable.expiresAt, new Date()),
      ));
      if (session) req.safemapSession = { tokenHash: session.tokenHash, role: session.role as PrototypeRole };
    }
    next();
  } catch (error) { next(error); }
}
export async function establishSession(req: Request, res: Response, role: PrototypeRole) {
  if (req.safemapSession) await db.delete(prototypeSessionsTable).where(eq(prototypeSessionsTable.tokenHash, req.safemapSession.tokenHash));
  await db.delete(prototypeSessionsTable).where(lt(prototypeSessionsTable.expiresAt, new Date()));
  const token = randomBytes(32).toString("hex");
  await db.insert(prototypeSessionsTable).values({ tokenHash: hashToken(token), role, expiresAt: new Date(Date.now() + maxAge) });
  res.cookie(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/safemap", maxAge });
}
export async function endSession(req: Request, res: Response) {
  if (req.safemapSession) await db.delete(prototypeSessionsTable).where(eq(prototypeSessionsTable.tokenHash, req.safemapSession.tokenHash));
  res.clearCookie(cookieName, { path: "/api/safemap", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}
export function requireAnalyst(req: Request, res: Response, next: NextFunction) {
  if (req.safemapSession?.role !== "analyst") { res.status(403).json({ error: "Analyst access is required." }); return; }
  next();
}
export function requireReporter(req: Request, res: Response, next: NextFunction) {
  if (!["student", "resident"].includes(req.safemapSession?.role ?? "")) { res.status(403).json({ error: "Choose a reporting entry option before submitting." }); return; }
  next();
}

// This preserves the explicitly simulated login, not production identity/SSO.
const windows = new Map<string, { count: number; until: number }>();
export function limitPrototypeWrites(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  if (req.get("sec-fetch-site") === "cross-site") { res.status(403).json({ error: "Cross-site changes are not allowed." }); return; }
  const origin = req.get("origin");
  if (origin) {
    const hosts = [req.get("host"), req.get("x-forwarded-host")].filter(Boolean).map(host => host!.split(",")[0].trim());
    try { if (!hosts.includes(new URL(origin).host)) { res.status(403).json({ error: "Invalid request origin." }); return; } }
    catch { res.status(403).json({ error: "Invalid request origin." }); return; }
  }
  const key = req.safemapSession?.tokenHash ?? req.ip ?? "unknown";
  const now = Date.now();
  if (windows.size > 10000) for (const [id, window] of windows) if (window.until < now) windows.delete(id);
  const window = windows.get(key);
  if (!window || window.until < now) windows.set(key, { count: 1, until: now + 60000 });
  else if (++window.count > 60) { res.status(429).json({ error: "Too many changes. Please try again in a minute." }); return; }
  next();
}