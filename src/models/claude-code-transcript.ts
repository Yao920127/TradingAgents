// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * A conversation as one user message for Claude Code, which takes only user messages in: each message of the
 * conversation becomes one text block of it, in order, so the next step's blocks start with this step's and
 * the prompt cache serves them again. Earlier reasoning is not carried (only its model may be shown it).
 */
import type { Message, ModelRequest } from "../contracts/index.js";

/** What the system prompt adds so the model reads the conversation as its own. */
export const TRANSCRIPT_GUIDE = `The conversation so far is given as one message of blocks, in order: <user> blocks are the user's, <assistant> blocks are your own earlier turns (with the tool calls you made as <tool_call>), and <tool_result> blocks are what those calls returned. Continue the conversation as the assistant from where it ends. Call tools only through the tools you are given, never by writing <tool_call> or any other tag yourself, and do not repeat these tags in your answer.`;

/** Characters that would end a tag early, kept out of attribute values. */
const attribute = (value: string) => value.replace(/["<>&]/g, "_");

function block(entry: Message): string {
  switch (entry.role) {
    case "user":
      return `<user>\n${entry.text}\n</user>`;
    case "assistant": {
      const lines = entry.parts.flatMap((part): string[] => {
        if (part.type === "text") return part.text ? [part.text] : [];
        if (part.type === "tool-call")
          return [
            `<tool_call id="${attribute(part.callId)}" name="${attribute(part.name)}">${JSON.stringify(part.args)}</tool_call>`,
          ];
        return [];
      });
      return `<assistant>\n${lines.join("\n")}\n</assistant>`;
    }
    case "tool":
      return entry.results
        .map(
          (result) =>
            `<tool_result id="${attribute(result.callId)}" name="${attribute(result.name)}"${result.isError ? ' error="true"' : ""}>\n${result.output}\n</tool_result>`,
        )
        .join("\n");
  }
}

/** The text blocks of the user message that carries `request`'s conversation, and what it must end with. */
export function transcriptBlocks(request: ModelRequest): { type: "text"; text: string }[] {
  const blocks = request.messages.map((entry) => ({ type: "text" as const, text: block(entry) }));
  const asks: string[] = [];
  if (request.toolChoice === "none") asks.push("Answer now, without calling any tool.");
  if (request.responseFormat)
    asks.push(
      `Reply with one JSON value only, no other text and no code fence, that fits this JSON Schema: ${JSON.stringify(request.responseFormat.schema)}`,
    );
  if (asks.length) blocks.push({ type: "text", text: asks.join("\n") });
  // An empty conversation still sends a user message, which Claude Code needs to start.
  return blocks.length ? blocks : [{ type: "text", text: "<user>\n\n</user>" }];
}
