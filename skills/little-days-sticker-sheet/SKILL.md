---
name: little-days-sticker-sheet
description: Plan an original coordinated sticker set for Little Days, and generate transparent PNG assets only when explicitly requested and a suitable image-generation tool is available.
---

# Little Days Sticker Sheet

Make small original materials that can be moved independently in a diary. A composed preview and a set of separate editable files are different deliverables.

## Choose the requested output

- For ideas, a palette or a prompt request: return a motif list and optional prompt; do not generate images.
- For an explicit request to generate stickers: use the available image-generation tool and its current instructions. Do not install an API client, request a secret key or substitute a paid third-party endpoint.
- If generation is unavailable: provide the prompt and motif plan, clearly labeled as ungenerated.

Respect the requested set size. If the user leaves quantity open, state a small proposed set and output format before generating. Do not turn one set into model comparisons, batch evaluations or an open-ended retry loop.

## Design original assets

Build motifs from the user's theme and permitted references. Share a palette and material treatment while keeping each silhouette useful on paper. Do not copy third-party example assets, exact compositions, logos or canonical prompts.

For supplied photos, identify whether each is a source subject or style reference. Preserve recognizable features the user values; do not assume permission to change a person's identity. Inspect local input images first. Before forwarding private photos to an external generation service, obtain explicit consent for those files, destination and purpose; reuse matching consent already given.

## Generate and verify

Prefer one motif per transparent PNG when the user wants separate movable stickers. Request a genuine transparent background through the tool's supported parameter. Keep text out of the bitmap unless requested; normal diary text remains easier to edit as text.

If the user asks for a sheet, space motifs apart so they can be cut later. A single sheet is still one image layer. Do not claim separate assets, vector layers or exact print dimensions unless those outputs actually exist and have been checked. Deterministic cutting/export is an additional file-processing step and should follow the user's requested scope and the environment's image-editing rules.

Inspect the actual output, check dimensions and verify that PNG files contain real transparent pixels when local file inspection is available. A white or checkerboard-looking background is not proof of alpha. If inspection is unavailable, say transparency is unverified. Permit at most one targeted generative correction per failed asset within the already authorized request; report any remaining missing or failed items.

Do not silently reduce an explicitly requested whole set. Produce an honest completion list with file paths, verified dimensions, transparency status and any missing assets.

## Save and use

Keep existing files; use descriptive filenames and versioned output folders. Return separate PNG paths and an optional preview only when created. Little Days accepts PNG, JPEG and WebP; use PNG for transparent stickers. Import each desired file through the app's local image upload, then arrange it on the page. The app contains no image-generation runtime.

No paid/model experiment is authorized by this skill. A benchmark, ablation or quality comparison requires the user's experiment preflight manifest before any API calls.

## Provenance

These are original Little Days instructions. The common practices of cohesive motif sets, independent image layers and checking alpha are adapted to the app's workflow. External inspiration is linked in `docs/design-research.md`; no restricted prompt or third-party example art is included.
