// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * The slash commands: one registry that the command menu, `/help` and the input all read. A command acts
 * through the app's actions only, so it never reaches into the views.
 */
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { languageNamedBy, resolvePaths, saveLanguage, writeAtomic } from "../config/index.js";
import { currentLocale, errorText, LOCALES, type Locale, message, setLocale } from "../contracts/index.js";
import { CHANGELOG } from "./changelog.generated.js";
import type { Copied } from "./clipboard.js";
import { BACK, type FormUI } from "./form/form-ui.js";
import { type Link, REPO, SITE } from "./links.js";
import type { List, ListSection } from "./list.js";
import { ranked } from "./match.js";
import { homePath } from "./output.js";
import { reportPdf, uncovered } from "./report/pdf.js";
import type { Report } from "./report/report.js";
import { SEPARATOR } from "./rows.js";

/** What the app tells a command about the session. */
export type SessionInfo = {
  version: string;
  model: string;
  provider: string;
  contextWindow?: number;
  session?: string;
  /** Where data comes from: Tauric with a key, else Yahoo prices only. */
  data: string;
  /** Whether a Tauric API key is set. */
  tauricKey: boolean;
  sync: string;
  /** The agents and skills the session may offer, with where each comes from. */
  agents?: readonly CatalogItem[];
  skills?: readonly CatalogItem[];
};

/**
 * An agent or skill as `/agents` and `/skills` list it: built-in, or from the user's file at `source`;
 * `available`: offered in this session (an agent whose data no source here serves is not).
 */
type CatalogItem = {
  name: string;
  description: string;
  source: string;
  builtIn: boolean;
  available: boolean;
};
type CommandContext = {
  info: SessionInfo;
  /** Write lines into the transcript as one quiet block. */
  say(lines: string[], links?: Link[]): void;
  /** Write a list into the transcript: sections of aligned rows, drawn with the theme's roles. */
  list(list: List, links?: Link[]): void;
  /** Write a notice into the transcript: a warning or an error said as one. */
  notice(level: "warn" | "error", text: string): void;
  /** Run steps in place of the input (a list, a field), as a setup does; a cancel ends it quietly. */
  flow(run: (ui: FormUI) => Promise<void>): void;
  /** The last answer as Markdown, its sources listed, if there is one. */
  answer(): string | undefined;
  /** Put `text` on the clipboard, every way this terminal allows. */
  copy(text: string): Copied;
  exit(): void;
  /** The session so far as Markdown, thinking included while this terminal holds it. */
  transcript(): string;
  /** The last completed answer as a report, if there is one. */
  report(): Report | undefined;
  /** Open a setup in place of the input. */
  setup(kind: "login" | "model"): void;
  /** Start a new session in place of this one. */
  newSession(): void;
  /** Choose an earlier session to resume, in place of this one. */
  resume(): void;
};

export type Command = {
  name: string;
  summary: string;
  /** Whether it runs while a turn is under way (it reads state, it does not start work). */
  whileRunning: boolean;
  run(context: CommandContext, args: string): void;
};

/** The keys, for `/help`. */
const KEYS = (): [string, string][] => [
  ["Enter", message("keys.enter")],
  ["Shift+Enter", message("keys.newLine")],
  ["Up, Down", message("keys.history")],
  ["Ctrl+R", message("keys.search")],
  ["Shift+Tab", message("keys.mode")],
  ["Esc", message("keys.esc")],
  ["Ctrl+C", message("keys.ctrlC")],
  ["Ctrl+D", message("keys.ctrlD")],
];

export const COMMANDS: readonly Command[] = [
  {
    name: "help",
    get summary() {
      return message("cmd.help");
    },
    whileRunning: true,
    run(context) {
      context.list(
        {
          sections: [
            {
              heading: message("app.helpCommands"),
              rows: COMMANDS.map((command) => ({ name: `/${command.name}`, text: command.summary })),
            },
            { heading: message("app.helpKeys"), rows: KEYS().map(([name, text]) => ({ name, text })) },
          ],
        },
        [REPO, SITE],
      );
    },
  },
  {
    name: "status",
    get summary() {
      return message("cmd.status");
    },
    whileRunning: true,
    run(context) {
      const { info } = context;
      const rows: [string, string | undefined][] = [
        [message("status.model"), `${info.model} (${info.provider})`],
        [
          message("status.context"),
          info.contextWindow ? message("app.tokens", { count: info.contextWindow }) : undefined,
        ],
        [message("status.data"), info.data],
        [message("status.sync"), info.sync],
        [message("status.language"), message("language.name", { locale: currentLocale() })],
        [message("status.session"), info.session],
        [message("status.version"), info.version],
      ];
      context.list({
        sections: [
          {
            labels: true,
            rows: rows.flatMap(([name, text]) => (text === undefined ? [] : [{ name, text }])),
          },
        ],
      });
    },
  },
  {
    name: "new",
    get summary() {
      return message("cmd.new");
    },
    whileRunning: false,
    run(context) {
      context.newSession();
    },
  },
  {
    name: "resume",
    get summary() {
      return message("cmd.resume");
    },
    whileRunning: false,
    run(context) {
      context.resume();
    },
  },
  {
    name: "model",
    get summary() {
      return message("cmd.model");
    },
    whileRunning: false,
    run(context) {
      context.setup("model");
    },
  },
  {
    name: "login",
    get summary() {
      return message("cmd.login");
    },
    whileRunning: false,
    run(context) {
      context.setup("login");
    },
  },
  {
    name: "language",
    get summary() {
      return message("cmd.language");
    },
    whileRunning: true,
    run(context) {
      context.flow((ui) => languageFlow(context, ui));
    },
  },
  {
    name: "agents",
    get summary() {
      return message("cmd.agents");
    },
    whileRunning: true,
    run(context, args) {
      showCatalog(context, context.info.agents ?? [], args, "agent");
    },
  },
  {
    name: "skills",
    get summary() {
      return message("cmd.skills");
    },
    whileRunning: true,
    run(context, args) {
      showCatalog(context, context.info.skills ?? [], args, "skill");
    },
  },
  {
    name: "export",
    get summary() {
      return message("cmd.export");
    },
    whileRunning: true,
    run(context, args) {
      // `pdf` or `md`, then the file as typed (its own spaces kept); a bare path is the transcript's.
      const direct = /^(pdf|md)(?:\s+([\s\S]*))?$/i.exec(args);
      const kind = (direct?.[1]?.toLowerCase() ?? "md") as "pdf" | "md";
      const typed = direct ? (direct[2] ?? "") : args;
      if (!args) return context.flow((ui) => exportFlow(context, ui));
      if (kind === "pdf" && !context.report()) return context.notice("warn", message("app.noReport"));
      void exportTo(context, [{ kind, path: typed ? expandHome(typed) : defaultPath(context, kind) }]);
    },
  },
  {
    name: "copy",
    get summary() {
      return message("cmd.copy");
    },
    whileRunning: true,
    run(context) {
      const answer = context.answer();
      if (!answer) return context.notice("warn", message("app.noAnswerToCopy"));
      const copied = context.copy(answer);
      if (copied.local) return context.say([message("app.copied")]);
      if (!copied.terminal) return context.notice("warn", message("app.copyTooLong"));
      if (copied.unsupported) return context.notice("warn", message("app.copyUnsupported"));
      context.say([message("app.copiedThroughTerminal")]);
    },
  },
  {
    name: "changelog",
    get summary() {
      return message("cmd.changelog");
    },
    whileRunning: true,
    run(context) {
      const { version } = context.info;
      const notes = CHANGELOG.find((entry) => entry.version === version);
      if (!notes?.sections.length) return context.say([message("app.noNotes", { version })]);
      // The version's own items under the version, then each group under its heading.
      context.list({
        sections: notes.sections.map((section) => ({
          heading: section.heading ?? version,
          items: section.items,
        })),
      });
    },
  },
  {
    name: "exit",
    get summary() {
      return message("cmd.exit");
    },
    whileRunning: true,
    run(context) {
      context.exit();
    },
  },
];

/** Choose the language, use it at once, and save it for new sessions. */
async function languageFlow(context: CommandContext, ui: FormUI): Promise<void> {
  const chosen = await ui.pick({
    title: message("language.choose"),
    options: LOCALES.map((locale) => ({ id: locale, label: message("language.name", { locale }) })),
    start: currentLocale(),
    esc: "close",
  });
  if (chosen === BACK) return;
  const locale = chosen as Locale;
  setLocale(locale);
  const name = message("language.name", { locale });
  try {
    await saveLanguage(locale, resolvePaths());
  } catch (error) {
    return context.notice("error", message("app.setupFailed", { reason: errorText(error) }));
  }
  const elsewhere = languageNamedBy();
  context.say([
    message("language.saved", { name }),
    ...(elsewhere ? [message("language.namedElsewhere", { where: elsewhere })] : []),
  ]);
}

/** Where an export goes when no path is given: the working directory, named after the session. */
function defaultPath(context: CommandContext, kind: "pdf" | "md"): string {
  return resolve(`tradingagents-${context.info.session ?? "session"}.${kind}`);
}

/** A path as typed, `~` taken as the home folder. */
function expandHome(path: string): string {
  return resolve(path === "~" ? homedir() : path.replace(/^~(?=[/\\])/, homedir()));
}

/**
 * Write each of `files`, the report (`pdf`) or the transcript (`md`), then say where in one block; a file that
 * could not be written is an error notice of its own.
 */
async function exportTo(
  context: CommandContext,
  files: { kind: "pdf" | "md"; path: string }[],
): Promise<void> {
  const saved: string[] = [];
  for (const { kind, path } of files) {
    const what = kind === "pdf" ? "report" : "transcript";
    const report = kind === "pdf" ? context.report() : undefined;
    if (kind === "pdf" && !report) {
      context.notice("warn", message("app.noReport"));
      continue;
    }
    // Owner-only: a transcript or report holds the questions and what the tools returned.
    const error = await (report ? reportPdf(report) : Promise.resolve(context.transcript()))
      .then((data) => writeAtomic(path, data, { mode: 0o600 }))
      .then(
        () => undefined,
        (failure: unknown) => failure ?? new Error("export failed"),
      );
    if (error !== undefined) {
      context.notice(
        "error",
        message("app.exportFailed", { path: homePath(path), what, reason: errorText(error) }),
      );
      continue;
    }
    const missing = report ? uncovered(report) : 0;
    saved.push(
      message("app.exported", { path: homePath(path), what }),
      ...(missing ? [message("app.uncovered", { count: missing })] : []),
    );
  }
  if (saved.length) context.say(saved);
}

/**
 * Bare `/export`: what to save (the report, the transcript, or both), then where, the working directory's
 * file offered; Esc on the path goes back to the choice. Choosing the report with no answer yet says so and
 * asks again.
 */
async function exportFlow(context: CommandContext, ui: FormUI): Promise<void> {
  let start: string | undefined;
  for (;;) {
    const answered = context.report() !== undefined;
    const what = await ui.pick({
      title: message("app.exportWhat"),
      esc: "close",
      options: [
        {
          id: "pdf",
          label: message("app.exportPdf"),
          note: message(answered ? "app.exportPdfNote" : "app.exportNoAnswer"),
        },
        { id: "md", label: message("app.exportMd"), note: message("app.exportMdNote") },
        {
          id: "both",
          label: message("app.exportBoth"),
          note: message(answered ? "app.exportBothNote" : "app.exportNoAnswer"),
        },
      ],
      start: start ?? (answered ? "pdf" : "md"),
    });
    if (what === BACK) return;
    start = what;
    if (what !== "md" && !answered) {
      context.notice("warn", message("app.noReport"));
      continue;
    }
    // Both: one name, the two extensions added to it.
    const offered = defaultPath(context, what === "both" ? "md" : (what as "pdf" | "md"));
    const field = await ui.field({
      title: message(what === "both" ? "app.exportWhereBoth" : "app.exportWhere"),
      kind: "text",
      initial: homePath(what === "both" ? offered.replace(/\.md$/, "") : offered),
      hint: message("app.exportWhereHint", { separator: SEPARATOR }),
    });
    if (field === BACK) continue;
    const typed = field.take() || homePath(offered);
    const path = expandHome(typed);
    if (what === "both") {
      const base = path.replace(/\.(pdf|md)$/i, "");
      await exportTo(context, [
        { kind: "pdf", path: `${base}.pdf` },
        { kind: "md", path: `${base}.md` },
      ]);
    } else await exportTo(context, [{ kind: what as "pdf" | "md", path }]);
    return;
  }
}

/**
 * `/agents` or `/skills`: built-in items, then the user's grouped by the folder they come from, one row each
 * (its description cut to one row; an item this session cannot offer says so). With a name: that item in full.
 */
function showCatalog(
  context: CommandContext,
  items: readonly CatalogItem[],
  name: string,
  kind: "agent" | "skill",
): void {
  const row = (item: CatalogItem) => ({
    name: item.name,
    text: oneParagraph(item.description),
    ...(item.available ? {} : { warn: message("app.catalogUnavailable") }),
  });
  if (name) {
    const item = items.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
    if (!item) {
      context.notice("warn", message("app.catalogNone", { kind, name }));
      return;
    }
    context.list({
      sections: [
        {
          heading: item.name,
          aside: item.builtIn ? message("app.catalogBuiltInAside") : homePath(item.source),
          rows: [],
          note: [
            item.description.trim(),
            ...(item.available ? [] : [message("app.catalogUnavailable")]),
          ].join("\n\n"),
        },
      ],
    });
    return;
  }
  const builtIn = items.filter((item) => item.builtIn);
  const folders = new Map<string, CatalogItem[]>();
  for (const item of items.filter((candidate) => !candidate.builtIn)) {
    const folder = homePath(dirname(item.source));
    folders.set(folder, [...(folders.get(folder) ?? []), item]);
  }
  const sections: ListSection[] = [
    ...(builtIn.length ? [{ heading: message("app.catalogBuiltIn"), rows: builtIn.map(row) }] : []),
    ...[...folders].map(([folder, mine]) => ({
      heading: message("app.catalogUser"),
      aside: folder,
      rows: mine.map(row),
    })),
  ];
  // How to read one in full, under the last section.
  const last = sections.at(-1);
  if (last) last.note = message("app.catalogOne", { kind });
  context.list({ oneLine: true, sections });
}

/** Text as one paragraph: its line breaks as spaces. */
function oneParagraph(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The commands matching what follows the slash, best first (see match.ts), else in registry order. */
export function matching(typed: string): Command[] {
  return ranked(COMMANDS, typed.replace(/^\//, ""), (command) => command.name).map(({ item }) => item);
}

/** `/name args` read from the input, or undefined when the input is not a command. */
export function parseCommand(input: string): { name: string; args: string } | undefined {
  const match = /^\/(\S*)\s*([\s\S]*)$/.exec(input.trim());
  return match ? { name: (match[1] ?? "").toLowerCase(), args: (match[2] ?? "").trim() } : undefined;
}
