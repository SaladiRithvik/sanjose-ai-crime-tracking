import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { createWebsiteAccessGate, hasWebsiteAccess, issueWebsiteAccess } from "./websiteAccess";

const fixture = { password: "test-only-password", signingKey: "test-only-signing-key", secure: false };

test("website tokens are authenticated, expire, and are invalidated by credential rotation", () => {
  const now = 1_000_000;
  const token = issueWebsiteAccess(fixture, now);
  assert.ok(hasWebsiteAccess(token, fixture, now + 1));
  assert.ok(!hasWebsiteAccess(token, undefined, now));
  assert.ok(!hasWebsiteAccess(token, fixture, now + 8 * 60 * 60 * 1000));
  assert.ok(!hasWebsiteAccess(token, { ...fixture, password: "different-test-password" }, now));
  assert.ok(!hasWebsiteAccess(token, { ...fixture, signingKey: "different-test-key" }, now));
  assert.ok(!hasWebsiteAccess(token.slice(0, -1), fixture, now));
  assert.ok(!hasWebsiteAccess(`${token}.extra`, fixture, now));
  for (const malformed of [null, "", "fake", "{}", "x".repeat(1000)]) {
    assert.ok(!hasWebsiteAccess(malformed, fixture, now));
  }
});

test("the HTTP gate blocks feature routes, allows health, rejects bad passwords and protects a restored session", async () => {
  let config: typeof fixture | undefined = fixture;
  const gate = createWebsiteAccessGate(() => config);
  const app = express();
  app.use(cookieParser(), express.json());
  app.use("/api", gate.router, gate.requireAccess);
  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/safemap/reports", (_req, res) => res.json([{ test: true }]));
  app.post("/api/safemap/session", (_req, res) => res.json({ role: "viewer" }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const root = `http://127.0.0.1:${address.port}/api`;
  const post = (password: string, headers: Record<string, string> = {}) => fetch(`${root}/site-access`, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ password }),
  });
  try {
    assert.equal((await fetch(`${root}/healthz`)).status, 200);
    assert.deepEqual(await (await fetch(`${root}/site-access`)).json(), { unlocked: false });
    assert.equal((await fetch(`${root}/safemap/reports`)).status, 401);
    assert.equal((await fetch(`${root}/safemap/session`, { method: "POST" })).status, 401);
    assert.equal((await post(fixture.password, { Origin: "https://another-site.test" })).status, 403);
    assert.equal((await post("wrong-test-password")).status, 401);
    const unlocked = await post(fixture.password);
    assert.equal(unlocked.status, 200);
    const setCookie = unlocked.headers.get("set-cookie")!;
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Path=\/api/i);
    const cookie = setCookie.split(";")[0];
    const headers = { Cookie: cookie };
    assert.deepEqual(await (await fetch(`${root}/site-access`, { headers })).json(), { unlocked: true });
    assert.equal((await fetch(`${root}/safemap/reports`, { headers })).status, 200);
    assert.equal((await fetch(`${root}/safemap/reports`, { headers: { Cookie: "safemap_site_access=forged" } })).status, 401);
    assert.equal((await fetch(`${root}/site-access`, { method: "DELETE", headers })).status, 204);
    config = undefined;
    assert.equal((await post(fixture.password)).status, 503);
    assert.equal((await fetch(`${root}/safemap/reports`, { headers })).status, 401);
    config = fixture;
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await post("wrong-test-password")).status, 401);
    assert.equal((await post("wrong-test-password")).status, 429);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});