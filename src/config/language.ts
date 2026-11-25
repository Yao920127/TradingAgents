// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * Which language the application is read in: `--lang`, else the environment variable, else config.json's
 * `language`, else the system's locale (LC_ALL, LC_MESSAGES, LANG), else English. Read synchronously at
 * start, before anything is printed, so even the usage text is in the language chosen.
 */
import { readFileSync } from "node:fs";
import { LOCALES, type Locale, message } from "../contracts/index.js";
import { ENV } from "./env.js";

/** The language to use, where it was named when not by config.json or the system, and what was wrong. */
export type LanguageChoice = {
  locale: Locale;
  /** "--lang" or the environment variable, when one of them chose it: a saved choice does not win over them. */
  namedBy?: string;
  problems: string[];
  /** Set when `--lang` named no language: the run stops with this. */
  badFlag?: string;
};

/** `value` read as a language: "zh-TW", "zh_TW", "zh-Hant", "zh" and the like as zh-TW, "en*" as en. */
export function toLocale(value: string): Locale | undefined {
  const tag = value.trim().replace(/_/g, "-").split(".")[0]?.toLowerCase() ?? "";
  if (!tag) return undefined;
  if (
    tag === "zh" ||
    tag.startsWith("zh-tw") ||
    tag.startsWith("zh-hant") ||
    tag === "zh-hk" ||
    tag === "zh-mo"
  )
    return "zh-TW";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return undefined;
}

/** The system's language, from the locale variables; English unless they name Traditional Chinese. */
export function systemLocale(env: NodeJS.ProcessEnv): Locale {
  const named = env.LC_ALL || env.LC_MESSAGES || env.LANG || "";
  if (/^zh[-_](cn|sg|hans)/i.test(named) || /^zh$/i.test(named.split(".")[0] ?? "")) return "en";
  return toLocale(named) === "zh-TW" ? "zh-TW" : "en";
}

/** config.json's `language`, if it names one; anything else there is a problem, not a stop. */
function configLocale(path: string | undefined, problems: string[]): Locale | undefined {
  if (!path) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    // A missing or unreadable file is reported where the settings are read.
    return undefined;
  }
  if (typeof json !== "object" || json === null || !("language" in json)) return undefined;
  const value = (json as { language: unknown }).language;
  const locale = typeof value === "string" ? toLocale(value) : undefined;
  if (!locale) problems.push(message("config.badLanguage", { where: path, locales: LOCALES.join(", ") }));
  return locale;
}

export function resolveLanguage({
  flag,
  env,
  configPath,
}: {
  flag?: string | undefined;
  env: NodeJS.ProcessEnv;
  configPath?: string | undefined;
}): LanguageChoice {
  const problems: string[] = [];
  if (flag !== undefined) {
    const locale = toLocale(flag);
    if (locale) return { locale, namedBy: "--lang", problems };
    return { locale: systemLocale(env), problems, badFlag: flag };
  }
  const fromEnv = env[ENV.language];
  if (fromEnv?.trim()) {
    const locale = toLocale(fromEnv);
    if (locale) return { locale, namedBy: ENV.language, problems };
    problems.push(message("config.badLanguage", { where: ENV.language, locales: LOCALES.join(", ") }));
  }
  const saved = configLocale(configPath, problems);
  return { locale: saved ?? systemLocale(env), problems };
}

/** Where this run's language was named outside config.json, for /language to say so. */
let namedElsewhere: string | undefined;

export function setLanguageNamedBy(namedBy: string | undefined): void {
  namedElsewhere = namedBy;
}

export function languageNamedBy(): string | undefined {
  return namedElsewhere;
}
