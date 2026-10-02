---
name: infographic-generator
description: "Use this skill when the user provides a visual spec (JSON with palette, typography, coordinates, semantic colors) and needs editorial infographics rendered SVG->PNG at 2x resolution, or when assembling PNG banners into a .docx document from markdown content."
---

# Infographic Generator Skill

## What this skill does

Renders editorial infographics from a JSON specification to SVG, then to PNG at 2× resolution (2000×800 default). Optionally assembles multiple PNG banners into a `.docx` document.

## When to use

- User provides a visual spec with palette, typography, layout
- User needs a branded infographic for a report, article, or social post
- User wants to assemble multiple infographic banners into a Word document

## Inputs

A JSON spec file with:
- `palette` — hex colors: `primary`, `secondary`, `accent`, `background`, `text`
- `typography` — font families and sizes for `title`, `subtitle`, `body`, `mono`
- `layout` — preset name: `hero`, `donut`, `quick-card`, `comparison`
- `content` — structured data matching the layout preset
- `dimensions` — optional `{width, height}` (default 2000×800)

## How to use

### Render a single infographic
```bash
node scripts/render.js <spec.json> [output.png]
```

### Available presets (in `scripts/templates.js`)
1. **hero** — full-width banner with title, subtitle, key metrics
2. **donut** — donut chart with legend and callout stats
3. **quick-card** — compact reference card with bullet points
4. **comparison** — side-by-side comparison table

### Assemble into .docx
```bash
node scripts/assemble-docx.js <markdown.md> <banner1.png> [banner2.png ...] output.docx
```

## Critical gotchas (MUST follow)

### 1. docx lineRule
Always set `lineRule` explicitly in docx paragraph spacing:
```js
spacing: { before: 200, after: 200, lineRule: "exact", line: 240 }
```
Without explicit `lineRule`, LibreOffice interprets line spacing as "exact" and clips inline images, causing title/subtitle overlay.

### 2. Unicode arrows break serif fonts
Gelasio (and similar Georgia replacements) does NOT have the glyph for `→`. The font rendering engine falls back to a sans-serif glyph, breaking the visual consistency of serif text runs.
**Always use ASCII `->` instead of `→` in any text rendered with Gelasio/serif fonts.**

### 3. Image extent vs paragraph line height
When embedding images inline in docx, the paragraph's line height must accommodate the image height. Set the line height to match or exceed the image extent, or use `floating` positioning instead of inline.

### 4. Font family patching for weight matching
The renderer passes `.ttf` file paths to resvg-js through `font.fontFiles`. The files' internal family names and weights must match the SVG declarations. Merely renaming a file does not change its internal font metadata. The renderer does not register `{family, weight, data}` objects or load `.woff2` files.

## Optional custom fonts

Place in `fonts/` directory:
- `Gelasio-Regular.ttf`, `Gelasio-Bold.ttf` — serif, Georgia alternative
- `Inter-Regular.ttf`, `Inter-SemiBold.ttf` — sans-serif, UI font
- `DejaVuSansMono.ttf` — monospace, for code/data

Download the fonts separately; this repository does not bundle them. System fonts provide fallback when the optional files are absent.

## Output specs

- Default: 2000×800 source pixels rendered at 2× pixel dimensions (4000×1600 PNG); no print-DPI metadata is set
- Format: PNG (via resvg-js SVG rasterization)
- Color space: sRGB
