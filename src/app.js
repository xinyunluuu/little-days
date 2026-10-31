import {
  loadEntries,
  saveEntries,
  createBackup,
  validateBackup,
  STORAGE_LIMITS,
  DEFAULT_TEXT_LAYOUT,
} from "./storage.js";
import { STICKERS, stickerDataUrl } from "./art.js";
import { exportPNG, downloadBlob } from "./export.js";
import {
  TEMPLATES,
  applyTemplate,
  createTemplateElements,
} from "./templates.js";
import { mountAI } from "./ai.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID();
const clone = (value) => structuredClone(value);
const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = dateKey();
const MOODS = {
  happy: ["☺", "开心"],
  calm: ["☼", "平静"],
  tired: ["☾", "有点累"],
  sad: ["☁", "低落"],
  spark: ["✧", "有灵感"],
};
const PAPERS = {
  cream: ["奶油纸", "#f8f5ec"],
  sage: ["鼠尾草", "#eef0e5"],
  pink: ["玫瑰笺", "#f6eeea"],
  blue: ["雾蓝纸", "#eaf0f1"],
};
const PROMPTS = [
  "今天有哪个很小的瞬间，让你想停留一下？",
  "如果把今天装进一个颜色，它会是什么？",
  "最近一次没有目的地的散步，你看到了什么？",
  "写给今天的自己，一句温柔的话。",
  "留住一顿饭、一束光，或者一个人的笑。",
  "今天听到的哪一句话，你还想记得？",
];
const icons = {
  plus: "M12 5v14M5 12h14",
  book: "M4 4h6q2 0 2 2q0-2 2-2h6v15h-6q-2 0-2 2q0-2-2-2H4zM12 6v15",
  sparkles:
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4M18 4h4",
  folder: "M3 7V5h7l2 3h9v12H3z",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4",
  image: "M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M15 7h.01",
  tape: "m6 4 15 5-4 12L2 16zM8 7l9 3M6 13l9 3",
  undo: "M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12",
  redo: "m16 5 5 5-5 5M21 10H10a6 6 0 0 0 0 12",
  search: "M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3",
  move: "M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
};
function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.sparkles}"/></svg>`;
}
$$("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
let entries = [],
  activeId = null,
  selectedId = null,
  scale = 1,
  fitToView = true,
  month = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  filterDate = null;
let past = [],
  future = [],
  saveTimer,
  saveChain = Promise.resolve(),
  dirty = false,
  revision = 0,
  drag = null,
  editingSnapshot = null,
  toastTimer;
let readOnly = false,
  channel = null;
try {
  channel = new BroadcastChannel("little-days:updates");
  channel.onmessage = () => {
    lockEditor("另一窗口修改了手帐。请先备份本窗口，再刷新，避免覆盖。");
  };
} catch {}
function lockEditor(message) {
  readOnly = true;
  if (drag) {
    drag.node.classList.remove("dragging");
    drag = null;
  }
  clearTimeout(saveTimer);
  status("未保存 · 先备份并刷新", true);
  $$(
    "#write-view input,#write-view textarea,#write-view button,#materials-view button,#selection-panel input,#selection-panel textarea,#selection-panel select,#selection-panel button,#text-layout-panel input,#text-layout-panel select,#new-entry,#add-photo,#add-text,#add-tape,#delete-entry,#backup-import",
  ).forEach((el) => (el.disabled = true));
  toast(message, 12000);
}
const current = () => entries.find((e) => e.id === activeId);
const selected = () => current()?.elements.find((e) => e.id === selectedId);
function toast(message, duration = 4200) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), duration);
}
function status(text, error = false) {
  $("#save-status").replaceChildren();
  const dot = document.createElement("i");
  if (error) dot.style.background = "#b07e60";
  $("#save-status").append(dot, document.createTextNode(text));
}
function snapshot() {
  return clone(entries);
}
function remember(state = snapshot()) {
  past.push(state);
  if (past.length > 35) past.shift();
  future = [];
  updateHistory();
}
function updateHistory() {
  $("#undo").disabled = !past.length;
  $("#redo").disabled = !future.length;
}
function changed({ rerender = true } = {}) {
  if (current()) current().updatedAt = new Date().toISOString();
  revision++;
  dirty = true;
  status("正在保存…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
  if (rerender) render();
}
async function persist() {
  clearTimeout(saveTimer);
  if (!dirty) return true;
  if (readOnly) {
    status("未保存 · 先备份并刷新", true);
    return false;
  }
  const data = snapshot(),
    rev = revision;
  saveChain = saveChain
    .catch(() => {})
    .then(async () => {
      if (readOnly) return false;
      try {
        await saveEntries(data);
        if (rev === revision) {
          dirty = false;
          status("已保存在本机");
        }
        channel?.postMessage({ saved: true });
        return true;
      } catch (error) {
        if (error.code === "STALE_WRITE") lockEditor(error.message);
        else {
          status("保存失败 · 请备份", true);
          toast(error.message, 10000);
        }
        return false;
      }
    });
  return saveChain;
}
function change(fn, { rerender = true } = {}) {
  if (readOnly) {
    toast("请先备份并刷新此窗口，再继续编辑。");
    return;
  }
  remember();
  fn();
  changed({ rerender });
}
function undo() {
  if (!past.length || readOnly) return;
  future.push(snapshot());
  entries = past.pop();
  if (!current()) activeId = entries[0]?.id;
  selectedId = null;
  changed();
}
function redo() {
  if (!future.length || readOnly) return;
  past.push(snapshot());
  entries = future.pop();
  if (!current()) activeId = entries[0]?.id;
  selectedId = null;
  changed();
}
function createEntry(date = today, template = "salt") {
  const now = new Date().toISOString();
  return {
    id: uid(),
    date,
    title: "",
    body: "",
    mood: "calm",
    template,
    paper: TEMPLATES[template].paper,
    layout: clone(TEMPLATES[template].layout),
    createdAt: now,
    updatedAt: now,
    elements: decorations(template),
  };
}
function layer(type, props) {
  return {
    id: uid(),
    type,
    x: 100,
    y: 260,
    w: 100,
    h: 100,
    rotation: 0,
    ...props,
  };
}
function decorations(template) {
  return createTemplateElements(template);
}
function seedEntries() {
  const a = createEntry(today);
  a.title = "走慢一点，也没有关系";
  a.body =
    "把消息提示关掉，去山里走了一小段路。\n风吹过的时候，草木和心事一起晃了晃。\n\n没有特别的事发生，就是很喜欢这样的今天。";
  a.elements = [
    layer("photo", {
      src: "./assets/sample-landscape.jpg",
      x: 77,
      y: 250,
      w: 470,
      h: 315,
      rotation: -5,
      filter: "film",
      frame: true,
    }),
    layer("photo", {
      src: "./assets/sample-coffee.jpg",
      x: 432,
      y: 394,
      w: 197,
      h: 198,
      rotation: 9,
      filter: "warm",
      frame: true,
    }),
    layer("tape", {
      x: 225,
      y: 237,
      w: 160,
      h: 38,
      rotation: -9,
      color: "#bec39c",
    }),
    layer("sticker", {
      sticker: "flower",
      x: 510,
      y: 212,
      w: 130,
      h: 140,
      rotation: 13,
    }),
    layer("sticker", {
      sticker: "leaf",
      x: 45,
      y: 493,
      w: 100,
      h: 140,
      rotation: -21,
    }),
    layer("text", {
      text: "slow down, little soul.",
      x: 109,
      y: 575,
      w: 330,
      h: 40,
      rotation: -3,
      color: "#8a8e72",
    }),
  ];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const b = createEntry(dateKey(d), "letter");
  b.title = "给生活加一点甜";
  b.body =
    "路过常去的咖啡店，还是点了熟悉的味道。\n坐在窗边，读了几页一直没读完的书。\n\n原来留一点时间给自己，就已经很好。";
  b.mood = "happy";
  b.elements.unshift(
    layer("photo", {
      src: "./assets/sample-coffee.jpg",
      x: 100,
      y: 260,
      w: 400,
      h: 310,
      rotation: 3,
      filter: "warm",
      frame: true,
    }),
  );
  return [a, applyTemplate(b, "letter")];
}
function render() {
  renderEntries();
  renderCalendar();
  renderPage();
  renderPanel();
  renderSelection();
  updateHistory();
}
function renderEntries() {
  const query = $("#search").value.trim().toLocaleLowerCase();
  const visible = entries
    .filter(
      (e) =>
        (!filterDate || e.date === filterDate) &&
        (!query ||
          `${e.title} ${e.body} ${e.date}`.toLocaleLowerCase().includes(query)),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    );
  $("#entry-count").textContent = entries.length;
  $("#list-label").textContent = filterDate || "最近的日子";
  $("#clear-filter").hidden = !filterDate;
  $("#entry-list").replaceChildren();
  for (const entry of visible) {
    const button = document.createElement("button");
    button.className = `entry-item${entry.id === activeId ? " active" : ""}`;
    button.setAttribute(
      "aria-label",
      `${entry.title || "未命名的一天"} ${entry.date}`,
    );
    const photo = entry.elements.find((e) => e.type === "photo");
    let thumb;
    if (photo) {
      thumb = document.createElement("img");
      thumb.src = photo.src;
      thumb.alt = "";
    } else {
      thumb = document.createElement("span");
      thumb.textContent = entry.date.slice(-2);
    }
    thumb.className = "entry-thumb";
    const content = document.createElement("div"),
      title = document.createElement("strong"),
      date = document.createElement("small");
    title.textContent = entry.title || "未命名的一天";
    date.textContent = `${entry.date.slice(5).replace("-", " / ")}  ·  ${MOODS[entry.mood][1]}`;
    content.append(title, date);
    button.append(thumb, content);
    button.onclick = () => {
      activeId = entry.id;
      selectedId = null;
      $("#sidebar").classList.remove("open");
      render();
    };
    $("#entry-list").append(button);
  }
  if (!visible.length) {
    const p = document.createElement("p");
    p.className = "empty-list";
    p.textContent = "这里还是空白。\n写下今天的第一段回忆吧。";
    $("#entry-list").append(p);
  }
}
function renderCalendar() {
  $("#calendar-title").textContent =
    `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`;
  const grid = $("#calendar-grid");
  grid.replaceChildren();
  const offset = (month.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("span");
    empty.className = "empty-day";
    grid.append(empty);
  }
  for (let i = 1; i <= days; i++) {
    const date = dateKey(new Date(month.getFullYear(), month.getMonth(), i)),
      button = document.createElement("button");
    button.textContent = i;
    button.title = date;
    button.setAttribute("aria-label", `查看 ${date} 的手帐`);
    button.className = [
      date === today ? "today" : "",
      entries.some((e) => e.date === date) ? "has-entry" : "",
      current()?.date === date ? "selected" : "",
    ].join(" ");
    button.onclick = () => {
      filterDate = date;
      const found = entries.find((e) => e.date === date);
      if (found) {
        activeId = found.id;
        selectedId = null;
      }
      render();
    };
    grid.append(button);
  }
}
function renderPage() {
  const entry = current();
  if (!entry) {
    $("#paper-wrap").hidden = true;
    $("#entry-meta").textContent = "还没有日记，点「写下今天」开始。";
    $("#delete-entry").disabled = true;
    $("#export").disabled = true;
    return;
  }
  $("#paper-wrap").hidden = false;
  $("#delete-entry").disabled = false;
  $("#export").disabled = false;
  $("#journal-page").style.setProperty(
    "--paper",
    entry.paperColor || PAPERS[entry.paper][1],
  );
  $("#journal-page").className = `journal-page template-${entry.template}`;
  $("#page-date").textContent = entry.date;
  $("#footer-date").textContent = entry.date;
  $("#page-title").textContent = entry.title;
  $("#page-body").textContent = entry.body;
  renderTextLayout();
  $("#page-mood").textContent =
    `${MOODS[entry.mood][0]} ${MOODS[entry.mood][1]}`;
  $("#entry-meta").textContent =
    `${entry.date}  /  ${entry.elements.length} 个小小片段`;
  const layers = $("#layers");
  layers.replaceChildren();
  for (const element of entry.elements) {
    const el = document.createElement("div");
    el.className = `layer layer-${element.type}${element.id === selectedId ? " selected" : ""}${element.type === "photo" ? ` photo-${element.filter || "original"}${element.frame === false ? " transparent" : ""}` : ""}`;
    el.dataset.id = element.id;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute(
      "aria-label",
      `${element.type === "sticker" ? STICKERS[element.sticker].name : { photo: "照片", text: "文字", tape: "胶带" }[element.type]}，可拖动，方向键移动`,
    );
    positionElement(el, element);
    if (element.type === "photo" || element.type === "sticker") {
      const img = document.createElement("img");
      img.src =
        element.type === "photo"
          ? element.src
          : stickerDataUrl(element.sticker);
      img.alt = "";
      img.draggable = false;
      el.append(img);
    } else if (element.type === "text") {
      el.textContent = element.text;
      el.style.color = element.color || "#647051";
      el.style.fontSize = `${element.fontSize || 20}px`;
      el.style.lineHeight = `${(element.fontSize || 20) * 1.5}px`;
      el.style.textAlign = element.align || "left";
    } else {
      el.style.backgroundColor = element.color || "#bfc7a0";
    }
    el.addEventListener("pointerdown", startDrag);
    el.addEventListener("dblclick", () => {
      selectElement(element.id);
      if (element.type === "text") {
        $("#layer-text").focus();
        $("#layer-text").select();
      }
    });
    el.addEventListener("keydown", layerKeyboard);
    layers.append(el);
  }
  resizeCanvas();
}
function positionElement(el, e) {
  Object.assign(el.style, {
    left: `${e.x}px`,
    top: `${e.y}px`,
    width: `${e.w}px`,
    height: `${e.h}px`,
    transform: `rotate(${e.rotation}deg)`,
  });
}
function resizeCanvas() {
  const available = $("#canvas-stage").clientWidth;
  const heightScale =
    fitToView && window.innerWidth > 620
      ? Math.max(520, window.innerHeight - 345) / 900
      : 1;
  scale = Math.min(1, available / 720, heightScale);
  $("#paper-wrap").style.width = `${720 * scale}px`;
  $("#paper-wrap").style.height = `${900 * scale}px`;
  $("#journal-page").style.transform = `scale(${scale})`;
}
function renderPanel() {
  const entry = current();
  $("#custom-paper").value =
    entry?.paperColor || PAPERS[entry?.paper || "cream"][1];
  $$(".template-button").forEach((b) => {
    b.classList.toggle("active", b.dataset.template === entry?.template);
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.template === entry?.template),
    );
  });
  $$(".color-swatch").forEach((b) => {
    b.classList.toggle("active", b.dataset.paper === entry?.paper);
    b.setAttribute("aria-pressed", String(b.dataset.paper === entry?.paper));
  });
  for (const [id, key] of [
    ["edit-date", "date"],
    ["edit-title", "title"],
    ["edit-body", "body"],
  ]) {
    const input = $(`#${id}`);
    if (document.activeElement !== input) input.value = entry?.[key] || "";
    input.disabled = !entry || readOnly;
  }
  $("#body-count").textContent = `${entry?.body.length || 0} / 1200`;
  $$(".mood-picker button").forEach((b) => {
    b.classList.toggle("active", b.dataset.mood === entry?.mood);
    b.setAttribute("aria-pressed", String(b.dataset.mood === entry?.mood));
  });
}
function selectElement(id) {
  selectedId = id;
  $("#page-title").classList.toggle("core-selected", id === "@title");
  $("#page-body").classList.toggle("core-selected", id === "@body");
  $$(".layer").forEach((el) =>
    el.classList.toggle("selected", el.dataset.id === id),
  );
  renderSelection();
}
function renderSelection() {
  renderCoreSelection();
  const e = selected();
  $("#selection-panel").hidden = !e;
  if (!e) return;
  $("#selection-name").textContent =
    e.type === "sticker"
      ? STICKERS[e.sticker].name
      : { photo: "这一张照片", tape: "这一段胶带", text: "这一段文字" }[e.type];
  $("#layer-size").value = e.w;
  $("#layer-rotation").value = e.rotation;
  $("#size-output").textContent = Math.round(e.w);
  $("#rotation-output").textContent = `${Math.round(e.rotation)}°`;
  $("#layer-text-field").hidden = e.type !== "text";
  if (document.activeElement !== $("#layer-text"))
    $("#layer-text").value = e.text || "";
  $("#filter-field").hidden = e.type !== "photo";
  $("#photo-filter").value = e.filter || "original";
  $("#text-font-field").hidden = e.type !== "text";
  $("#layer-font-size").value = e.fontSize || 20;
  let toggle = $("#frame-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.id = "frame-toggle";
    toggle.className = "outline-button";
    toggle.style.marginBottom = "14px";
    toggle.onclick = () =>
      change(() => {
        selected().frame = selected().frame === false;
      });
    $("#filter-field").after(toggle);
  }
  toggle.hidden = e.type !== "photo";
  toggle.textContent =
    e.frame === false ? "加上拍立得相框" : "去掉相框（透明贴纸）";
}
function startDrag(event) {
  if (event.button !== 0 || readOnly) return;
  event.stopPropagation();
  const element = current().elements.find(
    (e) => e.id === event.currentTarget.dataset.id,
  );
  selectElement(element.id);
  drag = {
    node: event.currentTarget,
    pointerId: event.pointerId,
    id: element.id,
    startX: event.clientX,
    startY: event.clientY,
    x: element.x,
    y: element.y,
    before: snapshot(),
    moved: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("dragging");
}
window.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const element = drag.core
    ? current().layout[drag.core]
    : current().elements.find((e) => e.id === drag.id);
  if (!element) return;
  const dx = (event.clientX - drag.startX) / scale,
    dy = (event.clientY - drag.startY) / scale;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  element.x = Math.max(
    drag.core ? 0 : 16 - element.w,
    Math.min(drag.core ? 720 - element.w : 704, drag.x + dx),
  );
  element.y = Math.max(
    drag.core ? 0 : 16 - element.h,
    Math.min(drag.core ? 900 - element.h : 884, drag.y + dy),
  );
  if (drag.core) renderTextLayout();
  else positionElement(drag.node, element);
});
function finishDrag() {
  if (!drag) return;
  drag.node.classList.remove("dragging");
  if (drag.moved) {
    remember(drag.before);
    changed({ rerender: false });
  }
  drag = null;
}
window.addEventListener("pointerup", finishDrag);
window.addEventListener("pointercancel", finishDrag);
function layerKeyboard(event) {
  const e = current()?.elements.find(
    (el) => el.id === event.currentTarget.dataset.id,
  );
  if (!e) return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    selectedId = e.id;
    const step = event.shiftKey ? 10 : 1;
    change(
      () => {
        e.x = Math.max(
          16 - e.w,
          Math.min(
            704,
            e.x +
              (event.key === "ArrowRight"
                ? step
                : event.key === "ArrowLeft"
                  ? -step
                  : 0),
          ),
        );
        e.y = Math.max(
          16 - e.h,
          Math.min(
            884,
            e.y +
              (event.key === "ArrowDown"
                ? step
                : event.key === "ArrowUp"
                  ? -step
                  : 0),
          ),
        );
      },
      { rerender: false },
    );
    positionElement(event.currentTarget, e);
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    selectedId = e.id;
    deleteLayer();
  }
  if (event.key === "Enter") {
    selectElement(e.id);
    if (e.type === "text") $("#layer-text").focus();
  }
}
function switchTab(write) {
  $("#ai-view").hidden = true;
  $("#tab-ai").classList.remove("active");
  $("#tab-ai").setAttribute("aria-selected", "false");
  $("#materials-view").hidden = write;
  $("#write-view").hidden = !write;
  for (const [id, active] of [
    ["tab-write", write],
    ["tab-materials", !write],
  ]) {
    $(`#${id}`).classList.toggle("active", active);
    $(`#${id}`).setAttribute("aria-selected", String(active));
  }
}
function ensureEntry() {
  if (current()) return true;
  toast("先点「写下今天」，新建一页手帐。");
  return false;
}
function addLayer(e) {
  if (!ensureEntry() || readOnly) return;
  if (current().elements.length >= STORAGE_LIMITS.elementsPerEntry) {
    toast("这一页已放满 120 个素材，试试新的一页。");
    return;
  }
  change(() => {
    current().elements.push(e);
    selectedId = e.id;
  });
}
function deleteLayer() {
  if (!selected()) return;
  change(() => {
    current().elements = current().elements.filter((e) => e.id !== selectedId);
    selectedId = null;
  });
}
async function confirmAction(title, message, button = "确定") {
  const dialog = $("#confirm-dialog");
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-ok").textContent = button;
  dialog.showModal();
  return new Promise((resolve) => {
    const cleanup = (value) => {
      dialog.close();
      $("#confirm-ok").onclick = null;
      $("#confirm-cancel").onclick = null;
      dialog.oncancel = null;
      resolve(value);
    };
    $("#confirm-ok").onclick = () => cleanup(true);
    $("#confirm-cancel").onclick = () => cleanup(false);
    dialog.oncancel = (e) => {
      e.preventDefault();
      cleanup(false);
    };
  });
}
let templateCategory = "全部";
function renderTemplatePicker() {
  const grid = $("#template-grid");
  grid.replaceChildren();
  for (const [key, preset] of Object.entries(TEMPLATES)) {
    if (templateCategory !== "全部" && preset.category !== templateCategory)
      continue;
    const b = document.createElement("button");
    b.className = "template-button";
    b.dataset.template = key;
    b.setAttribute("aria-label", `使用${preset.name}版式`);
    b.title = preset.description;
    const preview = document.createElement("div");
    preview.className = "template-preview dynamic-preview";
    preview.style.background = PAPERS[preset.paper][1];
    for (const slot of preset.photoSlots) {
      const photo = document.createElement("i");
      photo.className = "preview-photo";
      Object.assign(photo.style, {
        left: `${slot.x / 7.2}%`,
        top: `${slot.y / 9}%`,
        width: `${slot.w / 7.2}%`,
        height: `${slot.h / 9}%`,
        transform: `rotate(${slot.rotation}deg)`,
      });
      preview.append(photo);
    }
    for (const [part, box] of Object.entries(preset.layout)) {
      const line = document.createElement("i");
      line.className = `preview-${part}`;
      Object.assign(line.style, {
        left: `${box.x / 7.2}%`,
        top: `${box.y / 9}%`,
        width: `${box.w / 7.2}%`,
        height: `${Math.min(box.h, part === "title" ? box.fontSize * 1.3 : box.h) / 9}%`,
      });
      preview.append(line);
    }
    const label = document.createElement("span");
    label.textContent = preset.name;
    b.append(preview, label);
    b.onclick = async () => {
      if (!ensureEntry() || readOnly) return;
      if (
        !(await confirmAction(
          `换成「${preset.name}」？`,
          "文字与照片都会保留。装饰贴纸和胶带将替换为这套版式；所有位置和字号之后都可以自由调整。",
          "应用版式",
        ))
      )
        return;
      change(() => {
        const next = applyTemplate(current(), key);
        entries[entries.findIndex((e) => e.id === activeId)] = next;
        selectedId = null;
      });
    };
    grid.append(b);
  }
  renderPanel();
}
for (const category of ["全部", "日常", "旅行", "心情", "创意"]) {
  const button = document.createElement("button");
  button.textContent = category;
  button.classList.toggle("active", category === "全部");
  button.onclick = () => {
    templateCategory = category;
    $$("#template-categories button").forEach((b) =>
      b.classList.toggle("active", b === button),
    );
    renderTemplatePicker();
  };
  $("#template-categories").append(button);
}
renderTemplatePicker();
for (const [key, [name, color]] of Object.entries(PAPERS)) {
  const b = document.createElement("button");
  b.className = "color-swatch";
  b.dataset.paper = key;
  b.style.background = color;
  b.title = name;
  b.setAttribute("aria-label", `纸张：${name}`);
  b.onclick = () => {
    if (ensureEntry())
      change(() => {
        current().paper = key;
        delete current().paperColor;
      });
  };
  $("#paper-colors").append(b);
}
for (const [key, { name }] of Object.entries(STICKERS)) {
  const b = document.createElement("button");
  b.className = "sticker-button";
  b.title = name;
  b.setAttribute("aria-label", `添加${name}贴纸`);
  const img = document.createElement("img");
  img.src = stickerDataUrl(key);
  img.alt = "";
  b.append(img);
  b.onclick = () =>
    addLayer(
      layer("sticker", {
        sticker: key,
        x: 270,
        y: 330,
        w: 130,
        h: 130,
        rotation: -5,
      }),
    );
  $("#sticker-grid").append(b);
}
for (const [key, [symbol, name]] of Object.entries(MOODS)) {
  const b = document.createElement("button");
  b.textContent = symbol;
  b.title = name;
  b.dataset.mood = key;
  b.setAttribute("aria-label", name);
  b.onclick = () => {
    if (ensureEntry()) change(() => (current().mood = key));
  };
  $("#mood-picker").append(b);
}
for (const prompt of PROMPTS) {
  const b = document.createElement("button");
  b.textContent = prompt;
  b.onclick = () => {
    $("#writing-prompt").textContent = prompt;
    $("#inspiration-dialog").close();
    switchTab(true);
    $("#edit-body").focus();
  };
  $("#prompt-cards").append(b);
}
$("#new-entry").onclick = () =>
  change(() => {
    const entry = createEntry(filterDate || today);
    entries.unshift(entry);
    activeId = entry.id;
    selectedId = null;
    filterDate = null;
    $("#search").value = "";
    $("#sidebar").classList.remove("open");
    switchTab(true);
    setTimeout(() => $("#edit-title").focus(), 0);
  });
$("#custom-paper").onchange = () => {
  if (ensureEntry())
    change(() => (current().paperColor = $("#custom-paper").value));
};
$("#all-entries").onclick = () => {
  filterDate = null;
  $("#search").value = "";
  renderEntries();
};
$("#clear-filter").onclick = () => {
  filterDate = null;
  renderEntries();
};
$("#search").addEventListener("input", renderEntries);
$("#prev-month").onclick = () => {
  month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  renderCalendar();
};
$("#next-month").onclick = () => {
  month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  renderCalendar();
};
$("#tab-materials").onclick = () => switchTab(false);
$("#tab-write").onclick = () => switchTab(true);
$("#page-title").ondblclick = () => {
  switchTab(true);
  $("#edit-title").focus();
  $("#edit-title").select();
};
$("#page-body").ondblclick = () => {
  switchTab(true);
  $("#edit-body").focus();
};
for (const [id, key] of [
  ["edit-date", "date"],
  ["edit-title", "title"],
  ["edit-body", "body"],
]) {
  const input = $(`#${id}`);
  input.onfocus = () => {
    editingSnapshot = snapshot();
  };
  input.oninput = () => {
    if (!current() || readOnly) return;
    if (key === "date" && (!input.value || !input.validity.valid)) return;
    current()[key] = input.value;
    changed({ rerender: false });
    if (key === "title") {
      $("#page-title").textContent = input.value;
      updateTextOverflow();
    }
    if (key === "body") {
      $("#page-body").textContent = input.value;
      updateTextOverflow();
      $("#body-count").textContent = `${input.value.length} / 1200`;
    }
    if (key === "date") {
      $("#page-date").textContent = input.value;
      $("#footer-date").textContent = input.value;
      renderCalendar();
    }
    renderEntries();
  };
  input.onblur = () => {
    if (
      editingSnapshot &&
      JSON.stringify(editingSnapshot) !== JSON.stringify(entries)
    )
      remember(editingSnapshot);
    editingSnapshot = null;
    if (key === "date") renderPanel();
  };
}
$("#layer-text").onfocus = () => (editingSnapshot = snapshot());
$("#layer-text").oninput = () => {
  if (!selected() || readOnly) return;
  selected().text = $("#layer-text").value;
  changed({ rerender: false });
  const el = $$("[data-id]").find((el) => el.dataset.id === selectedId);
  if (el) el.textContent = selected().text;
};
$("#layer-text").onblur = () => {
  if (editingSnapshot) remember(editingSnapshot);
  editingSnapshot = null;
};
for (const [id, prop] of [
  ["layer-size", "w"],
  ["layer-rotation", "rotation"],
]) {
  const input = $(`#${id}`);
  let before;
  input.onpointerdown = () => (before = snapshot());
  input.onkeydown = () => {
    before ??= snapshot();
  };
  input.oninput = () => {
    const e = selected();
    if (!e || readOnly) return;
    if (prop === "w") {
      const ratio = e.h / e.w;
      e.w = Number(input.value);
      e.h = Math.min(900, e.w * ratio);
    } else e.rotation = Number(input.value);
    changed({ rerender: false });
    const el = $$("[data-id]").find((el) => el.dataset.id === selectedId);
    if (el) positionElement(el, e);
    $("#size-output").textContent = Math.round(e.w);
    $("#rotation-output").textContent = `${Math.round(e.rotation)}°`;
  };
  input.onchange = () => {
    if (before) remember(before);
    before = null;
  };
}
$("#photo-filter").onchange = () => {
  if (selected()) change(() => (selected().filter = $("#photo-filter").value));
};
$("#deselect").onclick = () => selectElement(null);
$("#layer-delete").onclick = deleteLayer;
$("#layer-front").onclick = () => {
  if (selected())
    change(() => {
      const e = selected();
      current().elements = current().elements.filter((el) => el.id !== e.id);
      current().elements.push(e);
    });
};
$("#layer-copy").onclick = () => {
  const e = selected();
  if (e)
    addLayer({
      ...clone(e),
      id: uid(),
      x: Math.min(650, e.x + 20),
      y: Math.min(800, e.y + 20),
    });
};
$("#journal-page").addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".layer,.page-title,.page-body"))
    selectElement(null);
});
$("#add-photo").onclick = () => {
  if (ensureEntry()) $("#photo-input").click();
};
$("#import-sticker").onclick = () => {
  if (ensureEntry()) $("#photo-input").click();
};
async function preparePhoto(file, index) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("支持 PNG、JPEG、WebP 图片，请先转换 HEIC 或其他格式。");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("单张照片不能超过 20 MB，请先缩小图片。");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.width * img.height > 60_000_000)
      throw new Error("照片像素过大，请先缩小到 6000 万像素以内。");
    const ratio = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const transparent = file.type === "image/png";
    const src = canvas.toDataURL(
      transparent ? "image/png" : "image/jpeg",
      0.87,
    );
    if (src.length > STORAGE_LIMITS.imageDataLength)
      throw new Error("处理后的图片仍然过大，请使用较小图片。");
    const w = transparent ? 230 : 330,
      h = transparent
        ? Math.min(400, (230 * img.height) / img.width)
        : Math.min(390, (330 * img.height) / img.width + 30);
    return layer("photo", {
      src,
      x: 120 + index * 18,
      y: 265 + index * 18,
      w,
      h,
      rotation: index % 2 ? 5 : -4,
      filter: "original",
      frame: !transparent,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function importPhotos(files) {
  if (!ensureEntry() || readOnly) return;
  const incoming = [...files];
  if (!incoming.length) return;
  if (
    incoming.length > 12 ||
    current().elements.length + incoming.length > 120
  ) {
    toast("一次最多导入 12 张图片，每页最多 120 个素材。");
    return;
  }
  const entryId = activeId;
  toast("正在把照片收进手帐…", 15000);
  try {
    const photos = [];
    for (let i = 0; i < incoming.length; i++)
      photos.push(await preparePhoto(incoming[i], i));
    if (activeId !== entryId) {
      toast("页面已切换，请在目标页重新导入。");
      return;
    }
    if (current().elements.length + photos.length > 120)
      throw new Error("这一页的素材已变多，请分批导入到新的一页。");
    change(() => {
      current().elements.push(...photos);
      selectedId = photos.at(-1).id;
    });
    toast(`已加入 ${photos.length} 张图片，拖动即可拼贴`);
  } catch (error) {
    toast(error.message, 8000);
  }
}
$("#photo-input").onchange = async () => {
  await importPhotos($("#photo-input").files);
  $("#photo-input").value = "";
};
for (const type of ["dragenter", "dragover"])
  $("#canvas-stage").addEventListener(type, (event) => {
    event.preventDefault();
    $("#canvas-stage").classList.add("drop-active");
  });
$("#canvas-stage").addEventListener("dragleave", () =>
  $("#canvas-stage").classList.remove("drop-active"),
);
$("#canvas-stage").addEventListener("drop", (event) => {
  event.preventDefault();
  $("#canvas-stage").classList.remove("drop-active");
  importPhotos(event.dataTransfer.files);
});
$("#add-text").onclick = () => {
  addLayer(
    layer("text", {
      text: "记住这个瞬间",
      x: 170,
      y: 350,
      w: 300,
      h: 90,
      color: "#637154",
    }),
  );
  $("#layer-text").focus();
  $("#layer-text").select();
};
$("#add-tape").onclick = () =>
  addLayer(
    layer("tape", {
      x: 265,
      y: 285,
      w: 170,
      h: 38,
      rotation: -8,
      color: "#bdc5a0",
    }),
  );
$("#undo").onclick = undo;
$("#redo").onclick = redo;
$("#fit").textContent = "放大";
$("#fit").onclick = () => {
  fitToView = !fitToView;
  $("#fit").textContent = fitToView ? "放大" : "适合";
  resizeCanvas();
};
$("#prompt-next").onclick = () => {
  $("#writing-prompt").textContent =
    PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
};
$("#inspiration-open").onclick = () => $("#inspiration-dialog").showModal();
$("#backup-open").onclick = () => $("#settings-dialog").showModal();
$$("[data-close]").forEach(
  (b) => (b.onclick = () => b.closest("dialog").close()),
);
$("#toggle-sidebar").onclick = () => $("#sidebar").classList.toggle("open");
$("#delete-entry").onclick = async () => {
  if (!current()) return;
  if (
    await confirmAction(
      "把这一页收起来？",
      "这一页会从手帐中删除。当前窗口内可以用撤销恢复，关闭页面后无法撤销。",
      "删除这一页",
    )
  )
    change(() => {
      entries = entries.filter((e) => e.id !== activeId);
      activeId = entries[0]?.id;
      selectedId = null;
    });
};
$("#export").onclick = async () => {
  if (!current()) return;
  const button = $("#export");
  button.disabled = true;
  const entry = clone(current());
  try {
    await persist();
    await exportPNG(entry);
    toast("这一页已导出为 PNG · 1440 × 1800");
  } catch (error) {
    toast(`导出未完成：${error.message}`, 9000);
  } finally {
    button.disabled = false;
  }
};
$("#backup-download").onclick = () => {
  try {
    const backup = createBackup(entries);
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      `little-days-backup-${today}.json`,
    );
    toast("完整备份已下载，包含文字、照片和所有图层");
  } catch (error) {
    toast(error.message, 9000);
  }
};
$("#backup-import").onclick = () => $("#backup-input").click();
$("#backup-input").onchange = async () => {
  const file = $("#backup-input").files[0];
  $("#backup-input").value = "";
  if (!file) return;
  try {
    if (file.size > STORAGE_LIMITS.importBytes)
      toast("备份较大，正在读取，请保持页面打开…", 20000);
    const incoming = validateBackup(JSON.parse(await file.text()));
    if (readOnly) throw new Error("请先备份并刷新此窗口，再导入。");
    const merged = createBackup(entries).entries;
    let count = 0;
    for (const entry of incoming) {
      const old = merged.find((e) => e.id === entry.id);
      if (old && JSON.stringify(old) === JSON.stringify(entry)) continue;
      if (old) entry.id = uid();
      merged.push(entry);
      count++;
    }
    createBackup(merged);
    if (!count) {
      toast("这些日记已经在手帐里了");
      return;
    }
    change(() => {
      entries = merged;
      activeId = entries.at(-1).id;
      selectedId = null;
      filterDate = null;
      $("#search").value = "";
    });
    if (!(await persist())) return;
    $("#settings-dialog").close();
    toast(`已合并 ${count} 页日记，原有记录完整保留`);
  } catch (error) {
    toast(`导入未完成：${error.message}`, 10000);
  }
};

function coreLayout() {
  const e = current();
  if (!e) return null;
  e.layout ??= clone(DEFAULT_TEXT_LAYOUT);
  return e.layout;
}
function updateTextOverflow() {
  requestAnimationFrame(() => {
    const overflow = ["title", "body"].some((key) => {
      const n = $(`#page-${key}`);
      return n.scrollHeight > n.clientHeight + 2;
    });
    $("#text-overflow-note").hidden = !overflow;
  });
}
function renderTextLayout() {
  const layout = coreLayout();
  if (!layout) return;
  for (const key of ["title", "body"]) {
    const box = layout[key],
      node = $(`#page-${key}`);
    Object.assign(node.style, {
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.w}px`,
      height: `${box.h}px`,
      fontSize: `${box.fontSize}px`,
      lineHeight: `${key === "title" ? box.fontSize * 1.25 : box.lineHeight}px`,
      textAlign: box.align || "left",
    });
    node.classList.toggle("core-selected", selectedId === `@${key}`);
  }
  updateTextOverflow();
}
function renderCoreSelection() {
  const key =
    selectedId === "@title" ? "title" : selectedId === "@body" ? "body" : null;
  $("#text-layout-panel").hidden = !key;
  if (!key || !current()) return;
  const box = coreLayout()[key];
  $("#core-heading").textContent = key === "title" ? "标题排版" : "正文排版";
  for (const property of ["fontSize", "w", "h", "x", "y"]) {
    $(`#core-${property}`).value = box[property];
  }
  $("#core-align").value = box.align || "left";
  $("#core-lineheight-field").hidden = key === "title";
  $("#core-lineHeight").value =
    box.lineHeight || Math.round(box.fontSize * 1.25);
}
for (const key of ["title", "body"]) {
  const node = $(`#page-${key}`);
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.setAttribute(
    "aria-label",
    key === "title" ? "调整标题位置和字号" : "调整正文位置和字号",
  );
  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || readOnly) return;
    event.stopPropagation();
    const box = coreLayout()[key];
    selectElement(`@${key}`);
    drag = {
      core: key,
      node,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: box.x,
      y: box.y,
      before: snapshot(),
      moved: false,
    };
    node.setPointerCapture(event.pointerId);
  });
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectElement(`@${key}`);
      return;
    }
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      const box = coreLayout()[key],
        step = event.shiftKey ? 10 : 1;
      change(() => {
        box.x = Math.max(
          0,
          Math.min(
            720 - box.w,
            box.x +
              (event.key === "ArrowRight"
                ? step
                : event.key === "ArrowLeft"
                  ? -step
                  : 0),
          ),
        );
        box.y = Math.max(
          0,
          Math.min(
            900 - box.h,
            box.y +
              (event.key === "ArrowDown"
                ? step
                : event.key === "ArrowUp"
                  ? -step
                  : 0),
          ),
        );
      });
    }
  });
}
for (const property of ["fontSize", "w", "h", "x", "y", "lineHeight"]) {
  $(`#core-${property}`).onchange = () => {
    const key = selectedId?.slice(1);
    if (!["title", "body"].includes(key) || readOnly) return;
    const input = $(`#core-${property}`),
      value = Number(input.value);
    if (
      !input.value.trim() ||
      !Number.isFinite(value) ||
      !input.validity.valid
    ) {
      renderCoreSelection();
      return;
    }
    change(() => {
      const box = coreLayout()[key];
      box[property] = value;
      box.w = Math.min(680, box.w);
      box.h = Math.min(800, box.h);
      box.x = Math.max(0, Math.min(720 - box.w, box.x));
      box.y = Math.max(0, Math.min(900 - box.h, box.y));
    });
  };
}
$("#core-align").onchange = () => {
  const key = selectedId?.slice(1);
  if (["title", "body"].includes(key))
    change(() => (coreLayout()[key].align = $("#core-align").value));
};
$("#core-deselect").onclick = () => selectElement(null);
$("#layer-font-size").onchange = () => {
  if (selected()?.type === "text")
    change(() => (selected().fontSize = Number($("#layer-font-size").value)));
};
$("#tab-ai").onclick = () => {
  $("#materials-view").hidden = true;
  $("#write-view").hidden = true;
  $("#ai-view").hidden = false;
  for (const id of ["tab-materials", "tab-write"]) {
    $(`#${id}`).classList.remove("active");
    $(`#${id}`).setAttribute("aria-selected", "false");
  }
  $("#tab-ai").classList.add("active");
  $("#tab-ai").setAttribute("aria-selected", "true");
  selectElement(null);
};
mountAI({
  container: $("#ai-view"),
  getEntry: current,
  toast,
  onApply: (next) => {
    if (readOnly) {
      toast("请先备份并刷新，当前窗口不能修改。");
      return false;
    }
    change(() => {
      entries[entries.findIndex((e) => e.id === activeId)] = next;
      selectedId = null;
    });
    return true;
  },
});
window.addEventListener("keydown", (event) => {
  const editing = event.target.matches(
    "input,textarea,select,[contenteditable=true]",
  );
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    persist();
  }
  if (
    !editing &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "z"
  ) {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  }
  if (
    !editing &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "y"
  ) {
    event.preventDefault();
    redo();
  }
  if (event.key === "Escape") {
    $("#sidebar").classList.remove("open");
    selectElement(null);
  }
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persist();
});
new ResizeObserver(resizeCanvas).observe($("#canvas-stage"));
try {
  entries = await loadEntries();
  if (entries === null) {
    entries = seedEntries();
    await saveEntries(entries);
    toast("为你放了两页示例。点「写下今天」，开始自己的故事。", 7000);
  }
  activeId = entries[0]?.id;
  status("已保存在本机");
  render();
} catch (error) {
  readOnly = true;
  status("无法打开本地手帐", true);
  toast(error.message, 20000);
  $("#canvas-stage").innerHTML =
    '<p class="load-error">无法打开本地存储。请检查浏览器权限并刷新。<br>现有数据不会被覆盖。</p>';
  $("#new-entry").disabled = true;
  $("#export").disabled = true;
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
