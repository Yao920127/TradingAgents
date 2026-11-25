// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * The MCP server through which Claude Code sees TradingAgents' tools: it lists them, from a file of their
 * specs, and never answers a call. A call is the agent loop's to run, so the step ends when the model makes
 * one and this server is stopped with Claude Code. Speaks MCP's stdio transport (one JSON-RPC message per
 * line) with only what listing tools needs, so no MCP library is required.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import type { ToolSpec } from "../contracts/index.js";

/** The hidden command that starts this server: `tradingagents __claude-code-tools <specs file>`. */
export const TOOL_SERVER_COMMAND = "__claude-code-tools";

type Request = {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  params?: { protocolVersion?: string };
};

/** The MCP answer to `request`, or undefined for a notification, a call, or what it does not serve. */
export function toolServerReply(request: Request, tools: readonly ToolSpec[]): object | undefined {
  if (request.id === undefined) return undefined;
  const reply = (result: object) => ({ jsonrpc: "2.0", id: request.id, result });
  switch (request.method) {
    case "initialize":
      return reply({
        protocolVersion: request.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "tradingagents", version: "1" },
      });
    case "tools/list":
      return reply({
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });
    case "ping":
      return reply({});
    // A call is never answered: the agent loop runs it once the step ends.
    case "tools/call":
      return undefined;
    default:
      return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method not found" } };
  }
}

/** Serve the tools in `specsPath` on stdin and stdout until stdin closes. */
export function runToolServer(specsPath: string): Promise<number> {
  const tools = JSON.parse(readFileSync(specsPath, "utf8")) as ToolSpec[];
  const lines = createInterface({ input: process.stdin });
  lines.on("line", (line) => {
    let request: Request;
    try {
      request = JSON.parse(line) as Request;
    } catch {
      return;
    }
    const reply = toolServerReply(request, tools);
    if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
  });
  return new Promise((resolve) => lines.on("close", () => resolve(0)));
}
