---
name: little-days-theme
description: Turn a mood, color preference or journal idea into an original Little Days palette and page-layout proposal. Use for theme planning; it does not generate images or silently change the app.
---

# Little Days Theme

Create a small, usable visual direction for a locally edited diary. This is an optional creator aid; Little Days itself needs no AI service.

## Shape the proposal

Use the user's mood, subject and fixed choices. If details are missing, choose a coherent direction and state the assumption briefly. Do not invent a diary entry, date, location or personal experience.

Choose one design idea tied to the subject, then define:

- Paper, ink, secondary ink, accent and supporting material colors as hex values.
- A readable text treatment and a distinguishable title treatment using available fonts; do not fetch fonts automatically.
- One page composition: where the title, diary text, main photo and optional decoration belong.
- A few original material suggestions that repeat the chosen color and shape language.

Keep decorative materials away from text and faces. A theme may be sparse or lively according to the user's request. Preserve useful working controls and visible focus states instead of treating the whole editor as a poster. Verify actual text/background contrast when proposing interface colors; visual judgment alone is not a contrast measurement.

## Deliver

Return a short theme name, the palette, a layout sketch in words, and the assumptions. If a reusable file is requested, save an original `theme-proposal.json` in the user's chosen output directory with `kind: "little-days-theme-proposal"`, palette and layout notes.

This proposal is a creator document, not an importable Little Days backup. When implementing a theme in a checked-out app, first inspect its current theme definitions and `docs/storage.md`; make code changes only when requested. Never invent supported theme IDs or write directly into the browser database.

No image generation, external upload or paid experiment is needed. If asked to compare model/Skill performance, follow the user's experiment preflight gate before any model calls.

## Provenance

These instructions are original to Little Days. They apply general ideas—limited palettes, typographic hierarchy and intentional spacing—to this local diary. Related research is credited by link in `docs/design-research.md` in the project; no third-party prompt, reference image or theme package is embedded here.
