/** Twelve original page compositions, authored for Little Days. No remote assets. */
const title = (x, y, w, h, fontSize, align = "left") => ({
  x,
  y,
  w,
  h,
  fontSize,
  align,
});
const body = (x, y, w, h, fontSize, lineHeight, align = "left") => ({
  x,
  y,
  w,
  h,
  fontSize,
  lineHeight,
  align,
});
const photo = (x, y, w, h, rotation = 0) => ({ x, y, w, h, rotation });
const sticker = (key, x, y, w, h, rotation = 0) => ({
  type: "sticker",
  sticker: key,
  x,
  y,
  w,
  h,
  rotation,
});
const tape = (x, y, w, h, rotation, color) => ({
  type: "tape",
  x,
  y,
  w,
  h,
  rotation,
  color,
});

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const TEMPLATES = freeze({
  salt: {
    name: "盐系日常",
    category: "日常",
    paper: "cream",
    description: "一张大照片、一点草木，留住平常的好。",
    layout: {
      title: title(54, 145, 612, 96, 38),
      body: body(54, 625, 612, 170, 19, 34),
    },
    photoSlots: [photo(77, 250, 470, 315, -5), photo(432, 394, 197, 198, 9)],
    decorations: [
      tape(225, 248, 160, 30, -5, "#bec39c"),
      sticker("flower", 540, 262, 100, 100, 13),
      sticker("leaf", 47, 475, 90, 120, -15),
    ],
  },
  film: {
    name: "胶片慢时光",
    category: "日常",
    paper: "cream",
    description: "两帧并排的胶片，给一天按下暂停。",
    layout: {
      title: title(54, 145, 612, 90, 36, "center"),
      body: body(74, 638, 572, 168, 18, 28),
    },
    photoSlots: [photo(64, 270, 282, 285, -3), photo(374, 270, 282, 285, 3)],
    decorations: [
      tape(110, 250, 160, 28, -4, "#c3a577"),
      tape(430, 250, 160, 28, 4, "#c3a577"),
      sticker("star", 556, 565, 65, 65),
    ],
  },
  letter: {
    name: "写给自己",
    category: "心情",
    paper: "pink",
    description: "左边慢慢写，右边装进两张小小的回忆。",
    layout: {
      title: title(72, 150, 420, 84, 30),
      body: body(72, 270, 316, 448, 18, 28),
    },
    photoSlots: [photo(430, 280, 204, 260, 5), photo(452, 584, 180, 180, -5)],
    decorations: [
      sticker("stamp", 530, 155, 110, 110, 8),
      sticker("flower", 440, 700, 98, 100, 3),
    ],
  },
  zine: {
    name: "我的小杂志",
    category: "创意",
    paper: "blue",
    description: "大标题、双栏和一张竖幅封面，今天也值得刊登。",
    layout: {
      title: title(54, 143, 612, 112, 42),
      body: body(54, 548, 250, 264, 16, 24),
    },
    photoSlots: [photo(334, 284, 320, 442), photo(54, 285, 250, 230)],
    decorations: [
      tape(571, 274, 70, 25, 3, "#b4c6c3"),
      sticker("sparkle", 570, 740, 70, 70),
    ],
  },
  postcard: {
    name: "远方明信片",
    category: "旅行",
    paper: "blue",
    description: "横幅风景铺开，像寄回自己的一张明信片。",
    layout: {
      title: title(54, 152, 480, 82, 32),
      body: body(74, 593, 572, 216, 18, 27),
    },
    photoSlots: [photo(64, 265, 592, 300)],
    decorations: [
      sticker("stamp", 566, 145, 90, 90, 4),
      tape(300, 253, 140, 24, 0, "#bdc9bd"),
    ],
  },
  botanical: {
    name: "植物观察簿",
    category: "旅行",
    paper: "sage",
    description: "左边收集风景，右边记下散步时的发现。",
    layout: {
      title: title(72, 145, 500, 90, 34),
      body: body(340, 295, 300, 510, 18, 30),
    },
    photoSlots: [photo(65, 285, 240, 300, -4), photo(82, 608, 220, 183, 5)],
    decorations: [
      sticker("leaf", 234, 518, 70, 88, 12),
      sticker("flower", 50, 718, 70, 82, -8),
    ],
  },
  receipt: {
    name: "日常小票",
    category: "日常",
    paper: "cream",
    description: "把今天买到、吃到、遇到的小事，一项项收好。",
    layout: {
      title: title(54, 160, 308, 120, 28),
      body: body(54, 312, 308, 492, 17, 28),
    },
    photoSlots: [photo(390, 165, 256, 300, 1), photo(390, 506, 256, 285, -2)],
    decorations: [
      tape(440, 153, 130, 26, 0, "#d1c2a8"),
      tape(468, 497, 100, 26, -2, "#d1c2a8"),
      sticker("coffee", 620, 469, 42, 30),
    ],
  },
  polaroid: {
    name: "双人拍立得",
    category: "旅行",
    paper: "cream",
    description: "两张斜放的拍立得，靠近一点就有了故事。",
    layout: {
      title: title(90, 151, 540, 88, 34, "center"),
      body: body(74, 649, 572, 160, 18, 26),
    },
    photoSlots: [photo(78, 294, 275, 285, -9), photo(377, 275, 275, 285, 8)],
    decorations: [
      tape(268, 264, 130, 28, 12, "#cbbf9d"),
      sticker("heart", 330, 534, 70, 70, -10),
    ],
  },
  gallery: {
    name: "三格小画廊",
    category: "创意",
    paper: "blue",
    description: "三张竖幅整齐并列，把同一天看出不同角度。",
    layout: {
      title: title(54, 151, 612, 82, 32),
      body: body(54, 680, 612, 126, 17, 25),
    },
    photoSlots: [
      photo(54, 275, 192, 355),
      photo(264, 275, 192, 355),
      photo(474, 275, 192, 355),
    ],
    decorations: [
      tape(60, 263, 60, 20, 0, "#bac6c3"),
      sticker("sparkle", 614, 634, 42, 42),
    ],
  },
  midnight: {
    name: "深夜放映室",
    category: "心情",
    paper: "blue",
    description: "深色胶片边框和微光，适合留给夜晚的心事。",
    layout: {
      title: title(54, 152, 612, 88, 34, "center"),
      body: body(74, 630, 572, 176, 18, 28),
    },
    photoSlots: [photo(70, 276, 580, 290)],
    decorations: [
      tape(54, 258, 612, 24, 0, "#414338"),
      tape(54, 564, 612, 24, 0, "#414338"),
      sticker("star", 58, 585, 40, 40, -6),
      sticker("sparkle", 614, 585, 40, 40, 6),
    ],
  },
  candy: {
    name: "草莓软糖",
    category: "心情",
    paper: "pink",
    description: "错落的小照片、粉色胶带，给开心加一点甜。",
    layout: {
      title: title(84, 155, 552, 88, 34, "center"),
      body: body(84, 620, 552, 186, 18, 28),
    },
    photoSlots: [photo(84, 290, 252, 270, -7), photo(383, 315, 252, 260, 7)],
    decorations: [
      sticker("butterfly", 305, 249, 74, 74),
      sticker("heart", 582, 531, 64, 64, -10),
      tape(169, 279, 130, 28, -6, "#d8b4b0"),
    ],
  },
  minimal: {
    name: "留白一页",
    category: "创意",
    paper: "cream",
    description: "一张照片，一段话。其余的地方留给呼吸。",
    layout: {
      title: title(100, 176, 520, 92, 36),
      body: body(100, 570, 520, 234, 18, 29),
    },
    photoSlots: [photo(158, 300, 404, 220)],
    decorations: [],
  },
});

const MAX_ELEMENTS = 120;
const clone = (value) => structuredClone(value);
const defaultId = () => {
  if (!globalThis.crypto?.randomUUID)
    throw new Error("当前浏览器无法生成素材标识，请升级浏览器后重试。");
  return globalThis.crypto.randomUUID();
};

function templateFor(key) {
  if (!Object.hasOwn(TEMPLATES, key))
    throw new Error(`找不到这套版式：${String(key)}`);
  return TEMPLATES[key];
}

function idFactory(createId, used = new Set()) {
  if (typeof createId !== "function")
    throw new TypeError("素材标识生成器需要是一个函数。");
  return () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const id = createId();
      if (typeof id !== "string" || !id.trim() || id.length > 120)
        throw new Error("素材标识生成失败，请重试。");
      if (!used.has(id)) {
        used.add(id);
        return id;
      }
    }
    throw new Error("素材标识重复，请重试。");
  };
}

/** Make editable layers; every call receives fresh objects and unique IDs. */
export function createTemplateElements(key, { createId = defaultId } = {}) {
  const nextId = idFactory(createId);
  return templateFor(key).decorations.map((decoration) => ({
    id: nextId(),
    ...clone(decoration),
  }));
}

const intersects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Overlapping hero-photo slots form one contact-sheet region. Separate columns
// remain separate, so overflow photos can never spill onto a writing column.
function photoRegions(slots) {
  const regions = slots.map(({ x, y, w, h }) => ({ x, y, w, h }));
  let merged;
  do {
    merged = false;
    outer: for (let i = 0; i < regions.length; i += 1) {
      for (let j = i + 1; j < regions.length; j += 1) {
        if (!intersects(regions[i], regions[j])) continue;
        const a = regions[i],
          b = regions[j];
        const x = Math.min(a.x, b.x),
          y = Math.min(a.y, b.y);
        regions[i] = {
          x,
          y,
          w: Math.max(a.x + a.w, b.x + b.w) - x,
          h: Math.max(a.y + a.h, b.y + b.h) - y,
        };
        regions.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  } while (merged);
  return regions;
}

function arrangePhotos(slots, count) {
  if (count <= slots.length) return slots.slice(0, count).map(clone);
  const regions = photoRegions(slots);
  const counts = regions.map(() => 1);
  for (let remaining = count - regions.length; remaining > 0; remaining -= 1) {
    let best = 0;
    for (let i = 1; i < regions.length; i += 1) {
      if (
        (regions[i].w * regions[i].h) / (counts[i] + 1) >
        (regions[best].w * regions[best].h) / (counts[best] + 1)
      )
        best = i;
    }
    counts[best] += 1;
  }
  return regions.flatMap((region, index) => {
    const total = counts[index];
    const columns = Math.min(
      total,
      Math.ceil(Math.sqrt((total * region.w) / region.h)),
    );
    const rows = Math.ceil(total / columns);
    const gap = total > 16 ? 4 : 10;
    const w = (region.w - gap * (columns - 1)) / columns;
    const h = (region.h - gap * (rows - 1)) / rows;
    return Array.from({ length: total }, (_, i) =>
      photo(
        region.x + (i % columns) * (w + gap),
        region.y + Math.floor(i / columns) * (h + gap),
        w,
        h,
      ),
    );
  });
}

/** Apply a composition without mutating the source or discarding saved writing/photos. */
export function applyTemplate(
  entry,
  key,
  { preserveDecorations = false, createId = defaultId } = {},
) {
  const template = templateFor(key);
  if (!entry || typeof entry !== "object" || !Array.isArray(entry.elements))
    throw new TypeError("需要一页有效的手帐。");
  if (
    entry.elements.some(
      (element) =>
        !element ||
        !["photo", "text", "sticker", "tape"].includes(element.type),
    )
  ) {
    throw new TypeError("手帐中有无法识别的素材，请先检查备份。");
  }
  const result = clone(entry);
  const retained = result.elements.filter(
    (element) =>
      preserveDecorations ||
      element.type === "photo" ||
      element.type === "text",
  );
  if (retained.length > MAX_ELEMENTS)
    throw new Error(
      "这一页超过 120 个素材，请先拆分成多页。照片和文字尚未改动。",
    );
  const positions = arrangePhotos(
    template.photoSlots,
    retained.filter((element) => element.type === "photo").length,
  );
  let photoIndex = 0;
  for (const element of retained) {
    if (element.type === "photo")
      Object.assign(element, positions[photoIndex++]);
  }
  const capacity = MAX_ELEMENTS - retained.length;
  const nextId = idFactory(
    createId,
    new Set(retained.map((element) => element.id)),
  );
  const decorations = preserveDecorations
    ? []
    : template.decorations
        .slice(0, capacity)
        .map((decoration) => ({ id: nextId(), ...clone(decoration) }));
  result.template = key;
  result.paper = template.paper;
  delete result.paperColor;
  result.layout = clone(template.layout);
  result.elements = [...retained, ...decorations];
  return result;
}
