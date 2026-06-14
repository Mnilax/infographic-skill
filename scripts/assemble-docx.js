#!/usr/bin/env node

/**
 * Assemble PNG banners + markdown text into a .docx document.
 *
 * Usage: node assemble-docx.js <input.md> <banner1.png> [banner2.png ...] <output.docx>
 *
 * Gotchas addressed:
 * - lineRule set explicitly (LibreOffice compatibility)
 * - Image extent matched to paragraph line height
 * - Unicode arrows replaced with ASCII
 */

import { readFileSync, writeFileSync } from "fs";

async function assemble(mdPath, bannerPaths, outputPath) {
  let docxModule;
  try {
    docxModule = await import("docx");
  } catch (e) {
    console.error("Error: docx not installed. Run: npm install");
    process.exit(1);
  }

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    HeadingLevel,
    AlignmentType,
    LineRuleType,
  } = docxModule;

  const mdContent = readFileSync(mdPath, "utf-8")
    // Replace unicode arrows with ASCII (Gelasio gotcha)
    .replace(/→/g, "->")
    .replace(/←/g, "<-");

  const lines = mdContent.split("\n");
  const children = [];

  // Insert banners between sections
  let bannerIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Heading
    if (trimmed.startsWith("# ")) {
      // Insert banner before major headings (if available)
      if (bannerIndex < bannerPaths.length) {
        const imgData = readFileSync(bannerPaths[bannerIndex]);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 200,
              lineRule: LineRuleType.AT_LEAST, // CRITICAL: explicit lineRule
              line: 800, // Accommodate image height
            },
            children: [
              new ImageRun({
                data: imgData,
                transformation: { width: 600, height: 240 },
                type: "png",
              }),
            ],
          })
        );
        bannerIndex++;
      }

      children.push(
        new Paragraph({
          heading: trimmed.startsWith("## ") ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
          spacing: {
            before: 240,
            after: 120,
            lineRule: LineRuleType.AT_LEAST,
            line: 360,
          },
          children: [
            new TextRun({
              text: trimmed.replace(/^#+\s*/, ""),
              bold: true,
              font: "Gelasio",
              size: trimmed.startsWith("## ") ? 28 : 36,
            }),
          ],
        })
      );
    }
    // Empty line
    else if (trimmed === "") {
      children.push(
        new Paragraph({
          spacing: {
            before: 0,
            after: 0,
            lineRule: LineRuleType.AT_LEAST,
            line: 240,
          },
        })
      );
    }
    // Regular text
    else {
      children.push(
        new Paragraph({
          spacing: {
            before: 60,
            after: 60,
            lineRule: LineRuleType.AT_LEAST, // CRITICAL: explicit lineRule
            line: 320,
          },
          children: [
            new TextRun({
              text: trimmed,
              font: "Inter",
              size: 22,
            }),
          ],
        })
      );
    }
  }

  // Insert remaining banners at the end
  while (bannerIndex < bannerPaths.length) {
    const imgData = readFileSync(bannerPaths[bannerIndex]);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 200,
          after: 200,
          lineRule: LineRuleType.AT_LEAST,
          line: 800,
        },
        children: [
          new ImageRun({
            data: imgData,
            transformation: { width: 600, height: 240 },
            type: "png",
          }),
        ],
      })
    );
    bannerIndex++;
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
  console.log(`Assembled ${bannerPaths.length} banners + markdown -> ${outputPath}`);
}

// CLI
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log("Usage: node assemble-docx.js <input.md> <banner1.png> [...] <output.docx>");
  process.exit(0);
}

const mdPath = args[0];
const outputPath = args[args.length - 1];
const bannerPaths = args.slice(1, -1);

assemble(mdPath, bannerPaths, outputPath).catch((e) => {
  console.error("Assembly error:", e.message);
  process.exit(1);
});
