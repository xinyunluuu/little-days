import test from "node:test";
import assert from "node:assert/strict";
import { parseAssistantReply, buildProposal } from "../src/ai.js";
const entry = () => ({
  id: "one",
  date: "2026-10-31",
  title: "今天",
  body: "真实的日常",
  mood: "calm",
  template: "salt",
  paper: "cream",
  createdAt: "2026-10-31T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
  elements: [],
});
test("model prose and fenced JSON are treated as text/data, never HTML", () => {
  assert.equal(
    parseAssistantReply("<script>bad()</script>").reply,
    "<script>bad()</script>",
  );
  assert.deepEqual(
    parseAssistantReply(
      '```json\n{"reply":"你好","proposal":{"title":"秋天"}}\n```',
    ),
    { reply: "你好", proposal: { title: "秋天" } },
  );
  assert.throws(() => parseAssistantReply("  "));
});
test("AI proposal cannot inject remote photos, unsafe colors or invalid models", () => {
  assert.throws(() =>
    buildProposal(entry(), {
      add: [{ type: "photo", src: "https://evil.test" }],
    }),
  );
  assert.throws(() =>
    buildProposal(entry(), { add: [{ type: "tape", color: "url(evil)" }] }),
  );
  assert.throws(() => buildProposal(entry(), { template: "__proto__" }));
});
test("proposal applies to a copy with constrained geometry and safe original sticker", () => {
  const original = entry();
  const next = buildProposal(original, {
    title: "秋日散步",
    paper: "sage",
    add: [{ type: "sticker", sticker: "leaf", x: 9999, w: 100, h: 100 }],
    layout: { title: { fontSize: 28, x: 40, y: 170, w: 500, h: 70 } },
  });
  assert.equal(original.title, "今天");
  assert.equal(original.elements.length, 0);
  assert.equal(next.title, "秋日散步");
  assert.equal(next.elements[0].x, 704);
  assert.equal(next.layout.title.fontSize, 28);
});

test("named AI paper and template choices replace an old custom paper color", () => {
  const original = { ...entry(), paperColor: "#ffffff" };
  assert.equal(
    buildProposal(original, { paper: "sage" }).paperColor,
    undefined,
  );
  assert.equal(
    buildProposal(original, { template: "film" }).paperColor,
    undefined,
  );
  assert.equal(
    buildProposal(original, { paper: "sage", paperColor: "#ffeecc" })
      .paperColor,
    "#ffeecc",
  );
});
