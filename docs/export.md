# Local image export and original artwork

`src/art.js` contains eight original SVG stickers drawn specifically for Little Days. They are not copied from the third-party inspiration repositories. Each sticker has a transparent 180 × 180 view box and a warm white cut-paper outline. No network requests, font files, AI calls or image libraries are required.

`src/export.js` renders a 720 × 900 diary page to an HTML canvas. The default export uses 2× resolution (1440 × 1800 PNG). `renderEntry(entry, { scale })` returns a canvas for previews; `exportPNG(entry)` renders and downloads the PNG. Export does not read editor DOM, so selection handles and toolbars never appear in the image.

## Editor alignment contract

All positions are in unscaled page pixels. Text coordinates denote top-left positions. The page uses `Georgia, "Songti SC", "Noto Serif CJK SC", serif` for the eyebrow, dates, titles, body and footer, and system sans-serif for mood labels. Fonts are local system fonts, so exact glyph shapes can vary between operating systems.

| Item | Position | Style |
| --- | --- | --- |
| “a little piece of life” | 54, 48 | 12 px italic serif, 1.1 px letter spacing; film uses normal style and 3 px tracking; letter uses `#a1857a`, others `#96977f` |
| Entry date, stored string | 54, 92 | 19 px serif, `#72775f` |
| Mood, icon and Chinese label | 550, 90 | 14 px sans, `#7a8368`, width 116, 20 px line height, 2 lines |
| Title | 54, 145 | 38 px serif, `#414338`, 700 weight / −1 px tracking for zine, 400 otherwise, width 612, 47.5 px line height, height 96, 2 lines |
| Body | 54, 625 | 19 px serif, `#414338`, width 612, 34 px line height, 5 lines |
| Footer rule | 54, 838 to 666, 838 | 1 px, `#d4d6c6` |
| “LITTLE DAYS” | 54, 864 | 10 px serif, `#969780`, 2 px letter spacing |
| Footer date | Right-aligned to 666, 864 | 10 px serif, `#969780`, 2 px letter spacing |

Paper colors: cream `#f8f5ec`, sage `#eef0e5`, pink `#f6eeea`, blue `#eaf0f1`. The `#676753` dot grid starts at (10, 10), repeats every 20 px, uses a radius of 0.65 px, and has opacity 0.12. The same embedded SVG fractal-noise paper texture used by the editor is applied above the content at 0.24 opacity with multiply blending.

An optional validated `entry.paperColor` (`#RRGGBB`) overrides the named paper background. The original `paper` value remains the fallback when no custom color is present; paper texture and other page details are unchanged.

The table describes legacy/default text placement. When `entry.layout` is present, title and body use their saved `x`, `y`, `w`, `h`, `fontSize` and `align` values. `normalizeTextLayout()` shares defaults and bounds with storage so preview/export and import agree. Title line height is `fontSize * 1.25`; body line height comes from `layout.body.lineHeight`. Left, centered and right alignment is computed from each measured wrapped line, including zine tracking. The box height bounds both the number of line boxes and the last line's nominal glyph height, so a font larger than its line spacing cannot silently paint past the text box. An empty box does not cause an overflow error.

Mood ids resolve to the same labels as the editor: happy `☺ 开心`, calm `☼ 平静`, tired `☾ 有点累`, sad `☁ 低落`, spark `✧ 有灵感`. Dates render exactly as stored.

Elements render after the base text, in array order, with rotation around their center. Photos have a `#fffdf7` frame, 10 px top/side borders and 30 px bottom border, with a `2px 5px 8px #34392825` shadow. The image is centered and cropped with cover sizing. Setting a photo element’s `frame` to `false` instead uses centered contain sizing, preserves the source transparency and draws no background, border or shadow; this supports user-supplied transparent PNG stickers. Filters apply only to the image: film `saturate(.75) sepia(.16) contrast(.96)`, warm `sepia(.25) saturate(.85)`, mono `grayscale(1)`. A pixel fallback supports browsers without canvas filters. Stickers preserve their square aspect ratio. Text elements use the saved `fontSize` (12–64 px; default 20 px), `align` (default left), 1.5× line height and the element color (default `#647051`) within their bounds. Tape uses the element color (default `#bfc7a0`) with 0.65 opacity, 1 px pale vertical stripes repeated every 11 px, and the same percentage-based torn polygon as the editor CSS.

Text wraps using measured glyph widths, respects explicit newlines, prefers spaces between words, and handles CJK and emoji. Title and body text are checked against their available space before export; if either would overflow, export rejects with a helpful request to shorten the writing or split it into multiple pages. Text elements also reject overflow and ask the user to enlarge the element or shorten its text. Imported writing is never silently shortened. Input character limits do not guarantee a text box will fit: explicit line breaks, larger fonts or narrow boxes can still cause overflow. The journal retains its full saved text when PNG export is refused; users can enlarge or reposition the text box and try again.

## Error behavior

Unreadable or missing images, invalid stickers, unavailable canvas contexts and PNG serialization failures reject the export with a descriptive error. They are never silently omitted. The caller should show the error to the user. Images use anonymous CORS, so external images without permission cannot contaminate the export. Local and embedded photos need no network access.

PNG is a flattened shareable image, not an editable backup. Preserve journal JSON and embedded photo data through the app’s backup feature to retain editability.

## Deterministic checks

Run `node --test tests/export.test.js`. These dependency-free tests cover English/CJK/grapheme wrapping, overflow errors, embedded SVG artwork, borderless contain geometry, framed cover geometry, title weight, custom title/body positions and alignment, font-relative line height, text-element typography and unreadable-image errors. A minimal canvas call recorder verifies rendering behavior in Node; this complements visual checks in a browser rather than asserting platform-dependent font rasterization.
