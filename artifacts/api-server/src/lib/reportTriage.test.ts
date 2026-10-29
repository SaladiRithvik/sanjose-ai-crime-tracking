import { test } from "node:test";
import assert from "node:assert/strict";
import { triageDescription } from "./reportTriage";

const suggestion = {
  urgency: "Emergency", incidentType: "Medical Concern", severity: "High",
  mentionedLocation: "Student Union", mentionedTime: "right now", spamLikelihood: "Low",
  spamReason: "A safety concern.", summary: "Someone needs immediate help.", suggestedDecision: "Review",
};
const response = (value: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }));

test("AI errors and malformed results become explicit unavailable results", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("Provider unavailable"); };
    assert.equal(await triageDescription("A concern", "failure-test"), null);
    globalThis.fetch = async () => response({ urgency: "Emergency" });
    assert.equal(await triageDescription("A concern", "invalid-test"), null);
    globalThis.fetch = async () => response({ ...suggestion, incidentType: "Invented category" });
    assert.equal(await triageDescription("A concern", "category-test"), null);
  } finally { globalThis.fetch = original; }
});

test("validated results are cached only for the same owner and final description", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return response(suggestion); };
    assert.deepEqual(await triageDescription("Help now", "owner-one"), suggestion);
    assert.deepEqual(await triageDescription("Help now", "owner-one"), suggestion);
    assert.equal(calls, 1);
    await triageDescription("Help now", "owner-two");
    await triageDescription("Changed final text", "owner-one");
    assert.equal(calls, 3);
    assert.equal(await triageDescription("", "photo-only-owner"), null);
  } finally { globalThis.fetch = original; }
});