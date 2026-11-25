// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
// Chinese in PDF reports: the font is found, Chinese is set in it, and the export counts no empty boxes.
import assert from "node:assert/strict";
import { test } from "node:test";
import { findCjkFont, isCjk, parseFontSetting } from "../dist/cli/report/cjk-font.js";
import { reportParts } from "../dist/cli/report/layout.js";
import { reportPdf, uncovered } from "../dist/cli/report/pdf.js";

const report = {
  title: "NVDA 估值報告",
  question: "NVDA 跟同業比起來貴嗎？",
  added: [],
  at: "2026-11-26T08:00:00.000Z",
  model: "claude-sonnet-5-5",
  version: "1.0.1",
  parts: reportParts(
    "## 結論\n\nNVDA 的本益比為 **45.2 倍**，高於同業中位數 [e1]。\n\n| 公司 | 本益比 |\n| --- | --- |\n| NVDA | 45.2 |\n| AMD | 38.1 |\n\n- 營收成長強勁\n- 殖利率偏低\n\n```\n本益比 = 股價 / EPS\n```",
  ),
  sources: ["[1] price_history NVDA，1 年（Tauric，截至 2026-11-25）"],
};

test("reads the font setting as a path, with a face name after #", () => {
  assert.deepEqual(parseFontSetting("/fonts/a.ttf"), { path: "/fonts/a.ttf" });
  assert.deepEqual(parseFontSetting("/fonts/a.ttc#Face-Bold"), { path: "/fonts/a.ttc", family: "Face-Bold" });
  assert.equal(parseFontSetting("  "), undefined);
});

test("prefers the font the environment names, when its file is there", () => {
  const there = new Set(["/mine.ttf", "/System/Library/Fonts/STHeiti Medium.ttc"]);
  const exists = (path) => there.has(path);
  assert.deepEqual(findCjkFont({ TRADINGAGENTS_PDF_FONT: "/mine.ttf" }, exists), { path: "/mine.ttf" });
  assert.deepEqual(findCjkFont({ TRADINGAGENTS_PDF_FONT: "/gone.ttf" }, exists), {
    path: "/System/Library/Fonts/STHeiti Medium.ttc",
    family: "STHeitiTC-Medium",
  });
  assert.equal(
    findCjkFont({}, () => false),
    undefined,
  );
});

test("knows Chinese characters from Latin ones", () => {
  assert.equal(isCjk("中".codePointAt(0)), true);
  assert.equal(isCjk("，".codePointAt(0)), true);
  assert.equal(isCjk("A".codePointAt(0)), false);
});

test("counts Chinese as empty boxes only when there is no CJK font", () => {
  assert.ok(uncovered(report, null) > 20);
  assert.equal(uncovered(report, { path: "/any.ttf" }), 0);
});

const font = findCjkFont();

test("sets Chinese in the system's CJK font", {
  skip: font ? false : "no CJK font on this system",
}, async () => {
  const bytes = await reportPdf(report, font);
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.startsWith("%PDF-"));
  // The CJK face is embedded (as a subset, named after the face).
  const name = font.family ?? "";
  assert.ok(!name || text.includes(name), `embedded font named ${name}`);
});

test("still writes the report when the CJK font cannot be read", async () => {
  const bytes = await reportPdf(report, { path: "/no/such/font.ttf" });
  assert.ok(Buffer.from(bytes).toString("latin1").startsWith("%PDF-"));
});
