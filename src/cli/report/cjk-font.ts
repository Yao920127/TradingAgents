// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * A font with Chinese characters for PDF reports, which the embedded faces lack. Not shipped (a CJK face is
 * many megabytes): the one named by TRADINGAGENTS_PDF_FONT, else the first of the system's own that is
 * there. PDFKit embeds only the glyphs a report uses, so the file stays small.
 */
import { existsSync } from "node:fs";
import { ENV } from "../../config/index.js";

/** A font file, and for a collection (.ttc) the PostScript name of the face in it to use. */
export type CjkFont = { path: string; family?: string };

/** System fonts with Traditional Chinese glyphs, the most fitting first, on macOS, Linux and Windows. */
const CANDIDATES: readonly CjkFont[] = [
  { path: "/System/Library/Fonts/STHeiti Medium.ttc", family: "STHeitiTC-Medium" },
  { path: "/System/Library/Fonts/STHeiti Light.ttc", family: "STHeitiTC-Light" },
  { path: "/System/Library/Fonts/Supplemental/Arial Unicode.ttf" },
  { path: "/Library/Fonts/Arial Unicode.ttf" },
  { path: "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", family: "NotoSansCJKtc-Regular" },
  { path: "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", family: "NotoSansCJKtc-Regular" },
  { path: "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc", family: "NotoSansCJKtc-Regular" },
  { path: "C:\\Windows\\Fonts\\msjh.ttc", family: "MicrosoftJhengHeiRegular" },
];

/** "path" or "path#PostScriptName", as the environment variable gives it. */
export function parseFontSetting(value: string): CjkFont | undefined {
  const text = value.trim();
  if (!text) return undefined;
  const at = text.lastIndexOf("#");
  if (at <= 0) return { path: text };
  const family = text.slice(at + 1).trim();
  return { path: text.slice(0, at), ...(family ? { family } : {}) };
}

/**
 * The font to set Chinese in: the one the environment names (when its file is there), else the first
 * system font found; undefined when there is none.
 */
export function findCjkFont(
  env: NodeJS.ProcessEnv = process.env,
  exists: (path: string) => boolean = existsSync,
): CjkFont | undefined {
  const named = env[ENV.pdfFont];
  if (named !== undefined) {
    const font = parseFontSetting(named);
    if (font && exists(font.path)) return font;
  }
  return CANDIDATES.find((font) => exists(font.path));
}

/** Whether `point` is in a script a CJK font sets: CJK punctuation, kana, ideographs, full-width forms. */
export function isCjk(point: number): boolean {
  return (
    (point >= 0x2e80 && point <= 0x9fff) ||
    (point >= 0xac00 && point <= 0xd7a3) ||
    (point >= 0xf900 && point <= 0xfaff) ||
    (point >= 0xfe30 && point <= 0xfe4f) ||
    (point >= 0xff00 && point <= 0xffef) ||
    (point >= 0x20000 && point <= 0x3134f)
  );
}
