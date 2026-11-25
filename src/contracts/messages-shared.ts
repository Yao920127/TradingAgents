// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * What every language's message table shares: the addresses and names that are not translated, and the
 * formats for numbers, sizes and lengths of time. Imports nothing, so each table can import it.
 */

/** The languages the application can be read in. */
export const LOCALES = ["en", "zh-TW"] as const;
export type Locale = (typeof LOCALES)[number];

/** Where a person gets a Tauric API key. */
export const SIGN_UP_URL = "https://tauric.ai/signup";

/** Each provider as people see it named. */
export const PROVIDER_LABELS = {
  tauric: "Tauric",
  chatgpt: "ChatGPT plan",
  "claude-code": "Claude Code",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  "openai-compatible": "OpenAI-compatible server",
} as const;

/** Bytes as people say them: 1 GB, 1.5 GB, 512 MB. */
export function formatBytes(bytes: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const shown =
    Number.isInteger(value) || unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
  return `${shown} ${units[unit]}`;
}

/** A length of time as people read it: "41s", "8m 41s", "1h 2m". */
export function duration(ms: number): string {
  const seconds = Math.round(ms / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** A token count as people read it: "850", "12.4k", "296k", "1.2M". */
export function tokens(count: number): string {
  if (count < 1_000) return String(count);
  if (count < 100_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** Characters a terminal draws two columns wide: CJK ideographs, kana, hangul and full-width forms. */
const WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
];

/** How many terminal columns `text` takes. */
function columns(text: string): number {
  let count = 0;
  for (const char of text) {
    const point = char.codePointAt(0) ?? 0;
    count += WIDE.some(([first, last]) => point >= first && point <= last) ? 2 : 1;
  }
  return count;
}

/** A command list, each description starting in one column (wide characters counted as two). */
export function commandTable(
  app: string,
  title: string,
  commands: readonly (readonly [string, string])[],
): string {
  const names = commands.map(([command]) => `${app} ${command}`.trimEnd());
  const width = Math.max(...names.map(columns)) + 2;
  const lines = commands.map(
    ([, what], index) => `  ${names[index]}${" ".repeat(width - columns(names[index] ?? ""))}${what}`,
  );
  return [title, ...lines, `  ${app} --version`].join("\n");
}
