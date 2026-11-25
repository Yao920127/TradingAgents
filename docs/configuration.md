# Configuration

Settings and data live in `~/.tauric/tradingagents/`, the configuration directory:

| Where                | What                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `config.json`        | the model, reasoning, provider settings, limits, sync and language            |
| `credentials.json`   | stored keys, readable only by you                                             |
| `chatgpt-auth.json`  | a ChatGPT sign-in, readable only by you                                       |
| `history.jsonl`      | the last questions asked in the terminal                                      |
| `agents/`, `skills/` | your own agents and skills (see [usage](usage.md#your-own-agents-and-skills)) |
| `sessions/`          | sessions                                                                      |
| `memory/`            | notes and recorded decisions                                                  |

The update check's state is kept there too. `TRADINGAGENTS_HOME`, an absolute path, moves the whole directory. Skills shared between agent clients, in `~/.agents/skills/`, are read from there wherever the directory is.

A complete `config.json`:

```json
{
  "model": "anthropic/claude-sonnet-5-5",
  "reasoning": "high",
  "providers": {
    "openai-compatible": {
      "baseURL": "https://your-server/v1",
      "contextWindow": 131072
    }
  },
  "limits": { "question": { "time": "20m" } },
  "sync": "on",
  "language": "zh-TW"
}
```

| Environment variable                                                                              | Sets                                                                               |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `TRADINGAGENTS_MODEL`                                                                             | the model, as `provider/id` (or the server's model, with `TRADINGAGENTS_BASE_URL`) |
| `TRADINGAGENTS_BASE_URL`                                                                          | an OpenAI-compatible server's address                                              |
| `TRADINGAGENTS_MODEL_API_KEY`                                                                     | that server's key                                                                  |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY` | a provider's key (see [models](models.md))                                         |
| `TAURIC_API_KEY`                                                                                  | the Tauric API key                                                                 |
| `TRADINGAGENTS_SYNC`                                                                              | `on` or `off`, over the setting in `config.json`                                   |
| `TRADINGAGENTS_LANGUAGE`                                                                          | `en` or `zh-TW`, over the setting in `config.json`                                 |
| `TRADINGAGENTS_PDF_FONT`                                                                          | a font file with Chinese for PDF reports (`path`, or `path#PostScriptName`)        |
| `TRADINGAGENTS_CLAUDE_PATH`                                                                       | the `claude` executable for the `claude-code` provider                             |
| `TRADINGAGENTS_HOME`                                                                              | one directory for configuration and data                                           |
| `TRADINGAGENTS_NO_UPDATE_CHECK`                                                                   | any non-empty value turns off the check for a newer release                        |

Settings come from the command line first, then the environment, then `config.json`.

## Language

The application reads in English (`en`) or Traditional Chinese as written in Taiwan (`zh-TW`): its menus, messages and help, and the answers and reports the model writes for you. `/language` switches it at once and saves it in `config.json`; `--lang` chooses it for one run, and `TRADINGAGENTS_LANGUAGE` in the environment. With none of these set, a system locale of Traditional Chinese (`LANG=zh_TW.UTF-8`, for example) chooses `zh-TW`, and anything else English.

PDF reports set Chinese in a font found on your system: STHeiti or Arial Unicode on macOS, Noto Sans CJK on Linux, Microsoft JhengHei on Windows. `TRADINGAGENTS_PDF_FONT` names another; a `.ttc` collection takes the face's PostScript name after `#`. Only the characters a report uses are embedded. Without such a font, Chinese shows as empty boxes, and the export says how many.
