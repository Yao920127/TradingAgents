// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * Claude Code's stream-json output read as one model step: text and thinking as they stream, the tool calls
 * once the message stops for them (they are the agent loop's to run, not Claude Code's), then the finish.
 * Pure: it reads lines and says what they mean; claude-code.ts runs the process.
 */
import type { FinishReason, JsonValue, ModelChunk, ToolCall, Usage } from "../contracts/index.js";
import { message } from "../contracts/index.js";

/** The prefix Claude Code gives the tools of the MCP server named "ta". */
export const TOOL_PREFIX = "mcp__ta__";

type Json = { [key: string]: unknown };

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const count = (value: unknown): number => (typeof value === "number" && value > 0 ? Math.floor(value) : 0);

/** Anthropic usage as the loop counts it: cache reads and writes are part of the input. */
export function usageOf(raw: unknown): Usage {
  if (!isRecord(raw)) return { inputTokens: 0, outputTokens: 0 };
  const read = count(raw.cache_read_input_tokens);
  const written = count(raw.cache_creation_input_tokens);
  const details = isRecord(raw.output_tokens_details) ? raw.output_tokens_details : {};
  const thinking = count(details.thinking_tokens);
  return {
    inputTokens: count(raw.input_tokens) + read + written,
    outputTokens: count(raw.output_tokens),
    ...(thinking ? { reasoningTokens: thinking } : {}),
    ...(read ? { cacheReadTokens: read } : {}),
    ...(written ? { cacheWriteTokens: written } : {}),
  };
}

const FINISH: Record<string, FinishReason> = {
  end_turn: "stop",
  stop_sequence: "stop",
  pause_turn: "stop",
  max_tokens: "length",
  model_context_window_exceeded: "length",
  refusal: "content-filter",
  tool_use: "tool-calls",
};

/** An error chunk, from what Claude Code said went wrong. */
export function failure(said: string): Extract<ModelChunk, { type: "error" }> {
  const text = said.trim() || "no reason given";
  if (/not logged in|please run \/login|invalid api key|authentication|oauth/i.test(text))
    return {
      type: "error",
      error: { kind: "auth", message: message("model.claudeCodeSignedOut"), retryable: false },
    };
  if (/usage limit|rate limit|limit reached|429|overloaded/i.test(text))
    return {
      type: "error",
      error: {
        kind: "rate_limited",
        message: message("model.claudeCodeLimit", { said: text }),
        retryable: false,
      },
    };
  if (/prompt is too long|context window|too many tokens/i.test(text))
    return { type: "error", error: { kind: "context", message: text, retryable: false } };
  return {
    type: "error",
    error: { kind: "provider", message: message("model.claudeCodeFailed", { said: text }), retryable: false },
  };
}

/** One step's stream-json, read a line at a time. */
export class ClaudeCodeStream {
  private readonly calls: ToolCall[] = [];
  private stopReason: string | undefined;
  private usage: Usage = { inputTokens: 0, outputTokens: 0 };
  private finished = false;

  /** Whether the step has ended (a finish or an error was said): the process can be stopped. */
  get done(): boolean {
    return this.finished;
  }

  /** What one line of output means for the step. */
  push(line: string): ModelChunk[] {
    if (this.finished || !line.trim()) return [];
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      return [];
    }
    if (!isRecord(event)) return [];
    switch (event.type) {
      case "stream_event":
        return this.streamEvent(event.event);
      case "assistant":
        this.collect(event.message);
        return [];
      case "rate_limit_event": {
        const info = isRecord(event.rate_limit_info) ? event.rate_limit_info : {};
        if (info.status !== "rejected") return [];
        return this.end(failure(`usage limit reached (${String(info.rateLimitType ?? "subscription")})`));
      }
      case "result":
        return this.result(event);
      default:
        return [];
    }
  }

  /** The process ended: a step that said no finish ends with an error naming why. */
  close(exitCode: number | null, stderr: string): ModelChunk[] {
    if (this.finished) return [];
    const said = stderr.trim().split("\n").slice(-3).join(" ");
    return this.end(failure(said || `claude exited with code ${exitCode ?? "unknown"}`));
  }

  private streamEvent(raw: unknown): ModelChunk[] {
    if (!isRecord(raw)) return [];
    if (raw.type === "content_block_delta" && isRecord(raw.delta)) {
      const delta = raw.delta;
      if (delta.type === "text_delta" && typeof delta.text === "string" && delta.text)
        return [{ type: "text", text: delta.text }];
      if (delta.type === "thinking_delta" && typeof delta.thinking === "string" && delta.thinking)
        return [{ type: "reasoning", text: delta.thinking }];
      return [];
    }
    if (raw.type === "message_delta") {
      if (isRecord(raw.delta) && typeof raw.delta.stop_reason === "string")
        this.stopReason = raw.delta.stop_reason;
      if (raw.usage !== undefined) this.usage = usageOf(raw.usage);
      return [];
    }
    if (raw.type === "message_stop") return this.messageStop();
    return [];
  }

  /** A finished content block: the tool calls are kept for the message's end. */
  private collect(raw: unknown): void {
    if (!isRecord(raw) || !Array.isArray(raw.content)) return;
    for (const block of raw.content) {
      if (!isRecord(block) || block.type !== "tool_use" || typeof block.id !== "string") continue;
      if (typeof block.name !== "string" || this.calls.some((call) => call.callId === block.id)) continue;
      const name = block.name.startsWith(TOOL_PREFIX) ? block.name.slice(TOOL_PREFIX.length) : block.name;
      this.calls.push({ callId: block.id, name, args: (block.input ?? {}) as JsonValue });
    }
  }

  /** The message ended: with tool calls, the step ends here and they go back to the loop. */
  private messageStop(): ModelChunk[] {
    if (this.stopReason !== "tool_use" || !this.calls.length) return [];
    return this.end(...this.calls.map((call): ModelChunk => ({ type: "tool-call", ...call })), {
      type: "finish",
      reason: "tool-calls",
      usage: this.usage,
    });
  }

  private result(event: Json): ModelChunk[] {
    if (event.is_error === true || (typeof event.subtype === "string" && event.subtype.startsWith("error"))) {
      const said = typeof event.result === "string" ? event.result : String(event.subtype ?? "");
      return this.end(failure(said));
    }
    const reason = typeof event.stop_reason === "string" ? event.stop_reason : this.stopReason;
    const usage = event.usage !== undefined ? usageOf(event.usage) : this.usage;
    return this.end({ type: "finish", reason: FINISH[reason ?? ""] ?? "stop", usage });
  }

  private end(...chunks: ModelChunk[]): ModelChunk[] {
    this.finished = true;
    return chunks;
  }
}
