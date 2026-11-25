// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * Model steps through Claude Code, the `claude` command signed in on this computer, for one person's own use
 * of their own Claude Code; nothing of its sign-in is read or kept here. Each step runs `claude -p` once:
 * the agent loop's system prompt replaces Claude Code's, its built-in tools are off, the loop's tools are
 * listed through an MCP server of ours that never runs them (claude-code-tools.ts), and the conversation goes
 * in as one user message (claude-code-transcript.ts). The step ends at the model's first stop: text, or tool
 * calls, which go back to the loop to run; then the process is stopped.
 */
import { type ChildProcess, execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { ENV } from "../config/env.js";
import {
  type ModelChunk,
  type ModelClient,
  type ModelRequest,
  message,
  type ReasoningLevel,
} from "../contracts/index.js";
import { ClaudeCodeStream } from "./claude-code-stream.js";
import { TOOL_SERVER_COMMAND } from "./claude-code-tools.js";
import { TRANSCRIPT_GUIDE, transcriptBlocks } from "./claude-code-transcript.js";

/** How long checking Claude Code (its version, its sign-in) may take. */
const PROBE_MS = 20_000;

/** Whether Claude Code can run here: found and signed in (with its version), not found, or signed out. */
export type ClaudeCodeState =
  | { state: "ready"; version: string }
  | { state: "missing" }
  | { state: "signedOut" };

/** Run `command` with `args`, its output, or undefined when it could not be run or failed. */
function output(command: string, args: string[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: PROBE_MS, env: process.env }, (error, stdout) =>
      resolve(error ? undefined : stdout),
    );
  });
}

/** Check that `command` is Claude Code and is signed in, without starting a model request. */
export async function probeClaudeCode(command: string = claudeCommand()): Promise<ClaudeCodeState> {
  const version = (await output(command, ["--version"]))?.trim();
  if (!version) return { state: "missing" };
  const status = await output(command, ["auth", "status", "--json"]);
  let loggedIn = false;
  try {
    loggedIn = (JSON.parse(status ?? "{}") as { loggedIn?: unknown }).loggedIn === true;
  } catch {
    loggedIn = false;
  }
  return loggedIn ? { state: "ready", version: version.split(/\s/)[0] ?? version } : { state: "signedOut" };
}

/** How long a step may send nothing before it is ended as stalled, unless the setup says otherwise. */
const STALL_MS = 180_000;

/** Who a Claude Code client's replay data may be sent back to (it keeps none, but each model is its own). */
export function claudeCodeReplayKey(model: string): string {
  return `claude-code ${model}`;
}

/** The claude command to run: the environment's, else `claude` on the PATH. */
export function claudeCommand(env: NodeJS.ProcessEnv = process.env): string {
  return env[ENV.claudePath]?.trim() || "claude";
}

/** The effort Claude Code is asked for, from the reasoning level; the model's own default when unset. */
export function effortOf(reasoning: ReasoningLevel | undefined): string | undefined {
  switch (reasoning) {
    case undefined:
    case "provider-default":
      return undefined;
    case "none":
    case "minimal":
      return "low";
    default:
      return reasoning;
  }
}

/** How this program starts again as the tool server: the script it runs from, or its compiled self. */
function selfCommand(): string[] {
  const script = process.argv[1];
  return script && existsSync(script) ? [process.execPath, script] : [process.execPath];
}

/** The `claude` arguments for one step. */
export function claudeArgs({
  model,
  system,
  effort,
  mcpConfig,
}: {
  model: string;
  system: string;
  effort?: string | undefined;
  mcpConfig?: string | undefined;
}): string[] {
  return [
    "-p",
    "--output-format",
    "stream-json",
    "--input-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--model",
    model,
    ...(effort ? ["--effort", effort] : []),
    "--system-prompt",
    system,
    // None of Claude Code's own tools; the user's settings, hooks and MCP servers are not loaded.
    "--tools",
    "",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    ...(mcpConfig ? ["--mcp-config", mcpConfig, "--allowedTools", "mcp__ta"] : []),
    "--no-session-persistence",
  ];
}

export function claudeCodeClient({
  model,
  reasoning,
  stallMs = STALL_MS,
  command = claudeCommand(),
}: {
  model: string;
  reasoning?: ReasoningLevel;
  stallMs?: number;
  command?: string;
}): ModelClient {
  return {
    model,
    replayKey: claudeCodeReplayKey(model),
    stream: (request, signal) => step({ model, reasoning, stallMs, command }, request, signal),
  };
}

async function* step(
  options: { model: string; reasoning?: ReasoningLevel | undefined; stallMs: number; command: string },
  request: ModelRequest,
  signal?: AbortSignal,
): AsyncGenerator<ModelChunk> {
  if (signal?.aborted) {
    yield { type: "error", error: { kind: "aborted", message: message("run.cancelled"), retryable: false } };
    return;
  }
  const dir = await mkdtemp(join(tmpdir(), "tradingagents-claude-"));
  try {
    const offersTools = request.toolChoice !== "none" && request.tools.length > 0;
    let mcpConfig: string | undefined;
    if (offersTools) {
      const specs = join(dir, "tools.json");
      await writeFile(specs, JSON.stringify(request.tools), { mode: 0o600 });
      const [executable = process.execPath, ...prefix] = selfCommand();
      mcpConfig = join(dir, "mcp.json");
      const server = { type: "stdio", command: executable, args: [...prefix, TOOL_SERVER_COMMAND, specs] };
      await writeFile(mcpConfig, JSON.stringify({ mcpServers: { ta: server } }), { mode: 0o600 });
    }
    const args = claudeArgs({
      model: options.model,
      system:
        offersTools || request.messages.length > 1
          ? `${request.system}\n\n${TRANSCRIPT_GUIDE}`
          : request.system,
      effort: effortOf(options.reasoning),
      mcpConfig,
    });
    yield* run(options.command, args, transcriptBlocks(request), options.stallMs, signal);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Run one `claude -p`, yielding what its output means until the step ends, then stop it. */
async function* run(
  command: string,
  args: string[],
  content: { type: "text"; text: string }[],
  stallMs: number,
  signal?: AbortSignal,
): AsyncGenerator<ModelChunk> {
  let child: ChildProcess;
  try {
    child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env });
  } catch {
    yield missing(command);
    return;
  }
  let spawnFailed = false;
  let stalled = false;
  let stderr = "";
  const exited = new Promise<number | null>((resolve) => {
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") spawnFailed = true;
      resolve(null);
    });
    child.on("close", (code) => resolve(code));
  });
  const stop = () => {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  };
  child.stderr?.on("data", (chunk: Buffer) => {
    // The last of it is enough to say what went wrong.
    stderr = (stderr + chunk.toString("utf8")).slice(-4000);
  });
  child.stdin?.on("error", () => {});
  child.stdin?.end(`${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`);
  signal?.addEventListener("abort", stop, { once: true });
  let timer: NodeJS.Timeout | undefined;
  const wait = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      stop();
    }, stallMs);
  };
  wait();
  const parser = new ClaudeCodeStream();
  try {
    if (child.stdout) {
      for await (const line of createInterface({ input: child.stdout })) {
        wait();
        for (const chunk of parser.push(line)) yield chunk;
        if (parser.done) break;
      }
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
    stop();
  }
  const code = await exited;
  if (parser.done) return;
  if (signal?.aborted) {
    yield { type: "error", error: { kind: "aborted", message: message("run.cancelled"), retryable: false } };
    return;
  }
  if (spawnFailed) {
    yield missing(command);
    return;
  }
  if (stalled) {
    yield {
      type: "error",
      error: {
        kind: "provider",
        message: message("model.stalled", { durationMs: stallMs }),
        retryable: true,
      },
    };
    return;
  }
  yield* parser.close(code, stderr);
}

function missing(command: string): ModelChunk {
  return {
    type: "error",
    error: { kind: "auth", message: message("model.claudeCodeMissing", { command }), retryable: false },
  };
}
