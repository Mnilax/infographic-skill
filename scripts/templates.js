/**
 * Layout presets for infographic generation.
 * Each preset returns an SVG string from structured content + palette + typography.
 */

/**
 * Escape XML special characters in text content.
 */
function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Replace unicode arrows with ASCII (Gelasio gotcha)
    .replace(/→/g, "-&gt;")
    .replace(/←/g, "&lt;-");
}

/**
 * Hero banner — full-width with title, subtitle, and key metrics.
 *
 * content: { title, subtitle, metrics: [{ label, value }], footer? }
 */
export function hero(spec) {
  const { palette, typography, content, dimensions } = spec;
  const w = dimensions?.width || 2000;
  const h = dimensions?.height || 800;
  const { title, subtitle, metrics = [], footer } = content;

  const metricSpacing = w / (metrics.length + 1);

  const metricsSvg = metrics
    .map((m, i) => {
      const x = metricSpacing * (i + 1);
      return `
      <text x="${x}" y="${h * 0.58}" text-anchor="middle"
            font-family="${typography?.title?.family || "Inter"}"
            font-size="${typography?.title?.size || 64}" font-weight="700"
            fill="${palette?.accent || "#2563eb"}">${escapeXml(m.value)}</text>
      <text x="${x}" y="${h * 0.68}" text-anchor="middle"
            font-family="${typography?.body?.family || "Inter"}"
            font-size="${typography?.body?.size || 24}" font-weight="400"
            fill="${palette?.text || "#374151"}">${escapeXml(m.label)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${palette?.background || "#ffffff"}" rx="16"/>
  <rect x="0" y="0" width="${w}" height="6" fill="${palette?.primary || "#1e40af"}" rx="3"/>
  <text x="${w / 2}" y="${h * 0.2}" text-anchor="middle"
        font-family="${typography?.title?.family || "Gelasio"}"
        font-size="${typography?.title?.size || 56}" font-weight="700"
        fill="${palette?.text || "#111827"}">${escapeXml(title)}</text>
  <text x="${w / 2}" y="${h * 0.32}" text-anchor="middle"
        font-family="${typography?.body?.family || "Inter"}"
        font-size="${typography?.subtitle?.size || 28}" font-weight="400"
        fill="${palette?.secondary || "#6b7280"}">${escapeXml(subtitle)}</text>
  <line x1="${w * 0.1}" y1="${h * 0.42}" x2="${w * 0.9}" y2="${h * 0.42}"
        stroke="${palette?.secondary || "#e5e7eb"}" stroke-width="2"/>
  ${metricsSvg}
  ${
    footer
      ? `<text x="${w / 2}" y="${h * 0.88}" text-anchor="middle"
              font-family="${typography?.body?.family || "Inter"}"
              font-size="20" fill="${palette?.secondary || "#9ca3af"}">${escapeXml(footer)}</text>`
      : ""
  }
</svg>`;
}

/**
 * Donut chart — circle chart with legend and callout stats.
 *
 * content: { title, segments: [{ label, value, color? }], callout: { value, label } }
 */
export function donut(spec) {
  const { palette, typography, content, dimensions } = spec;
  const w = dimensions?.width || 2000;
  const h = dimensions?.height || 800;
  const { title, segments = [], callout } = content;

  const cx = w * 0.3;
  const cy = h * 0.5;
  const r = h * 0.3;
  const strokeWidth = r * 0.4;
  const circumference = 2 * Math.PI * r;

  const defaultColors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#6366f1", "#0891b2"];
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const color = seg.color || defaultColors[i % defaultColors.length];
    const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${color}" stroke-width="${strokeWidth}"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return arc;
  });

  const legendX = w * 0.55;
  const legendStartY = h * 0.25;
  const legendItems = segments.map((seg, i) => {
    const y = legendStartY + i * 50;
    const color = seg.color || defaultColors[i % defaultColors.length];
    const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0";
    return `
    <rect x="${legendX}" y="${y - 12}" width="20" height="20" rx="4" fill="${color}"/>
    <text x="${legendX + 32}" y="${y + 3}"
          font-family="${typography?.body?.family || "Inter"}"
          font-size="22" fill="${palette?.text || "#374151"}">${escapeXml(seg.label)} (${pct}%)</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${palette?.background || "#ffffff"}" rx="16"/>
  <text x="${w / 2}" y="60"
        text-anchor="middle"
        font-family="${typography?.title?.family || "Gelasio"}"
        font-size="${typography?.title?.size || 44}" font-weight="700"
        fill="${palette?.text || "#111827"}">${escapeXml(title)}</text>
  ${arcs.join("\n")}
  <circle cx="${cx}" cy="${cy}" r="${r - strokeWidth / 2}" fill="${palette?.background || "#ffffff"}"/>
  ${
    callout
      ? `<text x="${cx}" y="${cy - 10}" text-anchor="middle"
              font-family="${typography?.title?.family || "Inter"}"
              font-size="48" font-weight="700"
              fill="${palette?.accent || "#2563eb"}">${escapeXml(callout.value)}</text>
         <text x="${cx}" y="${cy + 30}" text-anchor="middle"
              font-family="${typography?.body?.family || "Inter"}"
              font-size="20" fill="${palette?.secondary || "#6b7280"}">${escapeXml(callout.label)}</text>`
      : ""
  }
  ${legendItems.join("\n")}
</svg>`;
}

/**
 * Quick reference card — compact card with title and bullet points.
 *
 * content: { title, subtitle?, items: [string], note? }
 */
export function quickCard(spec) {
  const { palette, typography, content, dimensions } = spec;
  const w = dimensions?.width || 2000;
  const h = dimensions?.height || 800;
  const { title, subtitle, items = [], note } = content;

  const itemStartY = subtitle ? h * 0.32 : h * 0.25;
  const itemSpacing = Math.min(55, (h * 0.6) / items.length);

  const itemsSvg = items
    .map((item, i) => {
      const y = itemStartY + i * itemSpacing;
      return `
      <circle cx="${w * 0.08}" cy="${y - 5}" r="6" fill="${palette?.accent || "#2563eb"}"/>
      <text x="${w * 0.1}" y="${y}"
            font-family="${typography?.body?.family || "Inter"}"
            font-size="${typography?.body?.size || 24}"
            fill="${palette?.text || "#374151"}">${escapeXml(item)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${palette?.background || "#ffffff"}" rx="16"/>
  <rect x="0" y="0" width="6" height="${h}" fill="${palette?.primary || "#1e40af"}" rx="3"/>
  <text x="${w * 0.05}" y="${h * 0.12}"
        font-family="${typography?.title?.family || "Gelasio"}"
        font-size="${typography?.title?.size || 44}" font-weight="700"
        fill="${palette?.text || "#111827"}">${escapeXml(title)}</text>
  ${
    subtitle
      ? `<text x="${w * 0.05}" y="${h * 0.22}"
              font-family="${typography?.body?.family || "Inter"}"
              font-size="24" fill="${palette?.secondary || "#6b7280"}">${escapeXml(subtitle)}</text>`
      : ""
  }
  ${itemsSvg}
  ${
    note
      ? `<text x="${w * 0.05}" y="${h * 0.92}"
              font-family="${typography?.mono?.family || "DejaVu Sans Mono"}"
              font-size="18" fill="${palette?.secondary || "#9ca3af"}">${escapeXml(note)}</text>`
      : ""
  }
</svg>`;
}

/**
 * Comparison table — side-by-side comparison of two options.
 *
 * content: { title, columns: [{ name, color?, items: [string] }] }
 */
export function comparison(spec) {
  const { palette, typography, content, dimensions } = spec;
  const w = dimensions?.width || 2000;
  const h = dimensions?.height || 800;
  const { title, columns = [] } = content;

  const colWidth = (w * 0.8) / columns.length;
  const startX = w * 0.1;

  const columnsSvg = columns
    .map((col, ci) => {
      const x = startX + ci * colWidth + colWidth / 2;
      const headerY = h * 0.25;
      const color = col.color || palette?.primary || "#2563eb";
      const items = col.items || [];
      const itemSpacing = Math.min(50, (h * 0.55) / items.length);

      const headerSvg = `
      <rect x="${x - colWidth / 2 + 10}" y="${headerY - 30}" width="${colWidth - 20}" height="45" rx="8"
            fill="${color}" opacity="0.1"/>
      <text x="${x}" y="${headerY}"
            text-anchor="middle"
            font-family="${typography?.title?.family || "Inter"}"
            font-size="28" font-weight="700"
            fill="${color}">${escapeXml(col.name)}</text>`;

      const itemsSvg = items
        .map((item, ii) => {
          const y = headerY + 60 + ii * itemSpacing;
          return `<text x="${x}" y="${y}" text-anchor="middle"
                        font-family="${typography?.body?.family || "Inter"}"
                        font-size="${typography?.body?.size || 22}"
                        fill="${palette?.text || "#374151"}">${escapeXml(item)}</text>`;
        })
        .join("\n");

      return headerSvg + "\n" + itemsSvg;
    })
    .join("\n");

  // Divider between columns
  const dividers = columns
    .slice(0, -1)
    .map((_, i) => {
      const x = startX + (i + 1) * colWidth;
      return `<line x1="${x}" y1="${h * 0.2}" x2="${x}" y2="${h * 0.85}"
                    stroke="${palette?.secondary || "#e5e7eb"}" stroke-width="2" stroke-dasharray="8 4"/>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${palette?.background || "#ffffff"}" rx="16"/>
  <text x="${w / 2}" y="${h * 0.1}"
        text-anchor="middle"
        font-family="${typography?.title?.family || "Gelasio"}"
        font-size="${typography?.title?.size || 44}" font-weight="700"
        fill="${palette?.text || "#111827"}">${escapeXml(title)}</text>
  ${dividers}
  ${columnsSvg}
</svg>`;
}

export const PRESETS = { hero, donut, "quick-card": quickCard, comparison };
