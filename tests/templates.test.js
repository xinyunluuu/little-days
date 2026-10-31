import test from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATES,
  applyTemplate,
  createTemplateElements,
} from "../src/templates.js";

const ids = (prefix = "new") => {
  let i = 0;
  return () => `${prefix}-${++i}`;
};
const entryWith = (elements) => ({
  id: "entry",
  date: "2026-10-31",
  title: "记得今天",
  body: "今天也有值得记录的小事。",
  mood: "calm",
  template: "salt",
  paper: "cream",
  elements,
});
const image = (index) => ({
  id: `photo-${index}`,
  type: "photo",
  src: `local-picture-${index}`,
  x: 20,
  y: 20,
  w: 100,
  h: 120,
  rotation: 4,
  frame: index % 2 === 0,
  filter: "warm",
});
const text = (index) => ({
  id: `text-${index}`,
  type: "text",
  text: `保留文字 ${index}`,
  x: 30,
  y: 300,
  w: 200,
  h: 90,
  rotation: 2,
  color: "#637154",
});
const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function rotatedBounds(element) {
  const angle = ((element.rotation || 0) * Math.PI) / 180;
  const w =
    Math.abs(element.w * Math.cos(angle)) +
    Math.abs(element.h * Math.sin(angle));
  const h =
    Math.abs(element.w * Math.sin(angle)) +
    Math.abs(element.h * Math.cos(angle));
  return {
    x: element.x + (element.w - w) / 2,
    y: element.y + (element.h - h) / 2,
    w,
    h,
  };
}

test("the library contains 12 genuinely different compositions across four categories", () => {
  assert.deepEqual(Object.keys(TEMPLATES), [
    "salt",
    "film",
    "letter",
    "zine",
    "postcard",
    "botanical",
    "receipt",
    "polaroid",
    "gallery",
    "midnight",
    "candy",
    "minimal",
  ]);
  assert.deepEqual(
    new Set(Object.values(TEMPLATES).map((template) => template.category)),
    new Set(["日常", "旅行", "心情", "创意"]),
  );
  const layouts = new Set();
  for (const template of Object.values(TEMPLATES)) {
    assert.ok(template.name && template.description);
    assert.ok(["cream", "sage", "pink", "blue"].includes(template.paper));
    assert.ok(template.photoSlots.length > 0);
    assert.equal(Object.isFrozen(template.layout.body), true);
    layouts.add(JSON.stringify([template.layout, template.photoSlots]));
  }
  assert.equal(layouts.size, 12);
});

test("each writing area fits the intended continuous CJK text and stays clear of preset photos/decorations", () => {
  for (const [key, template] of Object.entries(TEMPLATES)) {
    const { title, body } = template.layout;
    assert.ok(
      Math.floor(title.w / title.fontSize) *
        Math.floor(title.h / (title.fontSize * 1.25)) >=
        28,
      `${key}: title capacity`,
    );
    assert.ok(
      Math.floor(body.w / body.fontSize) *
        Math.floor(body.h / body.lineHeight) >=
        150,
      `${key}: body capacity`,
    );
    for (const area of [title, body]) {
      assert.ok(
        area.x >= 54 &&
          area.y >= 140 &&
          area.x + area.w <= 666 &&
          area.y + area.h <= 820,
        `${key}: writing stays inside the page`,
      );
      assert.ok(["left", "center", "right"].includes(area.align));
    }
    assert.equal(
      overlap(title, body),
      false,
      `${key}: title and body are separate`,
    );
    for (const element of [...template.photoSlots, ...template.decorations]) {
      assert.equal(
        overlap(rotatedBounds(element), body),
        false,
        `${key}: the body remains unobscured`,
      );
    }
  }
});

test("salt keeps the original title/body positions and photo composition", () => {
  assert.deepEqual(TEMPLATES.salt.layout.title, {
    x: 54,
    y: 145,
    w: 612,
    h: 96,
    fontSize: 38,
    align: "left",
  });
  assert.deepEqual(TEMPLATES.salt.layout.body, {
    x: 54,
    y: 625,
    w: 612,
    h: 170,
    fontSize: 19,
    lineHeight: 34,
    align: "left",
  });
  assert.deepEqual(TEMPLATES.salt.photoSlots[0], {
    x: 77,
    y: 250,
    w: 470,
    h: 315,
    rotation: -5,
  });
});

test("applying a template preserves every photo and text, IDs, metadata and the original object", () => {
  const entry = entryWith([
    image(1),
    text(1),
    {
      id: "old-leaf",
      type: "sticker",
      sticker: "leaf",
      x: 10,
      y: 20,
      w: 80,
      h: 80,
      rotation: 0,
    },
    image(2),
    text(2),
  ]);
  entry.createdAt = "2026-10-31T00:00:00.000Z";
  const before = structuredClone(entry);
  const result = applyTemplate(entry, "letter", { createId: ids() });
  assert.deepEqual(entry, before);
  assert.equal(result.template, "letter");
  assert.equal(result.paper, "pink");
  assert.deepEqual(result.layout, TEMPLATES.letter.layout);
  assert.notEqual(result.layout, TEMPLATES.letter.layout);
  assert.equal(result.createdAt, entry.createdAt);
  assert.equal(result.title, entry.title);
  assert.equal(result.body, entry.body);
  assert.deepEqual(
    result.elements.filter((element) => element.type === "text"),
    entry.elements.filter((element) => element.type === "text"),
  );
  const pictures = result.elements.filter(
    (element) => element.type === "photo",
  );
  for (const [index, picture] of pictures.entries()) {
    const original = entry.elements.filter(
      (element) => element.type === "photo",
    )[index];
    for (const property of ["id", "src", "frame", "filter"])
      assert.equal(picture[property], original[property]);
    assert.notEqual(picture, original);
  }
  assert.equal(
    result.elements.some((element) => element.id === "old-leaf"),
    false,
  );
  assert.deepEqual(
    result.elements.slice(0, 4).map((element) => element.id),
    ["photo-1", "text-1", "photo-2", "text-2"],
  );
});

test("preserveDecorations keeps existing editable decorations without adding duplicates", () => {
  const decor = createTemplateElements("candy", { createId: ids("original") });
  const entry = entryWith([image(1), text(1), ...decor]);
  const result = applyTemplate(entry, "botanical", {
    preserveDecorations: true,
    createId: ids(),
  });
  assert.equal(result.elements.length, entry.elements.length);
  assert.deepEqual(result.elements.slice(2), decor);
  assert.notEqual(result.elements[2], decor[0]);
});

test("all photos up to the 120-element limit receive distinct usable slots outside the body", () => {
  for (const [key, template] of Object.entries(TEMPLATES)) {
    for (const count of [1, 2, 3, 7, 12, 30, 60, 120]) {
      const entry = entryWith(
        Array.from({ length: count }, (_, index) => image(index)),
      );
      const result = applyTemplate(entry, key, { createId: ids() });
      const pictures = result.elements.filter(
        (element) => element.type === "photo",
      );
      assert.equal(pictures.length, count, `${key}/${count}: no lost photos`);
      assert.ok(result.elements.length <= 120);
      assert.equal(
        new Set(pictures.map((element) => `${element.x},${element.y}`)).size,
        count,
        `${key}/${count}: distinct positions`,
      );
      for (const picture of pictures) {
        assert.ok(
          picture.w >= 16 && picture.h >= 16,
          `${key}/${count}: usable dimensions`,
        );
        assert.equal(
          overlap(rotatedBounds(picture), template.layout.body),
          false,
          `${key}/${count}: no body overlap`,
        );
        const epsilon = 1e-8;
        assert.ok(
          picture.x >= -epsilon &&
            picture.y >= 140 - epsilon &&
            picture.x + picture.w <= 666 + epsilon &&
            picture.y + picture.h <= 820 + epsilon,
          `${key}/${count}: in-page coordinates`,
        );
      }
    }
  }
});

test("retained writing/photos take priority over preset decoration at the capacity limit", () => {
  const entry = entryWith([
    ...Array.from({ length: 118 }, (_, index) => image(index)),
    text(1),
  ]);
  const result = applyTemplate(entry, "midnight", { createId: ids() });
  assert.equal(result.elements.length, 120);
  assert.equal(
    result.elements.filter((element) => element.type === "photo").length,
    118,
  );
  assert.deepEqual(
    result.elements.find((element) => element.type === "text"),
    text(1),
  );
  assert.equal(
    result.elements.filter((element) => element.type === "tape").length,
    1,
  );
  assert.throws(
    () =>
      applyTemplate(
        entryWith(Array.from({ length: 121 }, (_, i) => text(i))),
        "minimal",
      ),
    /120.*拆分/,
  );
});

test("new decorations get fresh independent IDs and never collide with retained layers", () => {
  const next = ids();
  const first = createTemplateElements("salt", { createId: next });
  const second = createTemplateElements("salt", { createId: next });
  assert.equal(
    new Set([...first, ...second].map((element) => element.id)).size,
    first.length + second.length,
  );
  first[0].x = -100;
  assert.notEqual(second[0].x, -100);
  assert.notEqual(TEMPLATES.salt.decorations[0].x, -100);
  let counter = 0;
  const result = applyTemplate(entryWith([text(1)]), "salt", {
    createId: () => (++counter === 1 ? "text-1" : `unique-${counter}`),
  });
  assert.equal(
    new Set(result.elements.map((element) => element.id)).size,
    result.elements.length,
  );
  assert.throws(
    () => createTemplateElements("salt", { createId: () => "same" }),
    /重复/,
  );
});

test("invalid requests fail without silently losing content", () => {
  assert.throws(() => applyTemplate(entryWith([]), "missing"), /找不到/);
  assert.throws(() => createTemplateElements("__proto__"), /找不到/);
  assert.throws(() => applyTemplate(null, "salt"), /有效/);
  assert.throws(
    () => applyTemplate(entryWith([{ type: "unknown" }]), "salt"),
    /无法识别/,
  );
});
