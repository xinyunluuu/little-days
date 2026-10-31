/** Original Little Days artwork. All paths are authored for this project. */
const svg = (content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none"><g stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`;

export const STICKERS = Object.freeze({
  flower: {
    name: "一朵小花",
    svg: svg(
      `<path d="M89 99c3 16 5 37 2 61M92 137c-17-20-31-15-31-15 5 20 20 23 31 18M93 124c9-20 24-21 24-21 0 17-12 24-24 25" stroke="#fffdf7" stroke-width="13"/><path d="M89 99c3 16 5 37 2 61" stroke="#69795b" stroke-width="4"/><path d="M92 137c-17-20-31-15-31-15 5 20 20 23 31 18M93 124c9-20 24-21 24-21 0 17-12 24-24 25" fill="#94a280" stroke="#69795b" stroke-width="2.5"/><path d="M88 48c-13-30-39-20-33 3-30-5-36 22-9 31-25 20-6 41 16 24 1 33 29 36 37 8 20 25 42 9 25-15 32-5 33-33 3-37 16-25-9-43-28-20-2-18-11-22-11 6Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="14"/><path d="M88 48c-13-30-39-20-33 3-30-5-36 22-9 31-25 20-6 41 16 24 1 33 29 36 37 8 20 25 42 9 25-15 32-5 33-33 3-37 16-25-9-43-28-20-2-18-11-22-11 6Z" fill="#ead6b9" stroke="#aa8c67" stroke-width="2"/><path d="M65 74c5-19 34-22 44-3 12 22-15 42-34 29-9-6-13-15-10-26Z" fill="#d9ac65" stroke="#aa8c67" stroke-width="2"/><path d="m78 76 1 1m15-4 1 1m-11 14 1 1m14 4 1 1" stroke="#9e794b" stroke-width="3"/>`,
    ),
  },
  leaf: {
    name: "一枝绿意",
    svg: svg(
      `<path d="M53 156c23-32 48-75 70-132M73 128c-39 4-50-15-43-35 19 3 36 13 43 35M87 105c33 2 53-15 50-37-23 1-40 16-50 37M100 81c-27-6-36-29-25-46 18 9 25 27 25 46M113 55c26-2 35-21 27-37-17 4-23 16-27 37" fill="#fffdf7" stroke="#fffdf7" stroke-width="13"/><path d="M53 156c23-32 48-75 70-132" stroke="#68705b" stroke-width="3"/><path d="M73 128c-39 4-50-15-43-35 19 3 36 13 43 35Z" fill="#a6ad8e" stroke="#68705b" stroke-width="2"/><path d="M87 105c33 2 53-15 50-37-23 1-40 16-50 37Z" fill="#78866d" stroke="#68705b" stroke-width="2"/><path d="M100 81c-27-6-36-29-25-46 18 9 25 27 25 46Z" fill="#b8bea0" stroke="#68705b" stroke-width="2"/><path d="M113 55c26-2 35-21 27-37-17 4-23 16-27 37Z" fill="#929f80" stroke="#68705b" stroke-width="2"/><path d="m39 104 34 24m14-23 40-27m-45-29 18 32m13-26 22-28" stroke="#65705a" stroke-width="1.5"/>`,
    ),
  },
  star: {
    name: "晚安星星",
    svg: svg(
      `<path d="m88 27 20 39 44 8-31 32 3 46-39-21-41 18 8-45-28-35 45-4Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="15"/><path d="m88 27 20 39 44 8-31 32 3 46-39-21-41 18 8-45-28-35 45-4Z" fill="#e6c78b" stroke="#b2915b" stroke-width="2.5"/><path d="m87 43 3 5M42 77l9 2m68 59-3-8" stroke="#f7e6bd" stroke-width="4"/><path d="M74 88v4m27-5v4m-20 12c4 4 9 4 13-1" stroke="#7a654e" stroke-width="2.5"/><path d="m142 35 3 6m-4-1 6-3M24 125l4 8m-6-2 9-4" stroke="#b2915b" stroke-width="2"/>`,
    ),
  },
  heart: {
    name: "留一点喜欢",
    svg: svg(
      `<path d="M88 56C55 15 13 49 36 91c15 26 38 45 55 59 21-22 59-51 58-81-1-37-42-46-61-13Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="15"/><path d="M88 56C55 15 13 49 36 91c15 26 38 45 55 59 21-22 59-51 58-81-1-37-42-46-61-13Z" fill="#c88377" stroke="#9f645c" stroke-width="2.5"/><path d="M48 64c2-11 13-17 24-9" stroke="#e8b1a2" stroke-width="5"/><path d="m85 89 5 5m11-10-4 5M86 110c8 3 13-1 16-7" stroke="#8e594f" stroke-width="2"/>`,
    ),
  },
  coffee: {
    name: "慢慢喝咖啡",
    svg: svg(
      `<path d="M42 77h86l-6 43c-4 21-69 22-74 0Zm85 4c34-7 35 40-5 32M31 144c29-8 82-8 119 0-18 20-104 19-119 0Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="13"/><path d="M127 81c34-7 35 40-5 32" stroke="#816f5c" stroke-width="5"/><path d="M42 77h86l-6 43c-4 21-69 22-74 0Z" fill="#e6dfcf" stroke="#816f5c" stroke-width="2.5"/><ellipse cx="85" cy="77" rx="43" ry="11" fill="#b18a68" stroke="#816f5c" stroke-width="2.5"/><ellipse cx="84" cy="75" rx="32" ry="5" fill="#715c4d"/><path d="M31 144c29-8 82-8 119 0-18 20-104 19-119 0Z" fill="#ddd9c7" stroke="#816f5c" stroke-width="2.5"/><path d="M66 55c-14-15 10-17 1-32m22 36c-13-16 13-22 4-37m18 34c-11-12 6-18 3-26" stroke="#fffdf7" stroke-width="9"/><path d="M66 55c-14-15 10-17 1-32m22 36c-13-16 13-22 4-37m18 34c-11-12 6-18 3-26" stroke="#a79d8a" stroke-width="2.5"/><path d="M78 100c-8-9-17 1-7 9l8 7c5-6 16-13 11-19-4-4-9-1-12 3Z" fill="#a7886f"/>`,
    ),
  },
  butterfly: {
    name: "蝴蝶来信",
    svg: svg(
      `<path d="M87 89C39 9 13 54 37 96c-28 37 17 62 51 13 36 49 78 13 50-15 34-51-12-82-48-4Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="16"/><path d="M87 89C39 9 13 54 37 96c-28 37 17 62 51 13 36 49 78 13 50-15 34-51-12-82-48-4Z" fill="#adb8b8" stroke="#6c8589" stroke-width="2.5"/><path d="M87 92C58 55 36 45 38 62c3 20 23 28 49 30Zm5 3c26-38 49-44 46-26-4 15-22 23-46 26Z" fill="#d5ddcf"/><path d="M85 104c-26-4-43 8-38 19 10 12 25-4 38-19Zm9 0c26 0 42 11 36 22-9 9-25-10-36-22Z" fill="#d5ddcf"/><path d="M86 82c3 14 5 24 3 39m-3-40-7-13m9 14 9-14" stroke="#536d72" stroke-width="3"/><path d="m55 77 2 1m69 4 2-1m-71 38 2-1m63 4-2-1" stroke="#6c8589" stroke-width="3"/>`,
    ),
  },
  stamp: {
    name: "今日邮票",
    svg: svg(
      `<path d="M43 25h96v10h10v13h-10v13h10v13h-10v13h10v13h-10v13h10v13h-10v14h-13v10h-13v-10h-13v10H87v-10H74v10H61v-10H43v-13H33v-13h10v-13H33V88h10V75H33V62h10V49H33V36h10Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="12"/><path d="M43 25h96v10h10v13h-10v13h10v13h-10v13h10v13h-10v13h10v13h-10v14h-13v10h-13v-10h-13v10H87v-10H74v10H61v-10H43v-13H33v-13h10v-13H33V88h10V75H33V62h10V49H33V36h10Z" fill="#eee5cc" stroke="#ba9b77" stroke-width="1.5"/><path d="M52 40h78v86H52Z" fill="#9aab9c" stroke="#7b8d7c" stroke-width="1.5"/><circle cx="107" cy="63" r="12" fill="#efe0b6"/><path d="m53 105 27-30 21 21 12-11 16 19v21H53Z" fill="#6d8775"/><path d="m54 112 22-12 17 14 18-15 18 13v13H54Z" fill="#c8ceb0"/><path d="M61 134h37m8 0h15" stroke="#a98c68" stroke-width="2"/><path d="M19 116c31 0 27 25 58 25m-58-17c31 0 27 25 58 25m-58-17c31 0 27 25 58 25" stroke="#7c7264" stroke-width="1.5" opacity=".6"/>`,
    ),
  },
  sparkle: {
    name: "微小的闪光",
    svg: svg(
      `<path d="M91 28c3 38 11 53 41 60-30 5-40 22-44 57-5-34-16-50-46-56 31-6 45-23 49-61Zm52 78c1 17 6 24 18 28-13 2-17 9-19 24-2-15-7-21-19-25 12-2 18-10 20-27ZM43 28c2 14 6 20 16 23-11 3-15 9-17 22-2-13-6-19-17-22 11-2 16-9 18-23Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="12"/><path d="M91 28c3 38 11 53 41 60-30 5-40 22-44 57-5-34-16-50-46-56 31-6 45-23 49-61Z" fill="#e6d5a8" stroke="#b8a06c" stroke-width="2"/><path d="M143 106c1 17 6 24 18 28-13 2-17 9-19 24-2-15-7-21-19-25 12-2 18-10 20-27ZM43 28c2 14 6 20 16 23-11 3-15 9-17 22-2-13-6-19-17-22 11-2 16-9 18-23Z" fill="#c8ab7a" stroke="#b8a06c" stroke-width="1.5"/><path d="m126 44 5-6m-7 5 8 2M39 127l4 6m-6-2 8-2" stroke="#b8a06c" stroke-width="2"/>`,
    ),
  },
});

const urlCache = new Map();

/** Embedded SVGs work offline and remain safe to draw onto an export canvas. */
export function stickerDataUrl(key) {
  const sticker = STICKERS[key];
  if (!sticker) throw new Error(`Unknown sticker: ${key}`);
  if (!urlCache.has(key)) {
    urlCache.set(
      key,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sticker.svg)}`,
    );
  }
  return urlCache.get(key);
}
