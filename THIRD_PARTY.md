# Third-party materials

Little Days' original source code, application icon, eight hand-drawn SVG stickers and three project Skills are covered by the root [MIT License](LICENSE). The materials below have separate terms.

## Bundled sample photographs

The repository includes two locally stored photographs for the fictional starter diary. They are served from the project itself at runtime; the app does not contact Unsplash to display them.

| Local file | Source image | License |
| --- | --- | --- |
| `assets/sample-landscape.jpg` | [Unsplash image photo-1470071459604-3b5ec3a7fe05](https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05) | [Unsplash License](https://unsplash.com/license) |
| `assets/sample-coffee.jpg` | [Unsplash image photo-1442512595331-e89e73853f31](https://images.unsplash.com/photo-1442512595331-e89e73853f31) | [Unsplash License](https://unsplash.com/license) |

License page checked on 2026-10-31. Unsplash permits downloading, copying, modifying, distributing and using covered images, including commercial use. Its license does not permit compiling images to replicate a similar or competing service, and its summary prohibits selling images without significant modification. Consult the linked terms for the complete conditions. The photographs are **not relicensed under MIT**.

The supplied source records identify the image URLs, not verified photographer profile pages. No photographer name or endorsement is inferred. These are demonstration assets; replace them with your own photographs when making a personal diary.

## Design and Skill references

The project researched public journaling and frontend-design repositories. [Design research](docs/design-research.md) and the [machine-readable source index](docs/research-sources.json) record their owners, paths, observed popularity and license distinctions.

Those repositories are references, not bundled dependencies. Their Skill instructions, canonical prompts, scripts and example images are not distributed in Little Days. In particular, the personal/non-commercial or redistribution restrictions of the travel-memory and other cited repositories are not overridden by this project's MIT license.

The three folders under `skills/` contain original Little Days instructions. General concepts such as visual hierarchy, coordinated materials and separate image layers inform their design; the specific local workflow and output contracts are authored for this project. External authors do not endorse Little Days.

## User-created content

Users retain the rights they hold in their own photos and writing. Importing a file into the app does not transfer those rights to the project or license it to other users. The app does not publish or upload private entries.

## Fonts and runtime dependencies

The interface uses system font stacks; no third-party font files are bundled. The app has no npm runtime dependencies. Its optional text AI client uses the local Node proxy and a user-configured OpenAI-compatible API. The selected provider and any optional external image-generation tool have their own terms.
