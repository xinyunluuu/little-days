# Original layouts and editable page composition

Little Days includes twelve original compositions, authored specifically for this app. They are not copies of third-party Skill templates and do not require image generation, external fonts, remote assets or API calls.

| Template | Category | Composition |
| --- | --- | --- |
| 盐系日常 · `salt` | 日常 | A large tilted hero photo, a smaller overlapping photo, and writing beneath. Preserves the original title/body coordinates. |
| 胶片慢时光 · `film` | 日常 | Two equal photo frames side by side, a centered title, and a lower writing strip. |
| 写给自己 · `letter` | 心情 | A left writing column with small photos and a stamp on the right. |
| 我的小杂志 · `zine` | 创意 | A bold headline, tall right-hand cover image, and a smaller photo above the left writing column. |
| 远方明信片 · `postcard` | 旅行 | A wide landscape photo between a stamped heading and a generous message area. |
| 植物观察簿 · `botanical` | 旅行 | A left photo column with botanical details and an open right writing column. |
| 日常小票 · `receipt` | 日常 | A compact left title and long writing column, balanced by two large right-hand frames. |
| 双人拍立得 · `polaroid` | 旅行 | Two tilted instant-photo frames and a small heart, with centered title and writing underneath. |
| 三格小画廊 · `gallery` | 创意 | Three equally sized vertical photos and a shallow, full-width writing area. |
| 深夜放映室 · `midnight` | 心情 | A wide photo with charcoal film strips and small stars on pale blue paper. |
| 草莓软糖 · `candy` | 心情 | Staggered photos, a butterfly and dusty-pink tape, followed by a separate writing area. |
| 留白一页 · `minimal` | 创意 | A single centered photo, inset writing and deliberate blank space, with no preset decorations. |

The canvas remains 720 × 900. Dates stay at their original header positions; the footer rule remains at y = 838. Templates use only the existing cream, sage, pink and blue papers. “Midnight” means a film-inspired composition; it does not change the page to a dark background.

## Data contract

`src/templates.js` exports `TEMPLATES`, `createTemplateElements(key, options)` and `applyTemplate(entry, key, options)`.

Each template supplies a name, category, paper, description, title/body `layout`, `photoSlots` and editable `decorations`. A title frame contains `x`, `y`, `w`, `h`, `fontSize` and `align`; its line height is `fontSize × 1.25`. A body frame also contains explicit `lineHeight`. All coordinates are page pixels. Template definitions are deeply frozen; callers receive independent copies for editing.

The default writing frames accommodate at least 28 continuous full-width CJK title characters and 150 continuous full-width body characters at the specified sizes. Explicit blank lines, larger custom font sizes, or narrower resized frames can still overflow. The exporter checks actual measured text and reports overflow instead of discarding writing.

## Applying a template safely

`applyTemplate(entry, key, { preserveDecorations: false, createId })` returns a cloned entry. It changes the template, paper, title/body layout and photo positions. It preserves the title, body, dates, mood, metadata, every original photo’s source/filter/frame/ID, and every original text layer’s content, styling, position and ID. It does not mutate the source entry.

By default, existing sticker and tape layers are replaced with the new preset decorations. The app should explain this before applying a new composition and retain undo support. If `preserveDecorations` is true, existing decorations stay where they are and no new preset decorations are added. Preserved text or decorations may need to be moved manually after a layout change; the app never rewrites or deletes them to force a fit.

All decorations remain ordinary editable layers. Users can drag, rotate, resize, recolor or remove them with the same controls as their own materials. Title/body frames are data rather than fixed template artwork, so the editor can offer independent position, size, font size, line-height and alignment adjustments.

No photos are duplicated to fill empty slots. If there are more photos than the preset slots, the photos are arranged into contact-sheet rows inside the template’s reserved photo regions. Separate photo columns stay separate; the algorithm does not place overflow photos over the body. Large sets create small thumbnails, which users can resize or split across multiple pages.

The 120-element cap always prioritizes existing photos and text. Only new preset decorations are omitted when space runs out. More than 120 retained elements produces an actionable error instead of deleting content. Retained layer order is preserved; preset decorations are appended above it.

IDs normally use `crypto.randomUUID()`. Tests or callers can inject `createId: () => string`; generated IDs must be unique and cannot collide with retained layers. `createTemplateElements` returns fresh independent objects on every call.

## Verification

Run `node --test tests/templates.test.js`. The dependency-free checks cover all 12 definitions, writing capacity, preset/photo body clearance, the original salt coordinates, mutation safety, retained content and IDs, preservation options, photo counts through 120, capacity priority, ID collisions and invalid requests. These geometric checks complement browser visual review and do not claim that every font renders identically on every operating system.
