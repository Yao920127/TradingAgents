// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
// The Claude Code provider without running claude: its stream-json read as one step, the conversation as one
// user message, the MCP server that lists the tools, and the arguments a step runs with.
import assert from "node:assert/strict";
import { test } from "node:test";
import { claudeArgs, effortOf } from "../dist/models/claude-code.js";
import { ClaudeCodeStream, usageOf } from "../dist/models/claude-code-stream.js";
import { toolServerReply } from "../dist/models/claude-code-tools.js";
import { transcriptBlocks } from "../dist/models/claude-code-transcript.js";

/** Lines as Claude Code writes them (trimmed to the fields read). */
const line = (event) => JSON.stringify(event);
const delta = (inner) =>
  line({ type: "stream_event", event: { type: "content_block_delta", index: 0, delta: inner } });
const usage = {
  input_tokens: 2,
  cache_creation_input_tokens: 1450,
  cache_read_input_tokens: 300,
  output_tokens: 60,
};

function read(lines) {
  const stream = new ClaudeCodeStream();
  const chunks = [];
  for (const each of lines) {
    chunks.push(...stream.push(each));
    if (stream.done) break;
  }
  return { chunks, done: stream.done, stream };
}

test("streams text and thinking, then finishes at the result", () => {
  const { chunks, done } = read([
    line({ type: "system", subtype: "init" }),
    delta({ type: "thinking_delta", thinking: "Considering" }),
    delta({ type: "text_delta", text: "Hello" }),
    delta({ type: "text_delta", text: " there" }),
    line({
      type: "stream_event",
      event: { type: "message_delta", delta: { stop_reason: "end_turn" }, usage },
    }),
    line({ type: "stream_event", event: { type: "message_stop" } }),
    line({ type: "result", subtype: "success", is_error: false, stop_reason: "end_turn", usage }),
  ]);
  assert.equal(done, true);
  assert.deepEqual(chunks.slice(0, 3), [
    { type: "reasoning", text: "Considering" },
    { type: "text", text: "Hello" },
    { type: "text", text: " there" },
  ]);
  assert.deepEqual(chunks.at(-1), {
    type: "finish",
    reason: "stop",
    usage: { inputTokens: 1752, outputTokens: 60, cacheReadTokens: 300, cacheWriteTokens: 1450 },
  });
});

test("ends the step at the message's stop with every tool call, its prefix taken off", () => {
  const toolUse = (id, ticker) =>
    line({
      type: "assistant",
      message: { content: [{ type: "tool_use", id, name: "mcp__ta__price_quote", input: { ticker } }] },
    });
  const { chunks, done } = read([
    toolUse("toolu_1", "NVDA"),
    // A message with two calls says each block as it finishes: neither ends the step alone.
    toolUse("toolu_2", "AMD"),
    toolUse("toolu_2", "AMD"),
    line({
      type: "stream_event",
      event: { type: "message_delta", delta: { stop_reason: "tool_use" }, usage },
    }),
    line({ type: "stream_event", event: { type: "message_stop" } }),
    line({ type: "tool_progress", heartbeat: true }),
  ]);
  assert.equal(done, true);
  assert.deepEqual(
    chunks.filter((chunk) => chunk.type === "tool-call"),
    [
      { type: "tool-call", callId: "toolu_1", name: "price_quote", args: { ticker: "NVDA" } },
      { type: "tool-call", callId: "toolu_2", name: "price_quote", args: { ticker: "AMD" } },
    ],
  );
  assert.equal(chunks.at(-1).type, "finish");
  assert.equal(chunks.at(-1).reason, "tool-calls");
});

test("says a refused rate limit, a sign-in problem and a failed run as errors", () => {
  const limited = read([
    line({ type: "rate_limit_event", rate_limit_info: { status: "rejected", rateLimitType: "five_hour" } }),
  ]);
  assert.equal(limited.chunks[0].error.kind, "rate_limited");
  const signedOut = read([
    line({ type: "result", subtype: "success", is_error: true, result: "Not logged in · Please run /login" }),
  ]);
  assert.equal(signedOut.chunks[0].error.kind, "auth");
  const failed = read([line({ type: "result", subtype: "error_during_execution", is_error: true })]);
  assert.equal(failed.chunks[0].error.kind, "provider");
});

test("says why a process that ended without a finish stopped", () => {
  const stream = new ClaudeCodeStream();
  stream.push(delta({ type: "text_delta", text: "partial" }));
  const [chunk] = stream.close(1, "Error: something broke\n");
  assert.equal(chunk.type, "error");
  assert.match(chunk.error.message, /something broke/);
  assert.deepEqual(stream.close(1, ""), []);
});

test("ignores lines that are not JSON or not for the step", () => {
  const { chunks, done } = read(["", "not json", line({ type: "system", subtype: "status" })]);
  assert.deepEqual(chunks, []);
  assert.equal(done, false);
});

test("counts cache reads and writes as input", () => {
  assert.deepEqual(usageOf({ input_tokens: 5, output_tokens: 7 }), { inputTokens: 5, outputTokens: 7 });
  assert.deepEqual(usageOf(undefined), { inputTokens: 0, outputTokens: 0 });
});

test("sends the conversation as one block per message, so the next step's blocks start with these", () => {
  const messages = [
    { role: "user", text: "Is NVDA expensive?" },
    {
      role: "assistant",
      parts: [
        { type: "reasoning", text: "secret thoughts" },
        { type: "text", text: "Let me check." },
        { type: "tool-call", callId: "c1", name: "price_quote", args: { ticker: "NVDA" } },
      ],
    },
    { role: "tool", results: [{ callId: "c1", name: "price_quote", output: "NVDA 180.5", isError: false }] },
  ];
  const blocks = transcriptBlocks({ system: "s", messages, tools: [] });
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].text, "<user>\nIs NVDA expensive?\n</user>");
  assert.match(blocks[1].text, /<tool_call id="c1" name="price_quote">\{"ticker":"NVDA"\}<\/tool_call>/);
  assert.doesNotMatch(blocks[1].text, /secret thoughts/);
  assert.match(blocks[2].text, /<tool_result id="c1" name="price_quote">\nNVDA 180.5\n<\/tool_result>/);
  const next = transcriptBlocks({
    system: "s",
    messages: [...messages, { role: "user", text: "And AMD?" }],
    tools: [],
  });
  assert.deepEqual(next.slice(0, 3), blocks);
});

test("asks for a final answer or a JSON reply when the request does", () => {
  const blocks = transcriptBlocks({
    system: "s",
    messages: [{ role: "user", text: "q" }],
    tools: [],
    toolChoice: "none",
    responseFormat: { schema: { type: "object" } },
  });
  assert.match(blocks.at(-1).text, /without calling any tool/);
  assert.match(blocks.at(-1).text, /JSON Schema: \{"type":"object"\}/);
  assert.equal(transcriptBlocks({ system: "s", messages: [], tools: [] }).length, 1);
});

test("lists the tools over MCP and never answers a call", () => {
  const tools = [{ name: "price_quote", description: "A quote.", inputSchema: { type: "object" } }];
  const init = toolServerReply(
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    tools,
  );
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.deepEqual(
    toolServerReply({ jsonrpc: "2.0", id: 2, method: "tools/list" }, tools).result.tools,
    tools,
  );
  assert.equal(
    toolServerReply({ jsonrpc: "2.0", id: 3, method: "tools/call", params: {} }, tools),
    undefined,
  );
  assert.equal(toolServerReply({ jsonrpc: "2.0", method: "notifications/initialized" }, tools), undefined);
  assert.equal(
    toolServerReply({ jsonrpc: "2.0", id: 4, method: "resources/list" }, tools).error.code,
    -32601,
  );
});

test("runs claude with no tools of its own, none of the user's settings, and the effort asked for", () => {
  const args = claudeArgs({
    model: "claude-opus-5-5",
    system: "SYS",
    effort: "high",
    mcpConfig: "/tmp/mcp.json",
  });
  const after = (flag) => args[args.indexOf(flag) + 1];
  assert.equal(after("--model"), "claude-opus-5-5");
  assert.equal(after("--system-prompt"), "SYS");
  assert.equal(after("--tools"), "");
  assert.equal(after("--setting-sources"), "");
  assert.equal(after("--effort"), "high");
  assert.equal(after("--mcp-config"), "/tmp/mcp.json");
  assert.ok(args.includes("--strict-mcp-config"));
  assert.ok(!args.includes("--bare"), "--bare would not read the Claude Code sign-in");
  assert.ok(!claudeArgs({ model: "m", system: "s" }).includes("--mcp-config"));
  assert.equal(effortOf("none"), "low");
  assert.equal(effortOf("xhigh"), "xhigh");
  assert.equal(effortOf("provider-default"), undefined);
});

test("offers every model Claude Code's /model lists, by the names people know them by", async () => {
  const { modelsOf, modelName } = await import("../dist/engine/index.js");
  const names = modelsOf("claude-code").map((model) => model.name);
  assert.deepEqual(names, [
    "Claude Sonnet 5.5",
    "Claude Opus 5.5",
    "Claude Fable 5.2",
    "Claude Haiku 5.5",
    "Claude Fable 5.1",
    "Claude Sonnet 5",
    "Claude Opus 5",
    "Claude Fable 5",
    "Claude Opus 4.8",
    "Claude Opus 4.7",
    "Claude Opus 4.6",
    "Claude Sonnet 4.6",
    "Claude Haiku 4.5",
  ]);
  for (const model of modelsOf("claude-code")) assert.ok(model.context, `${model.id} has a context window`);
  assert.equal(modelName("claude-code", "claude-sonnet-5-5"), "Claude Sonnet 5.5");
  assert.equal(modelName("anthropic", "claude-haiku-4-5"), "Claude Haiku 4.5");
  // A name for an id whatever the provider, and the id itself for a model no catalog knows.
  assert.equal(modelName("", "claude-opus-5-5"), "Claude Opus 5.5");
  assert.equal(modelName("openai-compatible", "my-local-model"), "my-local-model");
});
