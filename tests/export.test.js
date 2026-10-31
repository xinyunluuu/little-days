import test from "node:test";
import assert from "node:assert/strict";
import { assertTextFits, renderEntry, wrapText } from "../src/export.js";
import { STICKERS, stickerDataUrl } from "../src/art.js";

const fixedMeasure = {
  measureText: (text) => ({ width: Array.from(text).length * 10 }),
};

test("writing wraps at word boundaries, CJK glyphs and explicit paragraphs", () => {
  assert.deepEqual(wrapText(fixedMeasure, "today is lovely", 90), [
    "today is",
    "lovely",
  ]);
  assert.deepEqual(wrapText(fixedMeasure, "把日子过成喜欢的样子", 50), [
    "把日子过成",
    "喜欢的样子",
  ]);
  assert.deepEqual(wrapText(fixedMeasure, "a\r\n\r\nb", 100), ["a", "", "b"]);
  assert.deepEqual(wrapText(fixedMeasure, "abcdefgh", 30), [
    "abc",
    "def",
    "gh",
  ]);
});

test("grapheme wrapping does not split a composed emoji or combining character", () => {
  const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
  const ctx = {
    measureText: (text) => ({
      width: Array.from(segmenter.segment(text)).length * 10,
    }),
  };
  assert.deepEqual(wrapText(ctx, "👨‍👩‍👧‍👦e\u0301好", 10), ["👨‍👩‍👧‍👦", "e\u0301", "好"]);
});

test("strict text fitting preserves all writing or gives an actionable error", () => {
  assert.deepEqual(
    assertTextFits(fixedMeasure, "一二三四五六七八", 40, 2, "标题"),
    ["一二三四", "五六七八"],
  );
  assert.throws(
    () => assertTextFits(fixedMeasure, "一二三四五六七八九", 40, 2, "标题"),
    /标题.*缩短.*拆分/,
  );
  assert.throws(
    () =>
      assertTextFits(fixedMeasure, "一\n二\n三\n四\n五\n六", 400, 5, "正文"),
    /正文.*缩短.*拆分/,
  );
  assert.throws(() => assertTextFits(fixedMeasure, "好", 5, 1), /超出/);
});

test("each original sticker produces an embedded SVG; unknown stickers fail clearly", () => {
  assert.equal(Object.keys(STICKERS).length, 8);
  for (const [key, sticker] of Object.entries(STICKERS)) {
    assert.match(sticker.svg, /viewBox="0 0 180 180"/);
    assert.equal(
      decodeURIComponent(stickerDataUrl(key).split(",").slice(1).join(",")),
      sticker.svg,
    );
    assert.doesNotMatch(
      sticker.svg.replace("http://www.w3.org/2000/svg", ""),
      /https?:\/\//,
    );
    assert.doesNotMatch(sticker.svg, /<script/);
  }
  assert.throws(() => stickerDataUrl("missing"), /Unknown sticker/);
});

// Canvas call recording is intentionally browser-independent. Geometry and failure
// behavior can be checked in CI without downloading a browser or loading remote art.
function mockCanvasEnvironment(t) {
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const contexts = [];
  const makeContext = () => {
    const operations = [];
    const stack = [];
    const ctx = {
      operations,
      font: "10px sans-serif",
      fillStyle: "#000",
      filter: "none",
      shadowColor: "transparent",
      shadowBlur: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      measureText(text) {
        const size = Number(this.font.match(/(\d+)px/)?.[1] || 10);
        return { width: Array.from(String(text)).length * size * 0.6 };
      },
      save() {
        stack.push(
          Object.fromEntries(
            Object.entries(this).filter(
              ([, value]) =>
                typeof value !== "function" && !Array.isArray(value),
            ),
          ),
        );
      },
      restore() {
        Object.assign(this, stack.pop());
      },
      fillRect(...args) {
        operations.push({
          type: "rect",
          args,
          fill: this.fillStyle,
          shadow: this.shadowColor,
          composite: this.globalCompositeOperation,
        });
      },
      drawImage(...args) {
        operations.push({
          type: "image",
          args,
          filter: this.filter,
          shadow: this.shadowColor,
        });
      },
      fillText(...args) {
        operations.push({
          type: "text",
          args,
          font: this.font,
          fill: this.fillStyle,
        });
      },
      createPattern(image, repetition) {
        return { image, repetition };
      },
    };
    for (const name of [
      "scale",
      "beginPath",
      "arc",
      "fill",
      "moveTo",
      "lineTo",
      "stroke",
      "translate",
      "rotate",
      "clip",
      "closePath",
    ])
      ctx[name] = () => {};
    contexts.push(ctx);
    return ctx;
  };
  globalThis.document = {
    createElement(type) {
      assert.equal(type, "canvas");
      const ctx = makeContext();
      return { width: 0, height: 0, getContext: () => ctx };
    },
  };
  globalThis.Image = class {
    naturalWidth = 200;
    naturalHeight = 100;
    set src(value) {
      queueMicrotask(() =>
        value === "broken" ? this.onerror?.() : this.onload?.(),
      );
    }
  };
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalImage === undefined) delete globalThis.Image;
    else globalThis.Image = originalImage;
  });
  return contexts;
}

test("borderless photo preserves transparency and contains the full picture without a frame or shadow", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  const canvas = await renderEntry({
    elements: [{ type: "photo", src: "local", frame: false, w: 100, h: 100 }],
  });
  assert.equal(canvas.width, 1440);
  assert.equal(canvas.height, 1800);
  assert.equal(
    contexts[0].operations.filter(
      (op) => op.type === "rect" && op.composite !== "multiply",
    ).length,
    1,
    "Only the paper background is filled before grain",
  );
  const image = contexts[0].operations.find((op) => op.type === "image");
  assert.deepEqual(image.args.slice(1), [0, 25, 100, 50]);
  assert.equal(image.shadow, "transparent");
});

test("a custom paper color overrides the named paper in exported backgrounds", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({ paper: "sage", paperColor: "#f2dabc", elements: [] });
  assert.equal(
    contexts[0].operations.find((op) => op.type === "rect").fill,
    "#f2dabc",
  );
  await renderEntry({ paper: "sage", elements: [] });
  assert.equal(
    contexts[1].operations.find((op) => op.type === "rect").fill,
    "#eef0e5",
  );
});

test("default photo keeps its paper frame and centered cover crop", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({
    elements: [{ type: "photo", src: "local", w: 100, h: 100 }],
  });
  const frames = contexts[0].operations.filter(
    (op) => op.type === "rect" && op.composite !== "multiply",
  );
  assert.equal(frames.length, 2);
  assert.equal(frames[1].fill, "#fffdf7");
  const image = contexts[0].operations.find((op) => op.type === "image");
  assert.deepEqual(image.args.slice(-4), [10, 10, 80, 60]);
  assert.equal(image.args.length, 9, "Cover sizing supplies a source crop");
});

test("zine title is bold; a saved title or body cannot silently disappear from export", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({
    template: "zine",
    title: "Hello",
    body: "A little day.",
    elements: [],
  });
  const title = contexts[0].operations.find(
    (op) => op.type === "text" && op.args[1] === 54 && op.args[2] === 145,
  );
  assert.match(title.font, /^700 38px/);
  assert.equal(title.fill, "#414338");
  await assert.rejects(
    renderEntry({ title: "日".repeat(1000), elements: [] }),
    /标题.*缩短.*拆分/,
  );
  await assert.rejects(
    renderEntry({ body: "一\n二\n三\n四\n五\n六", elements: [] }),
    /正文.*缩短.*拆分/,
  );
});

test("custom title and body layout controls positions, font sizes, alignment and line height", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({
    title: "Hello",
    body: "small\nwords",
    elements: [],
    layout: {
      title: { x: 100, y: 200, w: 300, h: 80, fontSize: 32, align: "center" },
      body: {
        x: 80,
        y: 420,
        w: 400,
        h: 180,
        fontSize: 16,
        lineHeight: 28,
        align: "right",
      },
    },
  });
  const title = contexts[0].operations.find(
    (op) => op.type === "text" && op.args[0] === "Hello",
  );
  assert.deepEqual(title.args, ["Hello", 202, 200]);
  assert.match(title.font, /^400 32px/);
  const small = contexts[0].operations.find(
    (op) => op.type === "text" && op.args[0] === "small",
  );
  const words = contexts[0].operations.find(
    (op) => op.type === "text" && op.args[0] === "words",
  );
  assert.deepEqual(small.args, ["small", 432, 420]);
  assert.deepEqual(words.args, ["words", 432, 448]);
  assert.match(small.font, /^400 16px/);
});

test("title line height follows its font and custom text boxes refuse overflow", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({
    title: "ABCD",
    elements: [],
    layout: { title: { x: 30, y: 200, w: 40, h: 60, fontSize: 24 } },
  });
  const lines = contexts[0].operations.filter(
    (op) => op.type === "text" && ["AB", "CD"].includes(op.args[0]),
  );
  assert.deepEqual(
    lines.map((op) => op.args),
    [
      ["AB", 30, 200],
      ["CD", 30, 230],
    ],
  );
  await assert.rejects(
    renderEntry({
      title: "ABCD",
      elements: [],
      layout: { title: { w: 40, h: 30, fontSize: 24 } },
    }),
    /标题.*超出/,
  );
  await assert.rejects(
    renderEntry({
      body: "不能裁掉",
      elements: [],
      layout: { body: { h: 30, fontSize: 64, lineHeight: 16 } },
    }),
    /正文.*超出/,
  );
  await assert.rejects(
    renderEntry({
      body: "one\ntwo",
      elements: [],
      layout: { body: { h: 30, lineHeight: 30 } },
    }),
    /正文.*超出/,
  );
  // An intentionally blank title does not block export when its box is small.
  await renderEntry({
    title: "",
    elements: [],
    layout: { title: { h: 30, fontSize: 64 } },
  });
});

test("text elements render user-selected typography and reject a box shorter than one line", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({
    elements: [
      {
        type: "text",
        text: "HELLO\nWORLD",
        w: 200,
        h: 120,
        fontSize: 40,
        align: "right",
      },
    ],
  });
  const lines = contexts[0].operations.filter(
    (op) => op.type === "text" && ["HELLO", "WORLD"].includes(op.args[0]),
  );
  assert.deepEqual(
    lines.map((op) => op.args),
    [
      ["HELLO", 80, 0],
      ["WORLD", 80, 60],
    ],
  );
  assert.match(lines[0].font, /^400 40px/);
  await assert.rejects(
    renderEntry({
      elements: [{ type: "text", text: "A", w: 200, h: 20, fontSize: 40 }],
    }),
    /文字素材.*放大/,
  );
});

test("template eyebrow follows the editor typography and preserves the stored date", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  await renderEntry({ template: "film", date: "2026-10-31", elements: [] });
  const film = contexts[0].operations.filter((op) => op.type === "text");
  assert.match(film[0].font, /^normal 400 12px Georgia/);
  assert.ok(
    Math.abs(film[1].args[1] - film[0].args[1] - (12 * 0.6 + 3)) < 0.0001,
  );
  assert.equal(film.filter((op) => op.args[0] === "2026-10-31").length, 1);
  assert.equal(
    film
      .filter((op) => op.args[2] === 864 && op.args[1] > 500)
      .map((op) => op.args[0])
      .join(""),
    "2026-10-31",
  );
  await renderEntry({ template: "letter", elements: [] });
  const letter = contexts[1].operations.find((op) => op.type === "text");
  assert.match(letter.font, /^italic 400 12px Georgia/);
  assert.equal(letter.fill, "#a1857a");
});

test("export resolves all mood ids to the same icon and Chinese label as the editor", async (t) => {
  const contexts = mockCanvasEnvironment(t);
  const moods = {
    happy: "☺ 开心",
    calm: "☼ 平静",
    tired: "☾ 有点累",
    sad: "☁ 低落",
    spark: "✧ 有灵感",
  };
  let index = 0;
  for (const [mood, label] of Object.entries(moods)) {
    await renderEntry({ mood, elements: [] });
    const output = contexts[index++].operations.find(
      (op) => op.type === "text" && op.args[1] === 550 && op.args[2] === 90,
    );
    assert.equal(output.args[0], label);
    assert.equal(output.fill, "#7a8368");
  }
});

test("text elements reject overflow instead of silently shortening saved writing", async (t) => {
  mockCanvasEnvironment(t);
  await assert.rejects(
    renderEntry({
      elements: [{ type: "text", text: "a\nb\nc", w: 100, h: 30 }],
    }),
    /文字素材.*放大.*缩短/,
  );
});

test("an unreadable local photo prevents an incomplete export", async (t) => {
  mockCanvasEnvironment(t);
  await assert.rejects(
    renderEntry({ elements: [{ type: "photo", src: "broken" }] }),
    /图片无法读取/,
  );
});
