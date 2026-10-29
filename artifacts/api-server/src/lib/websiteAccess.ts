import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type Request, type RequestHandler } from "express";
import { UnlockWebsiteBody } from "@workspace/api-zod";

type AccessConfig = { password: string; signingKey: string; secure: boolean };
const COOKIE = "safemap_site_access";
const LIFETIME = 8 * 60 * 60 * 1000;
const cookieOptions = (secure: boolean) => ({
  httpOnly: true, sameSite: secure ? "none" as const : "lax" as const, secure, path: "/api",
});
const digest = (text: string) => createHash("sha256").update(text).digest();
const sign = (payload: string, config: AccessConfig) => createHmac("sha256", config.signingKey)
  .update("safemap-website-access-v1\0").update(config.password).update("\0").update(payload).digest("base64url");

export function issueWebsiteAccess(config: AccessConfig, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({
    expires: now + LIFETIME, nonce: randomBytes(32).toString("hex"),
  })).toString("base64url");
  return `${payload}.${sign(payload, config)}`;
}

export function hasWebsiteAccess(token: unknown, config: AccessConfig | undefined, now = Date.now()): boolean {
  if (!config || typeof token !== "string" || token.length > 512) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const supplied = Buffer.from(signature, "base64url");
  const expected = Buffer.from(sign(payload, config), "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isSafeInteger(data.expires) && data.expires > now && data.expires <= now + LIFETIME
      && typeof data.nonce === "string" && /^[a-f0-9]{64}$/.test(data.nonce);
  } catch { return false; }
}

function sameOrigin(req: Request): boolean {
  if (req.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return [req.get("host"), req.get("x-forwarded-host")]
      .some(value => value?.split(",")[0].trim() === host);
  } catch { return false; }
}

function environmentConfig(): AccessConfig | undefined {
  const password = process.env.SITE_ACCESS_PASSWORD;
  const signingKey = process.env.SESSION_SECRET;
  if (!password || !signingKey) return undefined; // Never unlock when configuration is missing.
  return { password, signingKey, secure: process.env.NODE_ENV === "production" };
}

export function createWebsiteAccessGate(getConfig: () => AccessConfig | undefined = environmentConfig) {
  const router = Router();
  const attempts = new Map<string, { count: number; until: number }>();
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.get("/site-access", (req, res) => {
    res.json({ unlocked: hasWebsiteAccess(req.cookies?.[COOKIE], getConfig()) });
  });
  router.post("/site-access", (req, res) => {
    if (!sameOrigin(req)) { res.status(403).json({ error: "Cross-site access requests are not allowed." }); return; }
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.ip ?? "unknown";
    const attempt = attempts.get(key) ?? { count: 0, until: now + 5 * 60 * 1000 };
    if (attempt.count >= 10 || !attempts.has(key) && attempts.size >= 10_000) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((attempt.until - now) / 1000))));
      res.status(429).json({ error: "Too many password attempts. Please try again in five minutes." }); return;
    }
    const config = getConfig();
    if (!config) { res.status(503).json({ error: "Website access is not configured yet. Please contact the site owner." }); return; }
    const parsed = UnlockWebsiteBody.safeParse(req.body);
    attempt.count++;
    attempts.set(key, attempt);
    if (!parsed.success) { res.status(400).json({ error: "Enter a valid password." }); return; }
    if (!timingSafeEqual(digest(parsed.data.password), digest(config.password))) {
      res.status(401).json({ error: "Incorrect password. Please try again." }); return;
    }
    attempts.delete(key);
    res.cookie(COOKIE, issueWebsiteAccess(config), { ...cookieOptions(config.secure || req.secure), maxAge: LIFETIME });
    res.json({ unlocked: true });
  });
  router.delete("/site-access", (req, res) => {
    if (!sameOrigin(req)) { res.status(403).json({ error: "Cross-site access requests are not allowed." }); return; }
    res.clearCookie(COOKIE, cookieOptions(process.env.NODE_ENV === "production" || req.secure));
    res.status(204).end();
  });
  const requireAccess: RequestHandler = (req, res, next) => {
    if (req.path === "/healthz" && ["GET", "HEAD"].includes(req.method)) { next(); return; }
    if (hasWebsiteAccess(req.cookies?.[COOKIE], getConfig())) { next(); return; }
    res.status(401).json({ error: "Enter the website password before using this site.", code: "WEBSITE_LOCKED" });
  };
  return { router, requireAccess };
}