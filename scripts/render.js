#!/usr/bin/env node

/**
 * Infographic renderer: JSON spec -> SVG -> PNG @ 2×
 *
 * Usage: node render.js <spec.json> [output.png]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PRESETS } from "./templates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, "..", "fonts");

/**
 * Load font files if they exist in the fonts directory.
 * Returns an array of font config objects for resvg-js.
 */
function loadFonts() {
  const fonts = [];
  const fontFiles = [
    { file: "Gelasio-Regular.ttf", family: "Gelasio", weight: 400 },
    { file: "Gelasio-Bold.ttf", family: "Gelasio", weight: 700 },
    { file: "Inter-Regular.ttf", family: "Inter", weight: 400 },
    { file: "Inter-SemiBold.ttf", family: "Inter", weight: 600 },
    { file: "DejaVuSansMono.ttf", family: "DejaVu Sans Mono", weight: 400 },
  ];

  for (const { file, family, weight } of fontFiles) {
    const path = join(FONTS_DIR, file);
    if (existsSync(path)) {
      fonts.push(path);
    }
  }

  return fonts;
}

/**
 * Render a JSON spec to PNG.
 */
async function render(specPath, outputPath) {
  // Dynamically import resvg-js (handles ESM/CJS differences)
  let Resvg;
  try {
    const resvgModule = await import("@resvg/resvg-js");
    Resvg = resvgModule.Resvg;
  } catch (e) {
    console.error("Error: @resvg/resvg-js not installed. Run: npm install");
    process.exit(1);
  }

  const specRaw = readFileSync(specPath, "utf-8");
  const spec = JSON.parse(specRaw);

  const layout = spec.layout || "hero";
  const presetFn = PRESETS[layout];
  if (!presetFn) {
    console.error(
      `Error: unknown layout "${layout}". Available: ${Object.keys(PRESETS).join(", ")}`
    );
    process.exit(1);
  }

  // Generate SVG
  const svg = presetFn(spec);

  // Load custom fonts
  const fontFiles = loadFonts();

  const w = spec.dimensions?.width || 2000;
  const h = spec.dimensions?.height || 800;

  // Render at 2× resolution
  const opts = {
    fitTo: { mode: "width", value: w * 2 },
    font: {
      fontFiles,
      loadSystemFonts: true,
      defaultFontFamily: "Inter",
    },
  };

  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const out = outputPath || "output.png";
  writeFileSync(out, pngBuffer);
  console.log(`Rendered ${layout} -> ${out} (${w * 2}×${h * 2}px @ 2×)`);

  return out;
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node render.js <spec.json> [output.png]");
  console.log("Presets: hero, donut, quick-card, comparison");
  process.exit(0);
}

render(args[0], args[1]).catch((e) => {
  console.error("Render error:", e.message);
  process.exit(1);
});
