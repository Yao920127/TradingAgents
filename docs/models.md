# Models

TradingAgents runs on the model you choose: Tauric's, a ChatGPT plan, Claude Code signed in on your computer, a hosted API with your key, or any server with an OpenAI-style API.

The first session in a terminal with no model set walks through the choice. Later, `/login` connects another provider (a ChatGPT plan signs in from the terminal with `tradingagents login chatgpt`) and `/model` chooses the model and how hard it reasons, from the next question in this session and in new ones. A resumed session runs on the model it ran on, when that can still be used.

## Providers

| Provider                 | How to connect                                              | Key in the environment                                               |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Tauric                   | a Tauric API key, the same key that serves the data         | `TAURIC_API_KEY`                                                     |
| ChatGPT plan             | `tradingagents login chatgpt`, or the first session's setup |                                                                      |
| Claude Code              | `claude` installed and signed in; choose it in `/login`     |                                                                      |
| OpenAI                   | an API key                                                  | `OPENAI_API_KEY`                                                     |
| Anthropic                | an API key                                                  | `ANTHROPIC_API_KEY`                                                  |
| Google                   | an API key from AI Studio                                   | `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` or `GOOGLE_API_KEY` |
| DeepSeek                 | an API key                                                  | `DEEPSEEK_API_KEY`                                                   |
| OpenRouter               | an API key                                                  | `OPENROUTER_API_KEY`                                                 |
| OpenAI-compatible server | its address and model, and a key if it needs one            | `TRADINGAGENTS_MODEL_API_KEY`                                        |

A key in the environment is used over a stored one. `tradingagents key <provider>` stores a provider's key, `tradingagents key tauric` the Tauric API key, and `tradingagents key model` an OpenAI-compatible server's: type it at the hidden prompt, or pipe it in. Keys are stored in `credentials.json`, readable only by you, and are never sent anywhere but their own provider. Nothing is checked when a key is stored; a key that does not work says so on first use, with where to fix it.

A ChatGPT sign-in prints an address to open in a browser, and is kept in `chatgpt-auth.json` in the [configuration directory](configuration.md); `tradingagents logout chatgpt` signs out. Questions count toward the plan's usage limits.

DeepSeek needs the model's earlier reasoning sent back with every request, so sessions on a DeepSeek model keep that reasoning, in synced copies too.

## Claude Code on your computer

The `claude-code` provider runs each model step through the `claude` command signed in on your computer, so questions use your own Claude Code and count toward its usage limits. It offers `claude-sonnet-5-5` (the default), `claude-opus-5-5`, `claude-fable-5-2` and `claude-haiku-5-5`:

```bash
tradingagents --model claude-code/claude-opus-5-5 --reasoning high
```

It is for your own use on your own computer: TradingAgents never reads or keeps Claude Code's sign-in, it starts `claude` as you would. Anthropic does not allow third-party products to offer claude.ai sign-in or subscription limits, so this provider must not be offered to others or shipped in a release.

Each step starts `claude -p` with the agent's own system prompt, none of Claude Code's tools, none of your Claude Code settings, hooks or MCP servers, and TradingAgents' tools listed through a small MCP server that never runs them: when the model calls a tool, the step ends and TradingAgents runs it, as for any other provider. `--reasoning` sets Claude Code's `--effort` (`none` and `minimal` become `low`). `TRADINGAGENTS_CLAUDE_PATH` names the `claude` executable when it is not on your `PATH`.

What it costs compared with an API key: every step sends the whole conversation again (the prompt cache serves most of it), each step starts a process, and the model's reasoning is not carried from one step to the next.

## Choosing for one run

```bash
tradingagents --model anthropic/claude-opus-5-5 --reasoning high
```

A model is named `provider/id`. `--reasoning` takes `none`, `minimal`, `low`, `medium`, `high`, `xhigh` or `max`; a level the model does not offer becomes the nearest one above it. Without a setting, each provider's default applies. `TRADINGAGENTS_MODEL` names the model in the environment, between the flag and the config file.

With no model named and exactly one provider connected, its default model is used.

## An OpenAI-compatible server

vLLM, Ollama, LM Studio and similar servers work through their OpenAI-style API. Set the server in `config.json`:

```json
{
  "model": "openai-compatible/your-model",
  "providers": {
    "openai-compatible": { "baseURL": "https://your-server/v1" }
  }
}
```

or with `TRADINGAGENTS_BASE_URL` and `TRADINGAGENTS_MODEL` (the model as the server names it). A server key stored with `tradingagents key model` is kept for the address it was stored for, and is not sent to another one.

The context window is read from the server when it reports one; to set it, add `"contextWindow": 131072` to the provider's block.

### Thinking models on a server

`thinking` says how the server switches the model's thinking on and off. The default, `"none"`, sends no switch. For a model whose chat template takes `enable_thinking` (Qwen and similar models served by vLLM), set `"chat-template"`: TradingAgents then thinks while researching, and answers without thinking when a time limit leaves little time to write. `sampling` holds the model card's sampling for each mode:

```json
{
  "model": "openai-compatible/Qwen/Qwen3-32B",
  "providers": {
    "openai-compatible": {
      "baseURL": "https://your-server/v1",
      "thinking": "chat-template",
      "sampling": {
        "thinking": { "temperature": 0.6, "topP": 0.95, "topK": 20 },
        "plain": { "temperature": 0.7, "topP": 0.8, "topK": 20, "presencePenalty": 1.5 }
      }
    }
  }
}
```
