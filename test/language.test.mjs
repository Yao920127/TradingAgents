// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
// The language switch: which language is chosen, that both tables say the same things, and what the
// model is told. Runs against the build (npm test builds first).
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { languageDirective, withLanguage } from "../dist/agents/prompts.js";
import { resolveLanguage, systemLocale, toLocale } from "../dist/config/language.js";
import { currentLocale, en, message, setLocale } from "../dist/contracts/messages.js";
import { zhTW } from "../dist/contracts/messages.zh-TW.js";

const ENV_VAR = "TRADINGAGENTS_LANGUAGE";

function configWith(json) {
  const dir = mkdtempSync(join(tmpdir(), "ta-lang-"));
  const path = join(dir, "config.json");
  writeFileSync(path, JSON.stringify(json));
  return path;
}

/** Terminal columns: CJK ideographs and full-width forms take two. */
function columns(text) {
  let count = 0;
  for (const char of text) {
    const point = char.codePointAt(0) ?? 0;
    const wide = (point >= 0x2e80 && point <= 0xa4cf) || (point >= 0xff00 && point <= 0xff60);
    count += wide ? 2 : 1;
  }
  return count;
}

test("reads the usual spellings of a language", () => {
  assert.equal(toLocale("zh-TW"), "zh-TW");
  assert.equal(toLocale("zh_TW.UTF-8"), "zh-TW");
  assert.equal(toLocale("zh-Hant"), "zh-TW");
  assert.equal(toLocale("zh"), "zh-TW");
  assert.equal(toLocale("en_US.UTF-8"), "en");
  assert.equal(toLocale("fr"), undefined);
  assert.equal(toLocale(""), undefined);
});

test("takes the system locale only when it names Traditional Chinese", () => {
  assert.equal(systemLocale({ LANG: "zh_TW.UTF-8" }), "zh-TW");
  assert.equal(systemLocale({ LC_ALL: "zh_TW.UTF-8", LANG: "en_US.UTF-8" }), "zh-TW");
  assert.equal(systemLocale({ LANG: "zh_CN.UTF-8" }), "en");
  assert.equal(systemLocale({ LANG: "en_US.UTF-8" }), "en");
  assert.equal(systemLocale({}), "en");
});

test("puts --lang over the environment, the environment over the config, the config over the system", () => {
  const configPath = configWith({ language: "en" });
  const env = { [ENV_VAR]: "zh-TW", LANG: "en_US.UTF-8" };
  assert.deepEqual(resolveLanguage({ flag: "en", env, configPath }), {
    locale: "en",
    namedBy: "--lang",
    problems: [],
  });
  const fromEnv = resolveLanguage({ env, configPath });
  assert.equal(fromEnv.locale, "zh-TW");
  assert.equal(fromEnv.namedBy, ENV_VAR);
  const saved = resolveLanguage({ env: { LANG: "zh_TW.UTF-8" }, configPath });
  assert.equal(saved.locale, "en");
  assert.equal(saved.namedBy, undefined);
  assert.equal(resolveLanguage({ env: { LANG: "zh_TW.UTF-8" } }).locale, "zh-TW");
});

test("says what it could not use, and stops only for --lang", () => {
  assert.equal(resolveLanguage({ flag: "klingon", env: {} }).badFlag, "klingon");
  const configPath = configWith({ language: 42 });
  const fromEnv = resolveLanguage({ env: { [ENV_VAR]: "xx" }, configPath });
  assert.equal(fromEnv.locale, "en");
  assert.equal(fromEnv.badFlag, undefined);
  assert.equal(fromEnv.problems.length, 2);
});

test("has every English message in Traditional Chinese, and only those", () => {
  assert.deepEqual(Object.keys(zhTW).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) assert.equal(typeof zhTW[key], "function", key);
});

test("reads messages in the language set", () => {
  const before = currentLocale();
  try {
    setLocale("zh-TW");
    assert.equal(message("cmd.exit"), "離開");
    assert.equal(message("report.page", { page: 2, count: 5 }), "第 2 頁，共 5 頁");
    setLocale("en");
    assert.equal(message("cmd.exit"), "leave");
  } finally {
    setLocale(before);
  }
});

test("lines up the usage text with Chinese in it", () => {
  const before = currentLocale();
  try {
    setLocale("zh-TW");
    // The command rows, between the title and the --version line.
    const lines = message("cli.usage", { app: "ta" }).split("\n").slice(1, -1);
    const starts = lines.map((line) => {
      // The description follows the first run of two or more spaces after the command.
      const gap = /( {2,})(?=\S)/.exec(line.slice(2));
      assert.ok(gap, line);
      return columns(line.slice(0, 2 + gap.index)) + gap[1].length;
    });
    assert.equal(new Set(starts).size, 1, lines.join("\n"));
  } finally {
    setLocale(before);
  }
});

test("tells the model the language only when it is not English", () => {
  assert.equal(languageDirective("en"), "");
  assert.match(languageDirective("zh-TW"), /Traditional Chinese as used in Taiwan/);
  assert.equal(withLanguage("SYSTEM", "en"), "SYSTEM");
  assert.match(withLanguage("SYSTEM", "zh-TW"), /^SYSTEM\n\nWrite everything/);
});
