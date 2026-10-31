/** Local-only journal storage. A successful save always means an IDB commit. */
export const STORAGE_LIMITS = Object.freeze({
  entries: 5000,
  elementsPerEntry: 120,
  titleLength: 160,
  bodyLength: 100000,
  elementTextLength: 8000,
  imageDataLength: 12 * 1024 * 1024,
  importBytes: 40 * 1024 * 1024,
});

export const DEFAULT_TEXT_LAYOUT = Object.freeze({
  title: Object.freeze({
    x: 54,
    y: 145,
    w: 612,
    h: 96,
    fontSize: 38,
    align: "left",
  }),
  body: Object.freeze({
    x: 54,
    y: 625,
    w: 612,
    h: 190,
    fontSize: 19,
    lineHeight: 34,
    align: "left",
  }),
});

const MOODS = new Set(["happy", "calm", "tired", "sad", "spark"]);
const TEMPLATES = new Set([
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
const PAPERS = new Set(["cream", "sage", "pink", "blue"]);
const TYPES = new Set(["photo", "sticker", "text", "tape"]);
const STICKERS = new Set([
  "flower",
  "leaf",
  "star",
  "heart",
  "coffee",
  "butterfly",
  "stamp",
  "sparkle",
]);
const FILTERS = new Set(["original", "film", "mono", "warm"]);
const ALIGNMENTS = new Set(["left", "center", "right"]);
const SAMPLE_IMAGES = new Set([
  "./assets/sample-landscape.jpg",
  "./assets/sample-coffee.jpg",
]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const DB_NAME = "little-days";
const STORE_NAME = "journal";
const SETTINGS_KEY = "little-days:settings:v1";
let databasePromise;
let observedRevision = 0;
let operationChain = Promise.resolve();

function fail(label, detail) {
  throw new Error(`${label}：${detail}`);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(label, "需要一个对象");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    fail(label, "对象格式不合法");
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) fail(label, "包含不安全的属性");
  }
  return value;
}

function string(value, label, max, allowEmpty = true) {
  if (typeof value !== "string") fail(label, "需要文字");
  if (!allowEmpty && !value.trim()) fail(label, "不能为空");
  if (value.length > max) fail(label, `不能超过 ${max} 个字符`);
  return value;
}

function choice(value, choices, label) {
  if (!choices.has(value)) fail(label, "不是支持的选项");
  return value;
}

function day(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(label, "日期应为 YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail(label, "日期不存在");
  return value;
}

function timestamp(value, label) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  ) {
    fail(label, "时间应为 ISO UTC 格式");
  }
  day(value.slice(0, 10), label);
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
    fail(label, "时间不合法");
  }
  return parsed.toISOString();
}

function number(value, min, max, label) {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail(label, "需要有限数值");
  return Math.min(max, Math.max(min, value));
}

/** Fill optional layout fields, reject malformed values and keep text boxes on paper. */
export function normalizeTextLayout(value, label = "文字布局") {
  object(value, label);
  const result = {};
  for (const key of ["title", "body"]) {
    const fieldLabel = `${label}${key === "title" ? "标题" : "正文"}`;
    const supplied =
      value[key] === undefined ? {} : object(value[key], fieldLabel);
    const source = { ...DEFAULT_TEXT_LAYOUT[key], ...supplied };
    const w = number(source.w, 40, 680, `${fieldLabel}宽度`);
    const h = number(source.h, 30, 800, `${fieldLabel}高度`);
    result[key] = {
      x: Math.min(720 - w, number(source.x, 0, 700, `${fieldLabel}横坐标`)),
      y: Math.min(900 - h, number(source.y, 0, 880, `${fieldLabel}纵坐标`)),
      w,
      h,
      fontSize: number(source.fontSize, 12, 64, `${fieldLabel}字号`),
    };
    if (key === "body")
      result[key].lineHeight = number(
        source.lineHeight,
        16,
        90,
        `${fieldLabel}行高`,
      );
    result[key].align = choice(source.align, ALIGNMENTS, `${fieldLabel}对齐`);
  }
  return result;
}

function imageSource(value, label) {
  if (SAMPLE_IMAGES.has(value)) return value;
  if (
    typeof value !== "string" ||
    value.length > STORAGE_LIMITS.imageDataLength
  ) {
    fail(label, "图片缺失或过大，请使用较小的 PNG、JPEG 或 WebP");
  }
  const match = /^data:image\/(png|jpeg|webp);base64,/.exec(value);
  if (!match) fail(label, "只支持本地 PNG、JPEG、WebP 图片");
  const encoded = value.slice(match[0].length);
  if (
    !encoded ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    fail(label, "图片编码不合法");
  }
  let header;
  try {
    header = atob(encoded.slice(0, 48));
  } catch {
    fail(label, "图片编码不合法");
  }
  const valid =
    match[1] === "png"
      ? header.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "jpeg"
        ? header.startsWith("\xff\xd8\xff")
        : header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
  if (!valid) fail(label, "图片内容与格式不符");
  return value;
}

function validateElement(value, label) {
  object(value, label);
  const type = choice(value.type, TYPES, `${label}类型`);
  const w = number(value.w, 16, 720, `${label}宽度`);
  const h = number(value.h, 16, 900, `${label}高度`);
  const result = {
    id: string(value.id, `${label}标识`, 120, false),
    type,
    x: number(value.x, 16 - w, 704, `${label}横坐标`),
    y: number(value.y, 16 - h, 884, `${label}纵坐标`),
    w,
    h,
    rotation: number(value.rotation ?? 0, -180, 180, `${label}旋转角度`),
  };
  if (type === "photo" || value.src !== undefined)
    result.src = imageSource(value.src, `${label}图片`);
  if (type === "photo") {
    if (value.frame !== undefined && typeof value.frame !== "boolean")
      fail(`${label}相框`, "需要布尔值");
    result.frame = value.frame ?? true;
  }
  if (type === "text" || value.text !== undefined) {
    result.text = string(
      value.text,
      `${label}文字`,
      STORAGE_LIMITS.elementTextLength,
    );
  }
  if (type === "text") {
    if (value.fontSize !== undefined)
      result.fontSize = number(value.fontSize, 12, 64, `${label}字号`);
    if (value.align !== undefined)
      result.align = choice(value.align, ALIGNMENTS, `${label}对齐`);
  }
  if (type === "sticker" || value.sticker !== undefined) {
    result.sticker = choice(value.sticker, STICKERS, `${label}贴纸`);
  }
  if (value.color !== undefined) {
    if (
      typeof value.color !== "string" ||
      !/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value.color)
    ) {
      fail(`${label}颜色`, "请使用十六进制颜色");
    }
    result.color = value.color;
  }
  if (value.filter !== undefined)
    result.filter = choice(value.filter, FILTERS, `${label}滤镜`);
  return result;
}

function validateEntries(entries) {
  if (!Array.isArray(entries)) fail("手帐备份", "日记列表格式不正确");
  if (entries.length > STORAGE_LIMITS.entries)
    fail("手帐备份", `最多支持 ${STORAGE_LIMITS.entries} 篇日记`);
  const ids = new Set();
  return Array.from(entries, (value, index) => {
    const label = `第 ${index + 1} 篇日记`;
    object(value, label);
    const id = string(value.id, `${label}标识`, 120, false);
    if (ids.has(id)) fail(label, "日记标识重复");
    ids.add(id);
    if (
      !Array.isArray(value.elements) ||
      value.elements.length > STORAGE_LIMITS.elementsPerEntry
    ) {
      fail(
        label,
        `拼贴元素必须为列表，且不能超过 ${STORAGE_LIMITS.elementsPerEntry} 个`,
      );
    }
    const elementIds = new Set();
    const elements = Array.from(value.elements, (element, elementIndex) => {
      const result = validateElement(
        element,
        `${label}第 ${elementIndex + 1} 个元素`,
      );
      if (elementIds.has(result.id)) fail(label, "拼贴元素标识重复");
      elementIds.add(result.id);
      return result;
    });
    const result = {
      id,
      date: day(value.date, `${label}日期`),
      title: string(value.title, `${label}标题`, STORAGE_LIMITS.titleLength),
      body: string(value.body, `${label}正文`, STORAGE_LIMITS.bodyLength),
      mood: choice(value.mood, MOODS, `${label}心情`),
      template: choice(value.template, TEMPLATES, `${label}模板`),
      paper: choice(value.paper, PAPERS, `${label}纸张`),
      createdAt: timestamp(value.createdAt, `${label}创建时间`),
      updatedAt: timestamp(value.updatedAt, `${label}修改时间`),
      elements,
    };
    if (value.layout !== undefined)
      result.layout = normalizeTextLayout(value.layout, `${label}文字布局`);
    if (value.paperColor !== undefined) {
      if (
        typeof value.paperColor !== "string" ||
        !/^#[\da-f]{6}$/i.test(value.paperColor)
      ) {
        fail(`${label}自定义纸色`, "请使用六位十六进制颜色");
      }
      result.paperColor = value.paperColor;
    }
    return result;
  });
}

/** Validate every entry before returning anything. Does not write to storage. */
export function validateBackup(value) {
  object(value, "手帐备份");
  if (value.format !== "little-days")
    fail("手帐备份", "不是 Little Days 备份文件");
  if (value.version !== 1) fail("手帐备份", "备份版本不受支持");
  if (value.exportedAt !== undefined)
    timestamp(value.exportedAt, "备份导出时间");
  return validateEntries(value.entries);
}

export function createBackup(entries) {
  return {
    format: "little-days",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: validateEntries(entries),
  };
}

function storageError(message, cause) {
  const quota = cause?.name === "QuotaExceededError";
  return new Error(
    quota ? "本地空间不足，未能保存。请先导出备份，再减少照片大小。" : message,
    { cause },
  );
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error(
          "当前浏览器不支持本地存储，无法保存手帐。请使用支持 IndexedDB 的浏览器。",
        ),
      );
      return;
    }
    let request;
    let settled = false;
    const rejectOnce = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    try {
      request = globalThis.indexedDB.open(DB_NAME, 1);
    } catch (error) {
      rejectOnce(
        storageError("无法打开本地手帐存储。请检查浏览器存储权限。", error),
      );
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME);
    };
    request.onerror = () =>
      rejectOnce(
        storageError(
          "无法打开本地手帐存储。请检查浏览器存储权限。",
          request.error,
        ),
      );
    request.onblocked = () =>
      rejectOnce(
        new Error(
          "本地存储被其他页面占用，请关闭其他 Little Days 页面后重试。",
        ),
      );
    request.onsuccess = () => {
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      settled = true;
      db.onversionchange = () => {
        db.close();
        databasePromise = undefined;
      };
      resolve(db);
    };
  }).catch((error) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

async function transact(mode, execute) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let result;
    let failure;
    const abort = (error) => {
      failure = error;
      try {
        transaction.abort();
      } catch {
        reject(error);
      }
    };
    try {
      transaction = db.transaction(STORE_NAME, mode);
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () =>
        reject(
          failure ||
            storageError(
              "本地手帐读写失败，内容尚未保存。请重试或导出备份。",
              transaction.error,
            ),
        );
      result = execute(transaction.objectStore(STORE_NAME), abort);
    } catch (error) {
      try {
        transaction?.abort();
      } catch {
        /* Already inactive. */
      }
      reject(storageError("无法读写本地手帐。请检查浏览器存储权限。", error));
    }
  });
}

function serialOperation(operation) {
  const pending = operationChain.catch(() => {}).then(operation);
  operationChain = pending;
  return pending;
}

function revisionNumber(value) {
  if (value === undefined) return 0; // Existing v1 libraries predate revision tracking.
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value === Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("本地手帐版本信息损坏，无法安全保存。请先导出备份。");
  }
  return value;
}

/** null = never initialized; [] = deliberately empty library. */
export async function loadEntries() {
  return serialOperation(async () => {
    const record = await transact("readonly", (store) => {
      const result = {};
      const entriesRequest = store.get("entries");
      const revisionRequest = store.get("revision");
      entriesRequest.onsuccess = () => {
        result.entries = entriesRequest.result;
      };
      revisionRequest.onsuccess = () => {
        result.revision = revisionRequest.result;
      };
      return result;
    });
    const entries =
      record.entries === undefined ? null : validateBackup(record.entries);
    const revision = revisionNumber(record.revision);
    observedRevision = revision;
    return entries;
  });
}

/** Resolves only after the complete transaction commits, never on put success. */
export async function saveEntries(entries) {
  const backup = createBackup(entries);
  return serialOperation(async () => {
    const committed = await transact("readwrite", (store, abort) => {
      const result = {};
      const revisionRequest = store.get("revision");
      revisionRequest.onsuccess = () => {
        try {
          const revision = revisionNumber(revisionRequest.result);
          if (revision !== observedRevision) {
            const error = new Error(
              "另一窗口已修改手帐，本窗口的修改尚未保存。请先备份，再刷新后继续。",
            );
            error.code = "STALE_WRITE";
            abort(error);
            return;
          }
          store.put(backup, "entries");
          store.put(revision + 1, "revision");
          result.revision = revision + 1;
        } catch (error) {
          abort(error);
        }
      };
      return result;
    });
    observedRevision = committed.revision;
  });
}

function settingsObject(value) {
  object(value, "手帐设置");
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key.length > 80) fail("手帐设置", "设置名称过长");
    if (item !== null && !["string", "boolean", "number"].includes(typeof item))
      fail("手帐设置", "只支持简单设置值");
    if (typeof item === "number" && !Number.isFinite(item))
      fail("手帐设置", "数值不合法");
    if (typeof item === "string" && item.length > 1000)
      fail("手帐设置", "设置值过长");
    result[key] = item;
  }
  if (Object.keys(result).length > 40) fail("手帐设置", "设置项过多");
  return result;
}

/** Settings are optional; errors remain explicit so callers can show feedback. */
export function readSettings() {
  try {
    const raw = globalThis.localStorage.getItem(SETTINGS_KEY);
    return raw === null ? null : settingsObject(JSON.parse(raw));
  } catch (error) {
    throw storageError("无法读取本地设置。", error);
  }
}

export function saveSettings(value) {
  const settings = settingsObject(value);
  try {
    globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    throw storageError("无法保存本地设置。", error);
  }
}
