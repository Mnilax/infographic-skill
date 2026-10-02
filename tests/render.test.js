import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import test from "node:test";
import { PRESETS } from "../scripts/templates.js";

const root = fileURLToPath(new URL("..", import.meta.url));

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), "infographic-test-"));
  t.after(() => {
    assert.ok(resolve(dir).startsWith(`${resolve(tmpdir())}${sep}infographic-test-`));
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

const specs = {
  hero: { title: "Hero", subtitle: "Subtitle", metrics: [{ value: 0, label: "Zero" }] },
  donut: { title: "Chart", segments: [{ label: "A", value: 40 }, { label: "B", value: 60 }] },
  "quick-card": { title: "Card", items: ["One", "Two"] },
  comparison: { title: "Compare", columns: [{ name: "A", items: ["Fast"] }, { name: "B", items: ["Reliable"] }] },
};

for (const [layout, content] of Object.entries(specs)) {
  test(`${layout} CLI renders a valid PNG at exact 2x dimensions`, (t) => {
    const dir = tempDir(t);
    const input = join(dir, "spec.json");
    const output = join(dir, "image.png");
    writeFileSync(input, JSON.stringify({ layout, content, dimensions: { width: 200, height: 80 } }));
    const result = spawnSync(process.execPath, [join(root, "scripts/render.js"), input, output], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const png = readFileSync(output);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 400);
    assert.equal(png.readUInt32BE(20), 160);
  });
}

test("hostile text/font attributes are escaped and numeric zero survives", () => {
  const svg = PRESETS.hero({
    content: { title: '<image href="file:///secret"/>', metrics: [{ value: 0, label: "x" }] },
    typography: { title: { family: 'Inter"/><image href="https://evil.test/x"' } },
  });
  assert.equal(svg.includes('<image href='), false);
  assert.ok(svg.includes('&lt;image href='));
  assert.ok(svg.includes('Inter&quot;/&gt;&lt;image href=&quot;'));
  assert.match(svg, />0<\/text>/);
});

for (const value of [-1, NaN, Infinity, "40"]) {
  test(`donut rejects invalid value ${value}`, () => {
    assert.throws(() => PRESETS.donut({ content: { segments: [{ value }] } }), /finite nonnegative/);
  });
}

test("invalid dimensions, colors and zero-total charts are rejected", () => {
  for (const dimensions of [{ width: 0 }, { width: -1 }, { width: 1.5 }, { width: 100000 }, { width: 8192, height: 8192 }]) {
    assert.throws(() => PRESETS.hero({ content: {}, dimensions }), /Dimensions/);
  }
  assert.throws(() => PRESETS.hero({ content: {}, palette: { text: '"/><image href="file:///secret"' } }), /hex color/);
  assert.throws(() => PRESETS.donut({ content: { segments: [{ value: 0 }] } }), /positive total/);
});

function readZipEntry(zip, name) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0);
  let offset = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const entryName = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (entryName === name) {
      const method = zip.readUInt16LE(offset + 10);
      const size = zip.readUInt32LE(offset + 20);
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`Missing ZIP entry: ${name}`);
}

test("DOCX assembly uses heading levels and explicit image-height spacing", (t) => {
  const dir = tempDir(t);
  const md = join(dir, "report.md");
  const output = join(dir, "report.docx");
  writeFileSync(md, "# Report\n## Details\n### More details\nПривет -> мир\n", "utf8");
  const result = spawnSync(process.execPath, [join(root, "scripts/assemble-docx.js"), md, join(root, "assets/hero-example.png"), output], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const xml = readZipEntry(readFileSync(output), "word/document.xml");
  assert.match(xml, /w:pStyle w:val="Heading1"/);
  assert.match(xml, /w:pStyle w:val="Heading2"/);
  assert.match(xml, /w:pStyle w:val="Heading3"/);
  assert.match(xml, /w:line="3600"/);
  assert.ok(xml.includes("Привет -&gt; мир"));
});
