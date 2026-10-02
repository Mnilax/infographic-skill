/** Validate the values that control SVG geometry and allocation sizes. */
export function validateSpec(spec, layout = spec?.layout ?? "hero") {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new Error("Spec must be an object");
  if (!spec.content || typeof spec.content !== "object" || Array.isArray(spec.content)) throw new Error("content must be an object");
  const width = spec.dimensions?.width ?? 2000;
  const height = spec.dimensions?.height ?? 800;
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 8192) || width * height > 16_777_216) {
    throw new Error("Dimensions must be positive integers up to 8192, with at most 16777216 source pixels");
  }
  for (const value of Object.values(spec.palette ?? {})) {
    if (typeof value !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
      throw new Error("Palette colors must be hex color strings");
    }
  }
  for (const style of Object.values(spec.typography ?? {})) {
    if (!style || typeof style !== "object") throw new Error("Typography entries must be objects");
    if (style.size !== undefined && (!Number.isFinite(style.size) || style.size <= 0 || style.size > 1024)) {
      throw new Error("Font sizes must be finite numbers from 0 to 1024 (exclusive of 0)");
    }
    if (style.family !== undefined && typeof style.family !== "string") throw new Error("Font family must be a string");
  }
  const content = spec.content;
  const array = (value, name) => {
    if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
    return value;
  };
  switch (layout) {
    case "hero":
      for (const metric of array(content.metrics ?? [], "metrics")) {
        if (!metric || typeof metric !== "object") throw new Error("Metrics must be objects");
      }
      break;
    case "donut": {
      const segments = array(content.segments, "segments");
      if (!segments.length || segments.some(s => !s || !Number.isFinite(s.value) || s.value < 0) || !segments.some(s => s.value > 0)) {
        throw new Error("Donut segments require finite nonnegative numbers and a positive total");
      }
      if (!Number.isFinite(segments.reduce((sum, s) => sum + s.value, 0))) throw new Error("Donut segment total must be finite");
      for (const segment of segments) {
        if (segment.color !== undefined && (typeof segment.color !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(segment.color))) {
          throw new Error("Segment colors must be hex color strings");
        }
      }
      break;
    }
    case "quick-card":
      array(content.items ?? [], "items");
      break;
    case "comparison":
      for (const column of array(content.columns, "columns")) {
        if (!column || typeof column !== "object") throw new Error("Comparison columns must be objects");
        array(column.items ?? [], "column.items");
        if (column.color !== undefined && (typeof column.color !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(column.color))) {
          throw new Error("Column colors must be hex color strings");
        }
      }
      if (!content.columns.length) throw new Error("Comparison requires at least one column");
      break;
    default:
      throw new Error(`Unknown layout: ${spec.layout}`);
  }
  return spec;
}
