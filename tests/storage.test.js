import test from "node:test";
import assert from "node:assert/strict";
import {
  createBackup,
  validateBackup,
  STORAGE_LIMITS,
  DEFAULT_TEXT_LAYOUT,
  normalizeTextLayout,
} from "../src/storage.js";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6pkAAAAAASUVORK5CYII=";
const TIME = "2026-10-31T08:00:00.000Z";
const clone = (value) => structuredClone(value);

function entry(overrides = {}) {
  return {
    id: "day-1",
    date: "2026-10-31",
    title: "一点小日子",
    body: "今天也要记住。",
    mood: "calm",
    template: "salt",
    paper: "cream",
    createdAt: TIME,
    updatedAt: TIME,
    elements: [
      {
        id: "photo-1",
        type: "photo",
        x: 120,
        y: 100,
        w: 320,
        h: 240,
        rotation: -5,
        src: PNG,
        filter: "film",
        frame: true,
      },
    ],
    ...overrides,
  };
}

function envelope(entries = [entry()]) {
  return { format: "little-days", version: 1, exportedAt: TIME, entries };
}

test("backup round trip preserves Unicode, image data and all schema fields without mutating input", () => {
  const original = [
    entry({
      title: "🌸 生活里的小事",
      elements: [
        ...entry().elements,
        {
          id: "s",
          type: "sticker",
          sticker: "flower",
          x: 10,
          y: 20,
          w: 80,
          h: 80,
          rotation: 3,
        },
        {
          id: "t",
          type: "text",
          text: "<script>这只是日记文字</script>",
          color: "#54715A",
          x: 40,
          y: 80,
          w: 200,
          h: 60,
          rotation: 0,
        },
        {
          id: "tape",
          type: "tape",
          color: "#b6bd9180",
          x: 60,
          y: 90,
          w: 100,
          h: 30,
          rotation: 0,
        },
      ],
    }),
  ];
  const before = clone(original);
  const exported = createBackup(original);
  assert.equal(exported.format, "little-days");
  assert.equal(exported.version, 1);
  assert.ok(Number.isFinite(Date.parse(exported.exportedAt)));
  const imported = validateBackup(JSON.parse(JSON.stringify(exported)));
  assert.deepEqual(imported, before);
  imported[0].elements[0].x = 200;
  assert.deepEqual(original, before);
});

test("empty library remains valid and unknown fields are not retained", () => {
  assert.deepEqual(validateBackup(envelope([])), []);
  const result = validateBackup({
    ...envelope(),
    arbitrary: "ignored",
    entries: [entry({ sessionToken: "do-not-keep" })],
  });
  assert.equal(Object.hasOwn(result[0], "sessionToken"), false);
});

test("photo frame defaults to true and explicit borderless photos survive backup round trips", () => {
  const photo = { ...entry().elements[0] };
  delete photo.frame;
  assert.equal(
    validateBackup(envelope([entry({ elements: [photo] })]))[0].elements[0]
      .frame,
    true,
  );
  const borderless = [entry({ elements: [{ ...photo, frame: false }] })];
  assert.deepEqual(
    validateBackup(JSON.parse(JSON.stringify(createBackup(borderless)))),
    borderless,
  );
  for (const frame of ["false", 0, null, {}]) {
    assert.throws(
      () =>
        validateBackup(envelope([entry({ elements: [{ ...photo, frame }] })])),
      /相框.*布尔值/,
    );
  }
});

test("all twelve templates are valid backup values and unknown templates remain rejected", () => {
  for (const template of [
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
  ]) {
    assert.equal(
      validateBackup(envelope([entry({ template })]))[0].template,
      template,
    );
  }
  assert.throws(
    () => validateBackup(envelope([entry({ template: "unknown" })])),
    /模板/,
  );
});

test("custom paper colors survive backup round trips while named paper remains compatible", () => {
  const original = [entry({ paper: "sage", paperColor: "#AaB355" })];
  assert.deepEqual(
    validateBackup(JSON.parse(JSON.stringify(createBackup(original)))),
    original,
  );
  assert.equal(
    Object.hasOwn(validateBackup(envelope())[0], "paperColor"),
    false,
  );
  for (const paperColor of [
    "#abc",
    "#11223344",
    "pink",
    "url(https://example.com)",
    null,
    123,
  ]) {
    assert.throws(
      () => validateBackup(envelope([entry({ paperColor })])),
      /自定义纸色.*六位/,
    );
  }
});

test("legacy entries keep no layout; partial layouts gain defaults without mutating the original", () => {
  assert.equal(Object.hasOwn(validateBackup(envelope())[0], "layout"), false);
  assert.deepEqual(normalizeTextLayout({}), DEFAULT_TEXT_LAYOUT);
  const source = {
    title: { x: 80, align: "center", ignored: "drop", lineHeight: 80 },
  };
  const before = clone(source);
  const result = normalizeTextLayout(source);
  assert.deepEqual(result.title, {
    ...DEFAULT_TEXT_LAYOUT.title,
    x: 80,
    align: "center",
  });
  assert.deepEqual(result.body, DEFAULT_TEXT_LAYOUT.body);
  assert.deepEqual(source, before);
});

test("editable text layout and text-layer typography survive the complete backup round trip", () => {
  const layout = {
    title: { x: 100, y: 150, w: 400, h: 120, fontSize: 40, align: "center" },
    body: {
      x: 80,
      y: 470,
      w: 550,
      h: 350,
      fontSize: 20,
      lineHeight: 32,
      align: "right",
    },
  };
  const text = {
    id: "custom-text",
    type: "text",
    x: 120,
    y: 340,
    w: 300,
    h: 100,
    rotation: 0,
    text: "自由排版",
    fontSize: 28,
    align: "center",
  };
  const original = [entry({ layout, elements: [text] })];
  assert.deepEqual(
    validateBackup(JSON.parse(JSON.stringify(createBackup(original)))),
    original,
  );
  const legacyText = { ...text };
  delete legacyText.fontSize;
  delete legacyText.align;
  const legacy = validateBackup(
    envelope([entry({ elements: [legacyText] })]),
  )[0].elements[0];
  assert.equal(Object.hasOwn(legacy, "fontSize"), false);
  assert.equal(Object.hasOwn(legacy, "align"), false);
});

test("layout geometry stays within paper and malformed typography cannot enter saved data", () => {
  const result = normalizeTextLayout({
    title: { x: 700, y: 880, w: 2000, h: 2000, fontSize: 1000, align: "right" },
    body: { x: -100, y: -100, w: -1, h: -1, fontSize: -1, lineHeight: 1000 },
  });
  assert.deepEqual(result.title, {
    x: 40,
    y: 100,
    w: 680,
    h: 800,
    fontSize: 64,
    align: "right",
  });
  assert.deepEqual(result.body, {
    x: 0,
    y: 0,
    w: 40,
    h: 30,
    fontSize: 12,
    lineHeight: 90,
    align: "left",
  });
  for (const layout of [
    null,
    [],
    { title: null },
    { title: { x: Infinity } },
    { title: { fontSize: "30" } },
    { body: { lineHeight: NaN } },
    { body: { align: "justify" } },
  ]) {
    assert.throws(
      () => validateBackup(envelope([entry({ layout })])),
      /文字布局/,
    );
  }
  assert.throws(
    () => normalizeTextLayout(JSON.parse('{"title":{"__proto__":{}}}')),
    /不安全/,
  );
  const text = {
    id: "t",
    type: "text",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    rotation: 0,
    text: "字",
    fontSize: NaN,
  };
  assert.throws(
    () => validateBackup(envelope([entry({ elements: [text] })])),
    /字号/,
  );
  assert.throws(
    () =>
      validateBackup(
        envelope([
          entry({ elements: [{ ...text, fontSize: 24, align: "url(x)" }] }),
        ]),
      ),
    /对齐/,
  );
});

test("one invalid entry rejects the entire import without editing the source", () => {
  const source = envelope([
    entry(),
    entry({ id: "day-2", mood: "unsupported" }),
  ]);
  const before = clone(source);
  assert.throws(() => validateBackup(source), /第 2 篇日记心情/);
  assert.deepEqual(source, before);
});

test("format, version, dates and actual calendar days are validated", () => {
  for (const value of [
    null,
    [],
    { ...envelope(), format: "other" },
    { ...envelope(), version: 2 },
  ]) {
    assert.throws(() => validateBackup(value), /备份/);
  }
  for (const date of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-1-01",
    "hello",
  ]) {
    assert.throws(() => validateBackup(envelope([entry({ date })])), /日期/);
  }
  assert.equal(
    validateBackup(envelope([entry({ date: "2024-02-29" })]))[0].date,
    "2024-02-29",
  );
  for (const updatedAt of [
    "2026-02-30T08:00:00.000Z",
    "2026-10-31T24:00:00Z",
    "yesterday",
    1,
  ]) {
    assert.throws(
      () => validateBackup(envelope([entry({ updatedAt })])),
      /时间/,
    );
  }
});

test("duplicate IDs, sparse arrays, excessive counts and oversized writing reject clearly", () => {
  assert.throws(() => validateBackup(envelope([entry(), entry()])), /标识重复/);
  assert.throws(
    () =>
      validateBackup(
        envelope([
          entry({ elements: [entry().elements[0], entry().elements[0]] }),
        ]),
      ),
    /元素标识重复/,
  );
  assert.throws(() => validateBackup(envelope(new Array(1))), /需要一个对象/);
  assert.throws(
    () => validateBackup(envelope([entry({ elements: new Array(1) })])),
    /需要一个对象/,
  );
  assert.throws(
    () => validateBackup(envelope(new Array(STORAGE_LIMITS.entries + 1))),
    /最多支持/,
  );
  assert.throws(
    () =>
      validateBackup(
        envelope([
          entry({ elements: new Array(STORAGE_LIMITS.elementsPerEntry + 1) }),
        ]),
      ),
    /不能超过/,
  );
  assert.throws(
    () =>
      validateBackup(
        envelope([
          entry({ title: "a".repeat(STORAGE_LIMITS.titleLength + 1) }),
        ]),
      ),
    /标题.*不能超过/,
  );
  assert.throws(
    () =>
      validateBackup(
        envelope([entry({ body: "a".repeat(STORAGE_LIMITS.bodyLength + 1) })]),
      ),
    /正文.*不能超过/,
  );
});

test("finite geometry is constrained to editable canvas bounds; nonfinite values are rejected", () => {
  const image = {
    ...entry().elements[0],
    x: -10000,
    y: 10000,
    w: 10000,
    h: -1,
    rotation: 10000,
  };
  const result = validateBackup(envelope([entry({ elements: [image] })]))[0]
    .elements[0];
  assert.deepEqual(
    [result.x, result.y, result.w, result.h, result.rotation],
    [-704, 884, 720, 16, 180],
  );
  for (const value of [NaN, Infinity, -Infinity, "12", null]) {
    assert.throws(
      () =>
        validateBackup(
          envelope([entry({ elements: [{ ...image, x: value }] })]),
        ),
      /有限数值/,
    );
  }
});

test("external resources, disguised SVG, malformed base64 and arbitrary local files are rejected", () => {
  const badSources = [
    "https://example.com/photo.jpg",
    "javascript:alert(1)",
    "file:///tmp/photo.png",
    "./assets/other.jpg",
    "./assets/../secret.jpg",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,PHN2Zz48L3N2Zz4=",
    "data:image/png;base64,###=",
    "data:image/png;base64,",
    "data:image/webp;base64,iVBORw0KGgo=",
  ];
  for (const src of badSources) {
    assert.throws(
      () =>
        validateBackup(
          envelope([entry({ elements: [{ ...entry().elements[0], src }] })]),
        ),
      /图片/,
    );
  }
  for (const src of [
    "./assets/sample-landscape.jpg",
    "./assets/sample-coffee.jpg",
  ]) {
    assert.equal(
      validateBackup(
        envelope([entry({ elements: [{ ...entry().elements[0], src }] })]),
      )[0].elements[0].src,
      src,
    );
  }
});

test("prototype pollution and unsupported enum or CSS values cannot enter the sanitized model", () => {
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const source = JSON.parse(JSON.stringify(envelope()));
    Object.defineProperty(source.entries[0], key, {
      value: { polluted: true },
      enumerable: true,
    });
    assert.throws(() => validateBackup(source), /不安全/);
  }
  const badElements = [
    { ...entry().elements[0], filter: "blur(20px)" },
    { ...entry().elements[0], color: "url(https://example.com)" },
    { ...entry().elements[0], type: "iframe" },
    { ...entry().elements[0], type: "sticker", sticker: "unknown" },
  ];
  for (const element of badElements)
    assert.throws(() =>
      validateBackup(envelope([entry({ elements: [element] })])),
    );
  assert.equal({}.polluted, undefined);
});

function installGlobal(t, name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
  t.after(() =>
    previous
      ? Object.defineProperty(globalThis, name, previous)
      : delete globalThis[name],
  );
}

let moduleCounter = 0;
const freshStorage = () => import(`../src/storage.js?test=${++moduleCounter}`);
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Event fake with separate request/commit events and serialized transactions.
function fakeIndexedDB({ autoCommit = true, stored, revision } = {}) {
  const state = {
    stored,
    revision,
    transactions: [],
    openCount: 0,
    closeCount: 0,
  };
  const waiting = [];
  let active;
  const activateNext = () => {
    if (active || !waiting.length) return;
    active = waiting.shift();
    active.start();
  };
  const indexedDB = {
    open() {
      state.openCount += 1;
      const request = {};
      const db = {
        objectStoreNames: { contains: () => true },
        close() {
          state.closeCount += 1;
        },
        transaction(_name, mode) {
          const pending = new Map();
          const requests = [];
          let inFlight = 0;
          let ended = false;
          const release = () => {
            if (active === transaction) active = undefined;
            queueMicrotask(activateNext);
          };
          const dispatch = (op) =>
            queueMicrotask(() => {
              if (ended) return;
              if (op.kind === "put") pending.set(op.key, clone(op.value));
              op.result =
                op.kind === "get"
                  ? clone(
                      pending.has(op.key)
                        ? pending.get(op.key)
                        : op.key === "revision"
                          ? state.revision
                          : state.stored,
                    )
                  : op.key;
              op.onsuccess?.();
              transaction.requestSucceeded = true;
              inFlight -= 1;
              if (autoCommit)
                queueMicrotask(() => {
                  if (!inFlight && !ended) transaction.finish();
                });
            });
          const transaction = {
            mode,
            start() {
              for (const op of requests) dispatch(op);
            },
            finish() {
              if (ended) return;
              ended = true;
              if (pending.has("entries"))
                state.stored = clone(pending.get("entries"));
              if (pending.has("revision"))
                state.revision = pending.get("revision");
              transaction.oncomplete?.();
              release();
            },
            fail(error) {
              if (ended) return;
              ended = true;
              transaction.error = error;
              transaction.onerror?.();
              transaction.onabort?.();
              release();
            },
            abort() {
              transaction.fail(new DOMException("Aborted", "AbortError"));
            },
            objectStore() {
              const issue = (kind, key, value) => {
                const op = { kind, key, value };
                inFlight += 1;
                requests.push(op);
                if (active === transaction) dispatch(op);
                return op;
              };
              return {
                get: (key) => issue("get", key),
                put: (value, key) => issue("put", key, clone(value)),
              };
            },
          };
          state.transactions.push(transaction);
          waiting.push(transaction);
          queueMicrotask(activateNext);
          return transaction;
        },
      };
      state.db = db;
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
  return { indexedDB, state };
}

test("first load is null, deliberate empty library survives reload, and writes capture their input", async (t) => {
  const fake = fakeIndexedDB();
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  assert.equal(await storage.loadEntries(), null);
  const entries = [entry()];
  const saving = storage.saveEntries(entries);
  entries[0].title = "modified while saving";
  await saving;
  assert.equal((await storage.loadEntries())[0].title, "一点小日子");
  await storage.saveEntries([]);
  const reloaded = await freshStorage();
  assert.deepEqual(await reloaded.loadEntries(), []);
});

test("save resolves only on transaction completion, not when the put request succeeds", async (t) => {
  const fake = fakeIndexedDB({ autoCommit: false });
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  let saved = false;
  const saving = storage.saveEntries([entry()]).then(() => {
    saved = true;
  });
  await flush();
  assert.equal(fake.state.transactions[0].requestSucceeded, true);
  assert.equal(saved, false);
  assert.equal(fake.state.stored, undefined);
  fake.state.transactions[0].finish();
  await saving;
  assert.equal(saved, true);
  assert.equal(fake.state.stored.entries[0].id, "day-1");
});

test("quota failure after request success rejects and preserves previously committed content", async (t) => {
  const previous = envelope([entry({ title: "previously committed" })]);
  const fake = fakeIndexedDB({ autoCommit: false, stored: previous });
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  const saving = storage.saveEntries([entry({ title: "new unsaved content" })]);
  const rejection = assert.rejects(saving, /本地空间不足.*未能保存/);
  await flush();
  fake.state.transactions[0].fail(
    new DOMException("Quota exhausted", "QuotaExceededError"),
  );
  await rejection;
  assert.deepEqual(fake.state.stored, previous);
  assert.equal(fake.state.revision, undefined);
  const retry = storage.saveEntries([
    entry({ title: "retry after quota recovered" }),
  ]);
  await flush();
  fake.state.transactions[1].finish();
  await retry;
  assert.equal(fake.state.revision, 1);
});

test("simultaneous windows reject the stale whole-library write inside the same transaction", async (t) => {
  const fake = fakeIndexedDB({ stored: envelope([entry()]) });
  installGlobal(t, "indexedDB", fake.indexedDB);
  const firstWindow = await freshStorage();
  const secondWindow = await freshStorage();
  const [first, second] = await Promise.all([
    firstWindow.loadEntries(),
    secondWindow.loadEntries(),
  ]);
  first[0].title = "first window change";
  second[0].title = "second window change";
  const [a, b] = await Promise.allSettled([
    firstWindow.saveEntries(first),
    secondWindow.saveEntries(second),
  ]);
  assert.equal(a.status, "fulfilled");
  assert.equal(b.status, "rejected");
  assert.equal(b.reason.code, "STALE_WRITE");
  assert.match(b.reason.message, /另一窗口/);
  assert.equal(fake.state.stored.entries[0].title, "first window change");
  assert.equal(fake.state.revision, 1);
  // A queued retry cannot accidentally adopt the other window's revision.
  await assert.rejects(secondWindow.saveEntries(second), {
    code: "STALE_WRITE",
  });
  const refreshed = await secondWindow.loadEntries();
  refreshed[0].title = "merged after reload";
  await secondWindow.saveEntries(refreshed);
  assert.equal(fake.state.stored.entries[0].title, "merged after reload");
  assert.equal(fake.state.revision, 2);
});

test("same-window concurrent saves serialize and load waits for their committed result", async (t) => {
  const fake = fakeIndexedDB();
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  const a = storage.saveEntries([entry({ title: "first" })]);
  const b = storage.saveEntries([entry({ title: "second" })]);
  const loading = storage.loadEntries();
  await Promise.all([a, b]);
  assert.equal((await loading)[0].title, "second");
  assert.equal(fake.state.revision, 2);
});

test("a new module must read an existing revision before replacing an established library", async (t) => {
  const fake = fakeIndexedDB({ stored: envelope([entry()]), revision: 7 });
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  await assert.rejects(storage.saveEntries([]), { code: "STALE_WRITE" });
  assert.equal(fake.state.stored.entries.length, 1);
  await storage.loadEntries();
  await storage.saveEntries([]);
  assert.equal(fake.state.revision, 8);
});

test("corrupted revision data is rejected without changing journal contents", async (t) => {
  const previous = envelope([entry()]);
  const fake = fakeIndexedDB({ stored: previous, revision: "invalid" });
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  await assert.rejects(storage.loadEntries(), /版本信息损坏/);
  await assert.rejects(storage.saveEntries([]), /版本信息损坏/);
  assert.deepEqual(fake.state.stored, previous);
});

test("invalid entries never open storage; missing IndexedDB never becomes a silent memory save", async (t) => {
  const fake = fakeIndexedDB();
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  await assert.rejects(
    storage.saveEntries([entry({ date: "bad-date" })]),
    /日期/,
  );
  assert.equal(fake.state.openCount, 0);
  globalThis.indexedDB = undefined;
  await assert.rejects(storage.saveEntries([entry()]), /不支持本地存储/);
  globalThis.indexedDB = fake.indexedDB;
  await storage.saveEntries([entry()]);
  assert.equal(fake.state.openCount, 1);
});

test("stored corruption fails explicitly and version changes close the old connection", async (t) => {
  const fake = fakeIndexedDB({
    stored: envelope([entry({ mood: "invalid" })]),
  });
  installGlobal(t, "indexedDB", fake.indexedDB);
  const storage = await freshStorage();
  await assert.rejects(storage.loadEntries(), /心情/);
  fake.state.db.onversionchange();
  assert.equal(fake.state.closeCount, 1);
  await storage.saveEntries([]);
  assert.equal(fake.state.openCount, 2);
});

test("optional settings round trip safely and unavailable storage stays visible", async (t) => {
  const data = new Map();
  installGlobal(t, "localStorage", {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  });
  const storage = await freshStorage();
  assert.equal(storage.readSettings(), null);
  storage.saveSettings({
    paper: "sage",
    showWelcome: false,
    zoom: 0.7,
    selected: null,
  });
  assert.deepEqual(storage.readSettings(), {
    paper: "sage",
    showWelcome: false,
    zoom: 0.7,
    selected: null,
  });
  assert.throws(
    () => storage.saveSettings(JSON.parse('{"__proto__":{"x":1}}')),
    /不安全/,
  );
  assert.throws(() => storage.saveSettings({ nested: {} }), /简单设置/);
  globalThis.localStorage.setItem = () => {
    throw new DOMException("Disabled", "SecurityError");
  };
  assert.throws(
    () => storage.saveSettings({ paper: "cream" }),
    /无法保存本地设置/,
  );
});
