import { stickerDataUrl } from "./art.js";
import { DEFAULT_TEXT_LAYOUT, normalizeTextLayout } from "./storage.js";

export const PAGE_WIDTH = 720;
export const PAGE_HEIGHT = 900;
export const PAPER_COLORS = Object.freeze({
  cream: "#f8f5ec",
  sage: "#eef0e5",
  pink: "#f6eeea",
  blue: "#eaf0f1",
});
export const PHOTO_FILTERS = Object.freeze({
  original: "none",
  film: "saturate(.75) sepia(.16) contrast(.96)",
  warm: "sepia(.25) saturate(.85)",
  mono: "grayscale(1)",
});

const SERIF = 'Georgia, "Songti SC", "Noto Serif CJK SC", serif';
const SANS =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
const MOODS = {
  happy: "☺ 开心",
  calm: "☼ 平静",
  tired: "☾ 有点累",
  sad: "☁ 低落",
  spark: "✧ 有灵感",
};
const GRAIN_SVG = `<svg width="720" height="720" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" stitchTiles="stitch"/></filter><path fill="#817764" opacity=".075" filter="url(#n)" d="M0 0h180v180H0z"/></svg>`;

const number = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const graphemes = (text) =>
  typeof Intl?.Segmenter === "function"
    ? Array.from(
        new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text),
        ({ segment }) => segment,
      )
    : Array.from(text);

/** Canvas-measured wrapping, including CJK, emoji, explicit paragraphs and long words. */
export function wrapText(ctx, text, maxWidth, maxLines = Infinity) {
  const width = Math.max(1, number(maxWidth, 1));
  const lines = [];
  const paragraphs = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");

  for (const paragraph of paragraphs) {
    const chars = graphemes(paragraph);
    if (!chars.length) {
      lines.push("");
      continue;
    }
    let start = 0;
    while (start < chars.length) {
      let end = start;
      let lastSpace = -1;
      while (end < chars.length) {
        const candidate = chars.slice(start, end + 1).join("");
        if (ctx.measureText(candidate).width > width && end > start) break;
        if (/\s/u.test(chars[end])) lastSpace = end;
        end += 1;
      }
      // Prefer a word boundary; a single long word still wraps safely.
      if (end < chars.length && lastSpace > start) end = lastSpace + 1;
      lines.push(chars.slice(start, end).join("").trimEnd());
      start = end;
      while (start < chars.length && /\s/u.test(chars[start])) start += 1;
    }
  }

  const limit = Math.max(0, Math.floor(maxLines));
  if (lines.length <= limit) return lines;
  if (!limit) return [];
  const result = lines.slice(0, limit);
  const tail = graphemes(result[limit - 1]);
  while (
    tail.length &&
    ctx.measureText(`${tail.join("").trimEnd()}…`).width > width
  )
    tail.pop();
  result[limit - 1] = `${tail.join("").trimEnd()}…`;
  return result;
}

/** Refuse to drop saved writing from the exported page. Useful without a browser. */
export function assertTextFits(ctx, text, width, maxLines, label = "文字") {
  const lines = wrapText(ctx, text, width);
  if (
    lines.length > maxLines ||
    lines.some((line) => ctx.measureText(line).width > width)
  ) {
    throw new Error(
      `${label}超出了这一页的空间，请缩短内容或拆分成多页后再导出。`,
    );
  }
  return lines;
}

function drawParagraph(
  ctx,
  text,
  x,
  y,
  width,
  lineHeight,
  maxLines,
  label,
  spacing = 0,
  align = "left",
) {
  if (text === "" || text === undefined || text === null) return;
  const measured = spacing
    ? { measureText: (value) => ({ width: trackedWidth(ctx, value, spacing) }) }
    : ctx;
  const lines = label
    ? assertTextFits(measured, text, width, maxLines, label)
    : wrapText(measured, text, width, maxLines);
  ctx.textAlign = "left";
  lines.forEach((line, index) => {
    const lineWidth = measured.measureText(line).width;
    const left =
      x +
      (align === "center"
        ? (width - lineWidth) / 2
        : align === "right"
          ? width - lineWidth
          : 0);
    if (spacing) trackedText(ctx, line, left, y + index * lineHeight, spacing);
    else ctx.fillText(line, left, y + index * lineHeight);
  });
}

function trackedWidth(ctx, text, spacing) {
  return graphemes(text).reduce(
    (width, char) => width + ctx.measureText(char).width + spacing,
    0,
  );
}

function trackedText(ctx, text, x, y, spacing) {
  for (const char of graphemes(text)) {
    ctx.fillText(char, x, y);
    x += ctx.measureText(char).width + spacing;
  }
}

function fittingLines(height, lineHeight, fontSize) {
  return Math.max(
    0,
    Math.min(
      Math.floor(height / lineHeight),
      Math.floor((height - fontSize) / lineHeight) + 1,
    ),
  );
}

function renderPaper(ctx, entry) {
  ctx.fillStyle =
    entry.paperColor || PAPER_COLORS[entry.paper] || PAPER_COLORS.cream;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.save();
  ctx.fillStyle = "#676753";
  ctx.globalAlpha = 0.12;
  for (let x = 10; x < PAGE_WIDTH; x += 20) {
    for (let y = 10; y < PAGE_HEIGHT; y += 20) {
      ctx.beginPath();
      ctx.arc(x, y, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.textBaseline = "top";
  ctx.fillStyle = entry.template === "letter" ? "#a1857a" : "#96977f";
  ctx.font = `${entry.template === "film" ? "normal" : "italic"} 400 12px ${SERIF}`;
  trackedText(
    ctx,
    "a little piece of life",
    54,
    48,
    entry.template === "film" ? 3 : 1.1,
  );
  ctx.fillStyle = "#72775f";
  ctx.font = `400 19px ${SERIF}`;
  ctx.fillText(String(entry.date || ""), 54, 92);
  ctx.fillStyle = "#7a8368";
  ctx.font = `400 14px ${SANS}`;
  drawParagraph(
    ctx,
    MOODS[entry.mood] || entry.mood || "",
    550,
    90,
    116,
    20,
    2,
  );
  const layout =
    entry.layout === undefined
      ? DEFAULT_TEXT_LAYOUT
      : normalizeTextLayout(entry.layout);
  const title = layout.title;
  const body = layout.body;
  ctx.fillStyle = "#414338";
  ctx.font = `${entry.template === "zine" ? 700 : 400} ${title.fontSize}px ${SERIF}`;
  const titleLineHeight = title.fontSize * 1.25;
  drawParagraph(
    ctx,
    entry.title || "",
    title.x,
    title.y,
    title.w,
    titleLineHeight,
    fittingLines(title.h, titleLineHeight, title.fontSize),
    "标题",
    entry.template === "zine" ? -1 : 0,
    title.align,
  );
  ctx.font = `400 ${body.fontSize}px ${SERIF}`;
  drawParagraph(
    ctx,
    entry.body || "",
    body.x,
    body.y,
    body.w,
    body.lineHeight,
    fittingLines(body.h, body.lineHeight, body.fontSize),
    "正文",
    0,
    body.align,
  );
  ctx.strokeStyle = "#d4d6c6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(54, 838);
  ctx.lineTo(666, 838);
  ctx.stroke();
  ctx.fillStyle = "#969780";
  ctx.font = `400 10px ${SERIF}`;
  trackedText(ctx, "LITTLE DAYS", 54, 864, 2);
  const footerDate = String(entry.date || "");
  trackedText(ctx, footerDate, 666 - trackedWidth(ctx, footerDate, 2), 864, 2);
}

async function renderGrain(ctx) {
  const image = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GRAIN_SVG)}`,
  );
  const pattern = ctx.createPattern(image, "repeat");
  if (!pattern) throw new Error("纸张纹理无法读取，请重试导出。");
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.restore();
}

function loadImage(src) {
  if (typeof src !== "string" || !src)
    return Promise.reject(
      new Error("这张照片没有可用的图片数据，请重新添加。"),
    );
  return new Promise((resolve, reject) => {
    const image = new Image();
    let timeout;
    const finish = (error) => {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    };
    image.onload = () =>
      image.naturalWidth && image.naturalHeight
        ? finish()
        : finish(new Error("有一张图片尺寸无效，请重新添加后导出。"));
    image.onerror = () =>
      finish(new Error("有一张图片无法读取，请重新添加后导出。"));
    // Same-origin, data and blob URLs stay offline; CORS prevents tainted exports.
    image.crossOrigin = "anonymous";
    timeout = setTimeout(
      () => finish(new Error("图片读取超时，请检查图片后重试。")),
      15000,
    );
    image.src = src;
  });
}

function coverImage(ctx, image, x, y, width, height) {
  const ratio = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  ctx.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function containImage(ctx, image, x, y, width, height) {
  const ratio = Math.min(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const imageWidth = image.naturalWidth * ratio;
  const imageHeight = image.naturalHeight * ratio;
  ctx.drawImage(
    image,
    x + (width - imageWidth) / 2,
    y + (height - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );
}

/** Pixel fallback for browsers without CanvasRenderingContext2D.filter. */
function applyPixelFilter(ctx, width, height, filter) {
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  const saturate = (r, g, b, amount) => {
    const luma = r * 0.213 + g * 0.715 + b * 0.072;
    return [
      luma + amount * (r - luma),
      luma + amount * (g - luma),
      luma + amount * (b - luma),
    ];
  };
  const sepia = (r, g, b, amount) => [
    r * (1 - amount) + (r * 0.393 + g * 0.769 + b * 0.189) * amount,
    g * (1 - amount) + (r * 0.349 + g * 0.686 + b * 0.168) * amount,
    b * (1 - amount) + (r * 0.272 + g * 0.534 + b * 0.131) * amount,
  ];
  for (let i = 0; i < data.length; i += 4) {
    let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (filter === "mono") [r, g, b] = saturate(r, g, b, 0);
    else if (filter === "warm")
      [r, g, b] = saturate(...sepia(r, g, b, 0.25), 0.85);
    else if (filter === "film") {
      [r, g, b] = sepia(...saturate(r, g, b, 0.75), 0.16);
      [r, g, b] = [r, g, b].map((value) => (value - 127.5) * 0.96 + 127.5);
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  ctx.putImageData(pixels, 0, 0);
}

async function drawPhoto(ctx, element, width, height, scale) {
  const image = await loadImage(element.src);
  const framed = element.frame !== false;
  const inset = framed ? 10 : 0;
  const innerWidth = Math.max(1, width - (framed ? 20 : 0));
  const innerHeight = Math.max(1, height - (framed ? 40 : 0));
  const drawImage = framed ? coverImage : containImage;
  if (framed) {
    ctx.fillStyle = "#fffdf7";
    ctx.shadowColor = "#34392825";
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 5 * scale;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const filter = PHOTO_FILTERS[element.filter] ? element.filter : "original";
  if (filter === "original" || "filter" in ctx) {
    ctx.save();
    ctx.filter = PHOTO_FILTERS[filter];
    drawImage(ctx, image, inset, inset, innerWidth, innerHeight);
    ctx.restore();
  } else {
    const photo = document.createElement("canvas");
    photo.width = Math.max(1, Math.round(innerWidth * scale));
    photo.height = Math.max(1, Math.round(innerHeight * scale));
    const photoCtx = photo.getContext("2d", { willReadFrequently: true });
    if (!photoCtx)
      throw new Error("当前浏览器无法处理照片，请使用更新版本的浏览器。");
    drawImage(photoCtx, image, 0, 0, photo.width, photo.height);
    applyPixelFilter(photoCtx, photo.width, photo.height, filter);
    ctx.drawImage(photo, inset, inset, innerWidth, innerHeight);
  }
}

function drawTape(ctx, element, width, height) {
  const points = [
    [2, 0],
    [98, 2],
    [96, 15],
    [100, 28],
    [97, 43],
    [100, 59],
    [97, 78],
    [100, 100],
    [1, 96],
    [3, 80],
    [0, 63],
    [3, 45],
    [0, 24],
  ];
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    ctx[index ? "lineTo" : "moveTo"]((width * x) / 100, (height * y) / 100),
  );
  ctx.closePath();
  ctx.clip();
  const stripe = document.createElement("canvas");
  stripe.width = 11;
  stripe.height = 1;
  const stripeCtx = stripe.getContext("2d");
  if (!stripeCtx) throw new Error("当前浏览器无法绘制胶带，请重试导出。");
  stripeCtx.fillStyle = element.color || "#bfc7a0";
  stripeCtx.fillRect(0, 0, 11, 1);
  stripeCtx.fillStyle = "#ffffff35";
  stripeCtx.fillRect(10, 0, 1, 1);
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = ctx.createPattern(stripe, "repeat");
  ctx.fillRect(0, 0, width, height);
}

async function renderElement(ctx, element, scale) {
  const width = Math.max(1, number(element.w, 100));
  const height = Math.max(1, number(element.h, 100));
  ctx.save();
  ctx.translate(number(element.x) + width / 2, number(element.y) + height / 2);
  ctx.rotate((number(element.rotation) * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);
  try {
    if (element.type === "photo")
      await drawPhoto(ctx, element, width, height, scale);
    else if (element.type === "sticker") {
      const image = await loadImage(
        stickerDataUrl(element.sticker || "flower"),
      );
      const size = Math.min(width, height);
      ctx.drawImage(image, (width - size) / 2, (height - size) / 2, size, size);
    } else if (element.type === "text") {
      const fontSize = Math.min(64, Math.max(12, number(element.fontSize, 20)));
      const lineHeight = fontSize * 1.5;
      ctx.fillStyle = element.color || "#647051";
      ctx.font = `400 ${fontSize}px ${SERIF}`;
      ctx.textBaseline = "top";
      try {
        drawParagraph(
          ctx,
          element.text || "",
          0,
          0,
          width,
          lineHeight,
          fittingLines(height, lineHeight, fontSize),
          "文字素材",
          0,
          element.align || "left",
        );
      } catch {
        throw new Error(
          "有一段文字素材超出了空间，请放大素材或缩短文字后再导出。",
        );
      }
    } else if (element.type === "tape") drawTape(ctx, element, width, height);
  } finally {
    ctx.restore();
  }
}

/** Render the same 720 × 900 document the editor displays, entirely in-browser. */
export async function renderEntry(entry, { scale = 2 } = {}) {
  if (!entry || typeof entry !== "object")
    throw new Error("没有可导出的手帐。");
  const resolution = Math.min(4, Math.max(0.5, number(scale, 2)));
  // Wait for system font fallback/layout to settle when the browser exposes this API.
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE_WIDTH * resolution);
  canvas.height = Math.round(PAGE_HEIGHT * resolution);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成图片，请使用更新版本的浏览器。");
  ctx.scale(canvas.width / PAGE_WIDTH, canvas.height / PAGE_HEIGHT);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  renderPaper(ctx, entry);
  for (const element of entry.elements || [])
    await renderElement(ctx, element, resolution);
  await renderGrain(ctx);
  return canvas;
}

export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) throw new Error("下载内容无效。");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive long enough for Safari and large backups to begin downloading.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function exportPNG(entry) {
  const canvas = await renderEntry(entry);
  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("图片导出失败，请重试。")),
        "image/png",
      );
    } catch {
      reject(new Error("有一张图片无法安全导出，请重新添加本地照片。"));
    }
  });
  const date = String(entry.date || "journal").replace(/[^\dA-Za-z_-]/g, "-");
  downloadBlob(blob, `little-days-${date}.png`);
  return blob;
}
