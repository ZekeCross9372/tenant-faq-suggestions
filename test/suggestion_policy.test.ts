import assert from "node:assert/strict";
import test from "node:test";
import { chooseSuggestions } from "../src/suggestion_policy.js";

test("keeps the three strongest actionable FAQ matches and drops weak guesses", () => {
  const metadata = (question: string) => ({ question, answer: `${question} answer`, area: "admin-operations" });
  const result = chooseSuggestions([
    { id: "a", score: 0.94, metadata: metadata("Require SSO") },
    { id: "b", score: 0.88, metadata: metadata("Invite an admin") },
    { id: "c", score: 0.8004, metadata: metadata("Transfer ownership") },
    { id: "d", score: 0.79, metadata: metadata("Restore a member") },
    { id: "noise", score: 0.31, metadata: metadata("Export invoices") }
  ]);

  assert.deepEqual(result.map(({ id, confidence }) => ({ id, confidence })), [
    { id: "a", confidence: 0.94 },
    { id: "b", confidence: 0.88 },
    { id: "c", confidence: 0.8 }
  ]);
});
