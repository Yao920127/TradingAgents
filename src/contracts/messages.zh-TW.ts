// Copyright 2026 Tauric Research
// SPDX-License-Identifier: Apache-2.0
/**
 * The message table in Traditional Chinese as written in Taiwan: the same keys and parameters as the English
 * table in messages.ts, which its type holds it to. Tickers, product names, commands and code stay as they are.
 */
import type { MessageTable } from "./messages.js";
import {
  commandTable,
  duration,
  formatBytes,
  PROVIDER_LABELS,
  SIGN_UP_URL,
  tokens,
} from "./messages-shared.js";

/** A cap's name as a limit is called. */
const CAP_WORDS: Record<string, string> = {
  steps: "步數",
  subagents: "agent 執行次數",
  tokens: "token",
  time: "時間",
};

/** What a Tauric API key is for. */
const KEY_PURPOSE = "AI 與資料";

/** Where to get a Tauric API key, its address last and whole so a terminal can make it clickable. */
function getOne(): string {
  return `申請網址：${SIGN_UP_URL}`;
}

/** How a stored key is named when asked for. */
function keyLabel(name: string): string {
  return name === "model" ? "模型伺服器" : ((PROVIDER_LABELS as Record<string, string>)[name] ?? name);
}

const OUTCOMES: Record<string, string> = {
  unsupported: "不支援這項查詢",
  unavailable: "無法連線",
  rate_limited: "忙碌中",
  quota: "額度已用完",
  rejected: "拒絕了金鑰",
  not_configured: "尚未設定",
  no_data: "沒有這筆資料",
  invalid: "無法依此方式回答",
  full: "儲存空間已滿",
};

function usage(app: string): string {
  const commands: [string, string][] = [
    ["", "在這個終端機開始一個工作階段"],
    ['-p "問題"', "回答一個問題並印出答案"],
    ['-p "問題" --json', "改為每個事件印出一行 JSON"],
    ["--continue", "繼續最近的工作階段（也可搭配 -p）"],
    ["--resume <id>", "繼續某個工作階段，本機或 Tauric 帳號中的皆可（也可搭配 -p）"],
    ["--limit key=value", "設定這次執行的上限，例如 question.time=20m（可重複）"],
    ["sessions", "列出工作階段，最新的在前；同步開啟時也列出 Tauric 帳號中的"],
    ["sessions delete <id> [--yes]", "刪除工作階段（以及 Tauric 帳號中的副本）"],
    ["sync on|off|status", "與 Tauric 帳號同步工作階段"],
    ["key <name>", "儲存金鑰：tauric、model（伺服器的）或供應商的（隱藏輸入或由管線傳入）"],
    ["--model provider/id", "這次執行使用此模型"],
    ["--reasoning level", "這次執行的推理強度：none 到 max"],
    ["--lang en|zh-TW", "這次執行使用的介面語言"],
    ["login chatgpt", "使用 ChatGPT 方案的模型（會印出要開啟的網址）"],
    ["logout chatgpt", "登出 ChatGPT"],
    ["update", "更新到最新版本"],
  ];
  return commandTable(app, "用法：", commands);
}

export const zhTW: MessageTable = {
  // Command line
  "cli.usage": ({ app }) => usage(app),
  "cli.badLanguage": ({ value, locales }) => `--lang ${value}：不是可用的語言（${locales}）`,

  // Slash commands, /help and /status
  "cmd.help": () => "指令與快捷鍵",
  "cmd.status": () => "模型、資料、同步與工作階段",
  "cmd.new": () => "開始新的工作階段",
  "cmd.resume": () => "繼續先前的工作階段，本機或 Tauric 帳號中的皆可",
  "cmd.model": () => "選擇這個與之後的工作階段使用的模型",
  "cmd.login": () => "連接供應商，或加入 Tauric API 金鑰",
  "cmd.language": () => "選擇介面語言：English 或繁體中文",
  "cmd.agents": () => "主 agent 可以詢問的 agents",
  "cmd.skills": () => "主 agent 可以載入的 skills",
  "cmd.export": () => "把最後的回答存成 PDF 報告、把對話紀錄存成 Markdown，或兩者都存",
  "cmd.copy": () => "把最後的回答複製到剪貼簿",
  "cmd.changelog": () => "這個版本的更新內容",
  "cmd.exit": () => "離開",
  "keys.enter": () => "送出；輸入框空白時，送出佇列中的下一個問題",
  "keys.newLine": () => "換行；也可用 Alt+Enter、Ctrl+J，或輸入 \\ 再按 Enter",
  "keys.history": () => "先前的問題",
  "keys.search": () => "搜尋先前的問題",
  "keys.mode": () => "切換模式：自動（由 agent 決定做法）或規劃（先提出計畫）",
  "keys.esc": () => "停止回答，或關閉選單",
  "keys.ctrlC": () => "清除輸入、停止回答，或離開",
  "keys.ctrlD": () => "離開（輸入框空白時）",
  "status.model": () => "模型",
  "status.context": () => "上下文",
  "status.data": () => "資料",
  "status.sync": () => "同步",
  "status.session": () => "工作階段",
  "status.version": () => "版本",
  "status.language": () => "語言",
  "language.choose": () => "要使用哪種語言？",
  "language.name": ({ locale }) => ({ en: "English", "zh-TW": "繁體中文（台灣）" })[locale],
  "language.saved": ({ name }) => `從現在起使用${name}，這個與之後的工作階段都適用。`,
  "language.namedElsewhere": ({ where }) =>
    `${where} 設定時會以它決定語言；你的選擇已儲存，在它未設定時使用。`,
  "config.badLanguage": ({ where, locales }) => `${where}：language 必須是 ${locales} 之一`,

  "cli.unknownCommand": ({ command }) => `未知的指令：${command}`,
  "cli.sayChatgpt": ({ app, command }) => `用法：${app} ${command} chatgpt`,
  "cli.emptyQuestion": () => "問題是空的。",
  "cli.flagNotFor": ({ flag, command }) => `--${flag} 不適用於 ${command}。`,
  "cli.unexpectedArgument": ({ argument }) => `非預期的參數：${argument}`,
  "cli.jsonNeedsPrompt": () => "--json 需要搭配 -p。",
  "cli.resumeOrContinue": () => "--resume 與 --continue 只能擇一。",
  "cli.warning": ({ problem }) => `警告：${problem}`,
  "cli.needsTerminal": ({ app }) => `工作階段需要終端機。若只要回答一個問題，請用：${app} -p "問題"`,
  "cli.noSessionToContinue": () => "目前還沒有可以繼續的工作階段。",
  "cli.updateAvailable": ({ latest, current }) => `TradingAgents ${latest} 已推出（目前是 ${current}）。`,
  "cli.upgradeWith": ({ command }) => `執行 ${command} 來更新。`,
  "update.promptTitle": ({ latest, current }) => `TradingAgents ${latest} 已推出（你使用的是 ${current}）`,
  "update.now": () => "立即更新",
  "update.nowDetail": ({ command }) => `執行 ${command}`,
  "update.skip": () => "略過",
  "update.skipDetail": () => "下次啟動時再詢問",
  "update.skipVersion": () => "略過此版本",
  "update.skipVersionDetail": ({ latest }) => `有比 ${latest} 更新的版本時再詢問`,
  "update.restart": ({ app }) => `重新啟動 ${app} 以使用新版本。`,
  "update.commandFailed": ({ command, code }) => `${command} 結束代碼為 ${code}；其他設定都沒有變更。`,
  "update.updated": ({ from, to }) => `已將 TradingAgents 從 ${from} 更新到 ${to}。`,
  "update.current": ({ version }) => `TradingAgents ${version} 已是最新版本。`,
  "update.none": () => "找不到適用於此平台的版本。",
  "update.notRelease": ({ install }) => `這份副本不是安裝的正式版本，無法自行更新。安裝方式：${install}`,
  "update.managed": () => "這份副本是由套件管理工具安裝的，請用該工具更新。",
  "update.npm": ({ command }) => `這份副本是用 npm 安裝的，請用以下指令更新：${command}`,
  "update.unwritable": ({ dir, install }) =>
    `你沒有 ${dir} 的寫入權限，因此無法自行更新。請重新安裝：${install}`,
  "update.busy": () => "另一個更新正在進行中。",
  "update.badChecksum": () => "下載的檔案與檢查碼不符；沒有任何變更。",
  "update.noChecksum": ({ name }) => `SHA256SUMS 中沒有 ${name} 唯一的檢查碼；沒有任何變更。`,
  "update.wontStart": () => "新版本無法在此系統上啟動；沒有任何變更。",
  "update.failed": ({ reason }) => `更新失敗：${reason}`,
  "cli.noSessions": () => "目前還沒有工作階段。",
  "cli.nameTheSession": ({ app }) => `請指定要刪除的工作階段：${app} sessions delete <id>`,
  "cli.deleteNeedsYes": () => "沒有終端機可以確認時，刪除需要加上 --yes。",
  "cli.deleteHere": ({ id }) => `要刪除工作階段 ${id} 嗎？`,
  "cli.deleteEverywhere": ({ id }) => `要從本機與 Tauric 帳號刪除工作階段 ${id} 嗎？`,
  "cli.nothingDeleted": () => "沒有刪除任何東西。",
  "cli.failed": ({ reason }) => `已停止：${reason}`,
  "cli.untitledSession": () => "（沒有問題）",
  "cli.inAccount": () => "（在你的 Tauric 帳號中）",
  "cli.untitledAccount": () => "（未命名）",
  "cli.continueOne": ({ app }) => `繼續其中一個：${app} --resume <id>`,
  "cli.nameTheKey": ({ app, names }) => `請指定要儲存的金鑰：${app} key <name>，可用：${names}`,
  "cli.keyPrompt": ({ name }) => `${keyLabel(name)} API 金鑰（不會顯示）：`,
  "cli.chooseModel": ({ providers, example }) =>
    `已設定 ${providers} 的金鑰：用 --model 選擇模型，例如 --model ${example}`,
  "cli.nothingStored": () => "沒有儲存任何東西。",
  "cli.nothingStoredBecause": ({ reason }) => `沒有儲存任何東西：${reason}`,
  "cli.envKeyWins": ({ variable }) => `${variable} 已設定並優先使用；取消設定後才會使用儲存的金鑰。`,
  "cli.keyStored": ({ name, path }) =>
    `已將 ${name === "model" ? "模型伺服器" : keyLabel(name)} API 金鑰儲存在 ${path}。`,
  "cli.setup": ({ app, baseUrlVar, modelVar, providers }) =>
    `尚未設定模型。請選擇一種：

  Tauric 的 AI 與資料          ${app} key tauric
                                ${getOne()}
  你的 ChatGPT 方案            ${app} login chatgpt
  本機 Claude Code             在 /login 選擇 Claude Code（需已安裝並登入 claude）
  API 金鑰                     ${app} key ${providers.join("|")}，
                                或在環境變數中設定，例如 OPENAI_API_KEY
  OpenAI 相容伺服器            設定 ${baseUrlVar} 與 ${modelVar}（伺服器所用的模型名稱），
                                若伺服器需要金鑰：${app} key model

Tauric API 金鑰還能取得申報文件、財報、新聞等資料。沒有金鑰時，價格來自 Yahoo，
事件機率來自 Polymarket；其餘資料無法使用。
`,

  // ChatGPT sign-in commands
  "chatgpt.noModel": ({ email, wanted, models }) =>
    `已用 ${email} 登入，但${wanted ? `方案未提供 ${wanted}` : "方案沒有列出任何模型"}。模型：${models.join("、") || "無"}`,
  "chatgpt.using": ({ email, name, id, path, models, app }) =>
    `已用 ${email} 登入。使用方案中的 ${name}（${id}）（${path}）。${
      models.some((other) => other !== id)
        ? `\n其他模型：${models.filter((other) => other !== id).join("、")}；選擇方式：${app} login chatgpt <model>`
        : ""
    }`,
  "chatgpt.notSignedIn": () => "尚未登入 ChatGPT。",
  "chatgpt.signedOut": () => "已登出 ChatGPT。",
  "chatgpt.signedOutUnconfirmed": () =>
    "已在本機登出；無法連線到 OpenAI 撤銷登入，登入會在 token 到期時失效。",

  // Sync
  "sync.question": () => "要把工作階段同步到你的 Tauric 帳號嗎？",
  "sync.questionSubtitle": () => "隨時可以關閉。",
  "sync.turnOn": () => "開啟",
  "sync.keepOff": () => "保持關閉",
  "sync.sends": () =>
    "同步會在每次儲存時把工作階段複製到你的 Tauric 帳號：包括你的問題、回答、工具的參數與結果（市場資料、申報文件、新聞）、agents 的工作、從記憶中取回的內容，以及 DeepSeek 模型的推理過程。來自 Tauric 的結果會完整包含其資料；其他來源或過大的結果，只會同步模型讀到的文字。帳號中不在這台電腦上的工作階段會出現在 /resume 與工作階段清單中，開啟時會複製到本機。開啟同步會從目前工作階段的開頭開始複製；關閉同步不會刪除已複製的內容。",
  "sync.setButOverridden": ({ choice, path, variable, effective }) =>
    `${path} 中的同步設定為 ${choice}，但 ${variable} 讓它維持 ${effective}。`,
  "sync.isOn": ({ path }) => `同步已開啟（${path}）。`,
  "sync.isOff": ({ path }) => `同步已關閉（${path}）。目前開啟的工作階段會在下次上傳前停止複製。`,
  "sync.status": ({ state }) =>
    `同步${
      {
        unset: "尚未設定，因此不會複製任何東西；在終端機開始第一個工作階段時會詢問",
        on: "已開啟",
        onWithoutKey: "已開啟，但沒有 Tauric API 金鑰，因此不會複製任何東西",
        off: "已關閉",
      }[state]
    }。`,
  "sync.turnItWith": ({ app, to }) => `${to === "on" ? "開啟" : "關閉"}方式：${app} sync ${to}`,
  "sync.sayWhich": ({ app }) => `用法：${app} sync on|off|status`,
  "sync.onWithoutKey": () => "同步已開啟，但沒有 Tauric API 金鑰，因此不會複製任何東西。",

  // The terminal app
  "app.placeholder": () => "詢問公司、市場或申報文件",
  "app.getKey": () => `取得 Tauric 的 ${KEY_PURPOSE} API：${SIGN_UP_URL}`,
  "app.addKey": () => "用 /login 加入你的金鑰。",
  "app.tryLead": () => "試試：",
  "app.tryExamples": () => "NVDA 跟同業比起來貴嗎？ | 美債殖利率的驅動因素是什麼？",
  "app.keyHints": ({ separator }) => ["/help 查看指令", "esc 停止"].join(separator),
  "report.title": () => "研究報告",
  "report.question": () => "問題",
  "report.added": () => "規劃時補充",
  "report.sources": () => "資料來源",
  "report.written": ({ at }) => `${at.slice(0, 10)} ${at.slice(11, 16)} UTC`,
  "report.page": ({ page, count }) => `第 ${page} 頁，共 ${count} 頁`,
  "app.mode": ({ mode }) => (mode === "auto" ? "自動模式" : "規劃模式"),
  "app.modeSwitch": () => "shift+tab 切換",
  "app.planAsk": () => "要執行這個計畫嗎？",
  "app.planRun": () => "執行",
  "app.planRunNote": () => "會切換到自動模式",
  "app.planChange": () => "輸入要修改計畫的地方",
  "app.runPlan": () => "執行這個計畫。",
  "app.resumeHint": ({ app, id }) => `繼續這個工作階段：${app} --resume ${id}`,
  "app.unknownCommand": ({ name }) => `/${name} 不是指令；/help 會列出所有指令`,
  "app.afterThisAnswer": ({ name }) => `/${name} 可在這次回答結束後執行`,
  "app.noCommand": () => "沒有符合的指令",
  "app.noModelNow": () => "目前沒有可用的模型：用 /login 連接供應商。",
  "app.newSession": ({ id }) => `新的工作階段 ${id}。`,
  "app.resumed": ({ id }) => `已繼續工作階段 ${id}。`,
  "app.noOtherSessions": () => "這裡還沒有其他工作階段。",
  "app.resumeWhich": () => "要繼續哪個工作階段？",
  "app.deleteHere": () => "要刪除這個工作階段嗎？enter / esc",
  "app.deleteEverywhere": () => "要從本機與 Tauric 帳號刪除這個工作階段嗎？enter / esc",
  "app.deleted.here": () => "已刪除工作階段。",
  "app.deleted.everywhere": () => "已從本機與 Tauric 帳號刪除工作階段。",
  "app.deleted.pending": () => "已在本機刪除；帳號中的副本會在能連線到 Tauric 時刪除。",
  "app.deleted.account": () => "已從 Tauric 帳號刪除工作階段。",
  "app.deleted.accountPending": () => "帳號中的工作階段副本會在能連線到 Tauric 時刪除。",
  "app.sessionNote": ({ ago, turns }) => `${ago}，${turns} 輪`,
  "app.sessionInAccount": ({ ago }) => `${ago}，在你的 Tauric 帳號中`,
  "app.copiedFromAccount": () => "已從 Tauric 帳號複製工作階段。",
  "app.whatsNew": ({ version, item }) => `${version} 新功能：${item}`,
  "app.noNotes": ({ version }) => `${version} 沒有更新說明。`,
  "app.justNow": () => "剛剛",
  "app.ago": ({ amount }) => `${amount}前`,
  "app.setupFailed": ({ reason }) => `沒有再儲存其他設定：${reason}`,
  // Setup: first run, /login and /model.
  "setup.chooseProvider": () => "回答要從哪裡來？",
  "setup.chooseLogin": () => "要連接哪一個？",
  "setup.chooseModel": () => "要用哪個模型？",
  "setup.chooseReasoning": () => "推理強度要多高？",
  "setup.about.chatgpt": () => "用 ChatGPT 帳號登入，使用你的方案",
  "setup.about.claude-code": () => "透過本機已登入的 Claude Code（claude CLI），僅限個人使用",
  "setup.about.openai": () => "platform.openai.com 的 API 金鑰",
  "setup.about.anthropic": () => "console.anthropic.com 的 API 金鑰",
  "setup.about.google": () => "aistudio.google.com 的 API 金鑰",
  "setup.about.deepseek": () => "platform.deepseek.com 的 API 金鑰",
  "setup.about.openrouter": () => "openrouter.ai 的金鑰",
  "setup.about.openai-compatible": () => "vLLM、Ollama 或任何提供 OpenAI 式 API 的伺服器",
  "setup.about.tauric": () => `${KEY_PURPOSE}，一把金鑰搞定`,
  "setup.ready": () => "就緒",
  "setup.signedIn": () => "已登入",
  "setup.current": () => "目前",
  "setup.default": () => "預設",
  "setup.fast": () => "快速",
  "setup.recommended": () => "推薦",
  "setup.connect": () => "連接",
  "setup.context": ({ tokens: count }) => `${tokens(count)} 上下文`,
  "setup.cost": ({ input, output }) => `每百萬 token $${input}/$${output}`,
  "setup.subscription": () => "訂閱額度",
  "setup.levels": ({ least, most }) => (least === most ? `推理 ${least}` : `推理 ${least} 到 ${most}`),
  "setup.providerDefault": () => "預設",
  "setup.keyFor": ({ provider }) => `${provider} API 金鑰（只儲存在這台電腦）`,
  "setup.keyInEnv": ({ variable }) => `${variable} 已設定。要使用它嗎？`,
  "setup.keyStored": () => "已有儲存的金鑰。要使用它嗎？",
  "setup.useIt": () => "使用",
  "setup.enterAnother": () => "輸入另一把",
  "setup.tauricKey": () => `貼上你的 Tauric ${KEY_PURPOSE} API 金鑰。${getOne()}`,
  "setup.skipHint": () => "enter 略過 | esc 返回",
  "setup.serverAddress": () => "伺服器位址，例如 http://localhost:8000/v1",
  "setup.intro": ({ title }) => `${title}：選擇回答的來源。Esc 回上一步；Ctrl+C 離開。`,
  "setup.left": ({ app }) => `已離開設定。已儲存的內容會保留；執行 ${app} 繼續。`,
  "setup.keyNotSaved": ({ reason }) => `金鑰未儲存：${reason}`,
  "setup.signedInAs": ({ email }) => `已用 ${email} 登入 ChatGPT。`,
  "setup.answered": ({ title, answer }) => `${title} ${answer}`,
  "setup.serverAddressAgain": ({ problem }) => `無法使用這個位址：${problem}`,
  "setup.serverModel": () => "模型名稱（以伺服器的命名為準）",
  "setup.serverKey": () => "伺服器的 API 金鑰（若需要）",
  "setup.connected": ({ provider }) => `已連接 ${provider}。用 /model 開始使用。`,
  "setup.serverNamedElsewhere": ({ variable }) =>
    `已為新的工作階段儲存伺服器，但 ${variable} 指定了另一個位址：這個工作階段維持原本的模型。`,
  "setup.serverSaved": ({ model }) =>
    `已儲存伺服器。從下一個問題起使用 ${model}，這個與之後的工作階段都適用。`,
  "setup.looksLikeKey": () => "這看起來像金鑰；金鑰會在位址與模型之後詢問。",
  "setup.tauricSaved": () => "已連接 Tauric。從下一個問題起使用它的資料；/model 可切換到它的模型。",
  "setup.signInElsewhere": ({ app }) => `請在終端機登入：${app} login chatgpt`,
  "setup.modelNamedElsewhere": ({ where }) => `${where} 設定時，新的工作階段會使用它指定的模型。`,
  "setup.modelSaved": ({ model }) => `從下一個問題起使用 ${model}，這個與之後的工作階段都適用。`,
  "setup.claudeCodeMissing": ({ command }) =>
    `找不到 Claude Code（${command}）。請先安裝並執行 claude 登入，或用 TRADINGAGENTS_CLAUDE_PATH 指定路徑。`,
  "setup.claudeCodeSignedOut": () => "Claude Code 尚未登入。請在終端機執行 claude 並完成登入後再試一次。",
  "setup.claudeCodeReady": ({ version }) => `已找到 Claude Code ${version}，將使用你本機的登入。`,
  // A setup step's key row, its fields joined by the separator.
  "form.pickHint": ({ separator, filter, deletes, esc }) =>
    [
      "上/下 選擇",
      ...(filter ? ["輸入以篩選"] : []),
      "enter 確定",
      ...(deletes ? ["ctrl+d 刪除"] : []),
      `esc ${esc}`,
    ].join(separator),
  "form.filtering": ({ query, separator, esc }) =>
    [`符合「${query}」`, "enter 確定", `esc ${esc}`].join(separator),
  "form.fieldHint": ({ separator }) => ["enter 繼續", "esc 返回"].join(separator),
  "form.questionHint": ({ count, separator, esc }) =>
    [
      "上/下 選擇",
      count > 1 ? `1-${count} 選取` : "1 選取",
      "在最後一列輸入",
      "enter 確定",
      `esc ${esc}`,
    ].join(separator),
  "ask.own": () => "輸入其他內容…",
  "form.noMatch": ({ query }) => `沒有符合「${query}」的項目`,
  "app.syncState": ({ state }) =>
    ({ unset: "未設定", on: "開啟", onWithoutKey: "開啟，但沒有 Tauric API 金鑰", off: "關閉" })[state],
  "app.search": ({ query }) => `搜尋先前的問題：${query}`,
  "app.searchNone": ({ query }) => `搜尋先前的問題：${query}（沒有符合）`,
  "app.historyUnsaved": ({ reason }) => `無法保存先前的問題：${reason}`,
  "app.queued": ({ text }) => `已排入佇列：${text}`,
  "app.queuedMore": ({ count }) => `另有 ${count} 個在佇列中`,
  "app.queuePaused": () => "佇列已暫停：Enter 送出下一個，上鍵取回",
  "app.dataTauric": () => "Tauric Research",
  "app.dataYahoo": () => "僅 Yahoo 價格",
  "app.interrupted": () => "這個問題沒有完成：執行中工作階段就結束了。",
  "app.stoppedUnexpectedly": ({ reason }) => `執行意外停止：${reason}`,
  "app.stoppedAtLimit": ({ cap }) => `已達${CAP_WORDS[cap] ?? cap}上限而停止`,
  "app.stopping": () => "停止中…",
  "app.escToStop": () => "esc 停止",
  // What the status row says the turn is doing.
  "app.phaseThinking": () => "思考中…",
  "app.thinkingHeader": () => "思考",
  "app.thoughtFor": ({ durationMs }) => `思考了 ${duration(durationMs)}`,
  "app.phaseFetching": () => "取得資料中…",
  "app.phaseWriting": () => "撰寫中…",
  "app.phaseWorking": () => "處理中…",
  "app.phaseSummarizing": () => "摘要先前的對話中…",
  "app.phaseReconnecting": () => "重新連線中…",
  "app.retryOf": ({ attempt, of }) => `第 ${attempt}/${of} 次重試`,
  "app.thinkingLong": ({ seconds }) =>
    seconds >= 45 ? "深度思考中" : seconds >= 30 ? "還在多想一些" : seconds >= 20 ? "想得更多" : "仍在思考",
  "app.linesAbove": ({ count }) => `… 上方還有 ${count} 行`,
  "app.toolCount": ({ count }) => `${count} 個工具`,
  "app.fetched": ({ count, sources = [] }) =>
    sources.length ? `從 ${sources.join("、")} 取得 ${count} 筆` : `取得 ${count} 筆資料集`,
  "app.failedCount": ({ count }) => `${count} 筆失敗`,
  "app.exported": ({ path, what }) => `已將${what === "report" ? "報告" : "對話紀錄"}儲存到 ${path}。`,
  "app.exportFailed": ({ path, reason, what }) =>
    `無法把${what === "report" ? "報告" : "對話紀錄"}寫入 ${path}（${reason}）。`,
  "app.uncovered": ({ count }) =>
    `${count} 個字元沒有可用的內嵌字型，會顯示成空框。請設定 TRADINGAGENTS_PDF_FONT 指向一個中文字型檔。`,
  "app.noReport": () => "還沒有可匯出的回答：報告是由最後一個回答產生的。",
  "app.exportWhat": () => "要匯出什麼？",
  "app.exportPdf": () => "PDF 報告",
  "app.exportPdfNote": () => "最後的回答，排版成報告",
  "app.exportMd": () => "Markdown",
  "app.exportMdNote": () => "完整對話紀錄",
  "app.exportBoth": () => "兩者",
  "app.exportBothNote": () => "報告與對話紀錄，存成兩個檔案",
  "app.exportNoAnswer": () => "還沒有回答",
  "app.exportWhere": () => "儲存到",
  "app.exportWhereBoth": () => "儲存到（會自動加上 .pdf 與 .md）",
  "app.exportWhereHint": ({ separator }) => ["enter 儲存", "esc 返回"].join(separator),
  "app.noAnswerToCopy": () => "還沒有可以複製的回答。",
  "app.copied": () => "已複製最後的回答。",
  "app.copiedThroughTerminal": () => "已透過終端機複製最後的回答（終端機必須允許程式設定剪貼簿）。",
  "app.copyTooLong": () => "最後的回答太長，無法透過終端機複製：用 /export md 存成檔案。",
  "app.copyUnsupported": () => "這個終端機不允許程式設定剪貼簿：用 /export md 把回答存成檔案。",
  "app.agentsRunning": ({ count }) => `${count} 個 agents 執行中`,
  "app.agentsFinished": ({ count }) => `${count} 個 agents 已完成`,
  "app.agentsStopped": ({ count }) => `${count} 個 agents 已停止`,
  "app.agentStopped": () => "已停止",
  "app.someTool": () => "工具",
  "app.reportWritten": () => "報告已完成",
  "app.moreRunning": ({ count }) => `  另有 ${count} 個執行中`,
  "app.tokens": ({ count }) => `${tokens(count)} tokens`,
  "app.worked": ({ durationMs }) => `耗時 ${duration(durationMs)}`,
  "app.tokensIn": ({ count }) => `輸入 ${tokens(count)}`,
  "app.tokensOut": ({ count }) => `輸出 ${tokens(count)}`,
  "app.planCount": ({ done, total }) => `計畫 ${done}/${total}`,
  "app.planHeading": () => "計畫",
  "app.planDone": ({ done, total }) => `已完成 ${done}/${total}`,
  "app.planMore": ({ count }) => `還有 ${count} 項`,
  "app.stopped": () => "已停止。",
  // Headless runs keep the English wording scripts may parse.
  "app.usagePlain": ({ durationMs, inputTokens, outputTokens }) =>
    `${durationMs !== undefined ? `${duration(durationMs)}, ` : ""}${tokens(inputTokens)} tokens in, ${tokens(outputTokens)} out`,

  // Runs
  "run.cap": ({ cap }) => `已達${CAP_WORDS[cap]}上限，因此根據目前蒐集到的資料撰寫回答。`,
  "run.answerCutAtLimit": () => "回答在時間上限時被截斷；內容到當時寫到的地方為止。",
  "run.tooMuchContext": () => "這個問題需要的上下文超過模型容量；請問更聚焦的問題，或開始新的工作階段。",
  "run.olderResultsSetAside": () => "為了維持在模型的上下文內，較早的資料結果已暫時移出；模型可以再取回。",
  "run.declined": () => "模型拒絕回答。",
  "run.stepError": () => "模型在這一步發生錯誤。",
  "run.answerCut": () => "回答在模型的輸出上限被截斷。",
  "run.retrying": ({ reason }) => `模型沒有回應（${reason}）；重試中。`,
  "run.cancelled": () => "已取消。",
  "run.memoryHeld": ({ name }) => `${name} 正由另一個程序使用`,
  "model.streamUnfinished": () => "串流在完成前就結束了",
  "signin.yourAccount": () => "你的 ChatGPT 帳號",
  "limits.notSettings": ({ path }) => `limits.${path}：應為一次執行的設定，例如 { "steps": 10 }`,
  "limits.notALimit": ({ path }) => `limits.${path}：不是上限（steps、tokens 或 time）`,
  "limits.invalid": ({ path, reason }) => `limits.${path}：${reason}`,
  "limits.byAgent": () => "limits.agents：依 agent 名稱設定",
  "limits.mainUnderQuestion": () => "limits.agents.main：主 agent 的上限請設在 question 底下",
  "limits.notAnAgent": ({ name }) => `limits.agents.${name}：不是 agent 名稱`,
  "app.catalogBuiltIn": () => "內建",
  "app.catalogBuiltInAside": () => "內建",
  "app.catalogUser": () => "你的",
  "app.catalogUnavailable": () => "此工作階段無法使用",
  "app.catalogNone": ({ kind, name }) => `沒有名為 ${name} 的 ${kind}：/${kind}s 會列出全部。`,
  "app.catalogOne": ({ kind }) => `/${kind}s <name> 顯示單一項目的完整內容。`,
  "app.helpCommands": () => "指令",
  "app.helpKeys": () => "快捷鍵",
  "agentFiles.skipped": ({ path, problem }) => `未使用 ${path}：${problem}`,
  "agentFiles.warning": ({ path, problem }) => `${path}：${problem}`,
  "agentFiles.shadows": ({ path, name, other }) =>
    `${name} 改用 ${path}，取代${other === "built-in" ? "內建版本" : other}`,
  "agentFiles.modelReserved": ({ path }) => `${path}：model 設定會被忽略；agent 使用工作階段的模型`,
  "limits.noSuchAgent": ({ name, agents }) => `limits.agents.${name}：沒有這個 agent（可用：${agents}）`,
  "limits.notAnOutputLimit": ({ field }) => `limits.output.${field}：不是上限（stepTokens 或 finalTokens）`,
  "limits.flagShape": ({ flag }) => `--limit ${flag}：格式為 key=value，例如 question.time=20m`,
  "limits.flagUnknown": ({ flag }) => `--limit ${flag}：不是上限`,
  "run.failed": () => "執行失敗。",
  "run.noReportCut": () => "沒有寫出報告就結束了（回答在輸出上限被截斷）",
  "run.noReportTime": () => "沒有寫出報告就結束了（時間上限不夠撰寫報告）",
  "run.noReportEmpty": () => "沒有寫出報告就結束了（回答是空的）",
  "run.noReason": () => "未提供原因",
  "answer.sources": () => "資料來源：",
  "run.busy": () => "這個工作階段已有一輪正在執行",
  "run.timeLimitReached": () => "已達時間上限",
  "run.timeTooShort": () => "時間上限太短，來不及寫出回答。請設定較長的上限，例如 --limit question.time=5m。",
  "run.timeTooShortThinking": () =>
    "時間上限太短，來不及寫出回答。請設定較長的上限，例如 --limit question.time=5m，或設定 providers.openai-compatible.thinking 讓回答可以略過思考。",
  "run.decisionNotSaved": ({ reason }) => `無法儲存決策（${reason}）。`,
  "run.summaryFailed": ({ reason }) => `無法摘要先前的對話（${reason}）；改為暫時移出較早的結果。`,
  "run.summarized": ({ turns, kept }) =>
    `已摘要先前 ${turns} 輪對話，以維持在模型的上下文內${kept ? "；最新一輪保持原樣" : ""}。`,
  "run.memoryUnreadable": ({ name, reason }) => `無法讀取記憶檔 ${name}（${reason}）。`,

  // Model setup
  "model.keyRefused": ({ provider, url, said }) =>
    `${provider} 拒絕了金鑰（${said}）。用 /login 儲存新的金鑰。申請網址：${url}`,
  "model.noCredit": ({ provider, said }) =>
    `${provider} 表示帳號已無額度（${said}）。請到 ${provider} 加值後再問一次。`,
  "model.creditsSpent": ({ resets }) =>
    `你今天的 Tauric AI 額度已用完${resets ? `；將於 ${resets} 重置` : ""}。`,
  "model.windowAssumedPlan": ({ tokens: count }) =>
    `方案模型未回報上下文長度，因此假設為 ${count} tokens；在設定中設定 providers.chatgpt.contextWindow 可使用更多。`,
  "model.windowAssumed": ({ tokens: count, provider }) =>
    `不知道模型的上下文長度，因此假設為 ${count} tokens；在設定中設定 providers.${provider}.contextWindow 可使用更多。`,
  "model.claudeCodeMissing": ({ command }) =>
    `找不到 Claude Code（${command}）。請安裝 Claude Code 並登入，或用 TRADINGAGENTS_CLAUDE_PATH 指定路徑。`,
  "model.claudeCodeSignedOut": () => "Claude Code 尚未登入：在終端機執行 claude 並完成登入。",
  "model.claudeCodeLimit": ({ said }) =>
    `Claude 訂閱的使用額度已達上限（${said}）；請稍後再試或改用其他模型。`,
  "model.claudeCodeFailed": ({ said }) => `Claude Code 執行失敗：${said}`,

  // Sessions
  "session.switchFailed": ({ reason }) => `無法切換模型（${reason}）；工作階段維持原本的模型。`,
  "session.unsaved": ({ reason }) => `無法儲存這個工作階段（${reason}）；將在不儲存的情況下繼續。`,
  "session.payloadNotKept": ({ reason }) => `無法在這台電腦保存結果資料（${reason}）；工作階段保留其預覽。`,
  "session.noLongerSaved": ({ reason }) => `這個工作階段已無法再儲存（${reason}）；將在不儲存的情況下繼續。`,
  "session.badId": ({ id }) => `「${id}」不是工作階段 id`,
  "session.missing": ({ id }) => `沒有工作階段 ${id}。`,
  "session.repaired": ({ id }) => `工作階段 ${id} 的結尾因當機而不完整，已修復。`,
  "session.damaged": ({ id, line }) => `工作階段 ${id} 在第 ${line} 行損毀，無法繼續。`,
  "session.lockStuck": ({ id, path }) => `工作階段 ${id} 被一個已結束的程序鎖住；移除 ${path} 即可開啟。`,
  "session.openElsewhere": ({ id, pid }) => `工作階段 ${id} 已在另一個終端機開啟（程序 ${pid}）。`,
  "session.openOnHost": ({ id, host, pid, path }) =>
    `工作階段 ${id} 已在 ${host} 開啟（程序 ${pid}）；若實際上沒有，移除 ${path} 即可在這裡開啟。`,
  "session.lockUnreadable": ({ id, path }) =>
    `工作階段 ${id} 被 ${path} 鎖住，且無法讀取；若沒有終端機開啟它，請移除該檔案。`,

  // Session sync while running
  "sync.stoppedKey": ({ reason }) => `工作階段同步已停止：Tauric 拒絕了金鑰（${reason}）。`,
  "sync.stoppedQuota": ({ reason }) => `工作階段同步已停止：Tauric 額度已用完（${reason}）。`,
  "sync.storageFull": ({ remainingBytes }) =>
    `工作階段同步已停止：你的 Tauric 儲存空間已滿${remainingBytes !== undefined ? `（剩餘 ${formatBytes(remainingBytes)}）` : ""}。已複製的工作階段會保留；刪除舊的可騰出空間。`,
  "sync.copyFailed": ({ reason }) =>
    `無法從 Tauric 帳號複製工作階段（${reason}）。沒有保留任何內容；請再試一次。`,
  "sync.copyNotThis": ({ id }) => `Tauric 帳號中的工作階段 ${id} 副本與本機的開頭不同。沒有保留任何內容。`,
  "sync.deleteUnconfirmed": ({ id, reason }) =>
    `工作階段 ${id} 不在這台電腦上，且無法向 Tauric 帳號查詢（${reason}）。沒有刪除任何東西。`,
  "sync.listFailed": ({ reason }) => `無法列出 Tauric 帳號中的工作階段（${reason}）；以下是這台電腦上的。`,
  "sync.copyIncomplete": ({ id, got, size }) =>
    `無法從 Tauric 帳號複製工作階段 ${id}：只收到 ${size} 位元組中的 ${got}。沒有保留任何內容；請再試一次。`,
  "sync.copyDamaged": ({ id, line }) =>
    `Tauric 帳號中的工作階段 ${id} 無法被這個版本讀取（${line ? `第 ${line} 行` : "最後一行不完整"}）。沒有保留任何內容。`,
  "sync.paused": ({ reason }) =>
    `此工作階段的同步已暫停：Tauric 的副本與這個檔案不同（${reason}）。兩者都會保留。`,
  "sync.refused": ({ reason }) => `工作階段同步已停止：Tauric 拒絕了請求（${reason}）。`,
  "sync.unreachable": ({ reason }) => `工作階段同步無法連線到 Tauric；會在下次回答後再試（${reason}）。`,
  "sync.lineTooLarge": () => "工作階段同步已停止：此工作階段有一行超過單次上傳的大小上限。",
  "sync.turnedOff": () => "工作階段同步已停止：同步已關閉。",
  "sync.notOffered": ({ app }) =>
    `工作階段同步暫時關閉：你的 Tauric 帳號不保存 ${app} 工作階段，因此不會複製任何東西。`,

  // ChatGPT sign-in
  "signin.hint": ({ app }) => `尚未登入 ChatGPT；請執行 \`${app} login chatgpt\`。`,
  "signin.renewFailedNow": () => "OpenAI 目前無法更新你的 ChatGPT 登入；請再試一次。",
  "signin.renewFailedRecently": () => "OpenAI 剛才無法更新你的 ChatGPT 登入；請一分鐘後再試。",
  "signin.cannotRenew": ({ hint }) => `你的 ChatGPT 登入無法更新。${hint}`,
  "signin.renewTask": () => "更新你的 ChatGPT 登入",
  "signin.signInTask": () => "幫你登入 ChatGPT",
  "signin.modelsTask": () => "列出方案的模型",
  "signin.signInAgainAction": ({ app }) => `再執行一次 \`${app} login chatgpt\``,
  "signin.signInAgain": () => "重新登入",
  "signin.renewUnreadable": ({ app }) =>
    `無法讀取 OpenAI 對更新登入的回應；請再執行一次 \`${app} login chatgpt\`。`,
  "signin.otherAccountRenewed": () => "更新後的 ChatGPT 登入屬於另一個帳號。",
  "signin.cancelled": () => "登入已取消。",
  "signin.timedOut": ({ app }) => `ChatGPT 登入逾時；請再執行一次 \`${app} login chatgpt\`。`,
  "signin.returnToTerminal": ({ product }) => `回到終端機完成 ${product} 的登入。`,
  "signin.openAddress": () => "以 ChatGPT 繼續：開啟這個網址，並用你的 ChatGPT 方案登入：",
  "signin.pasteIfNeeded": () => "如果瀏覽器無法連到這台電腦，請把最後停留的網址貼到這裡。",
  "signin.notThatAddress": () => "這不是這次登入結束時的網址；請貼上完整網址。",
  "signin.cannotListen": ({ reason }) => `以 ChatGPT 登入需要在這台電腦上監聽連線，但無法做到（${reason}）。`,
  "signin.notCompleted": ({ code }) => `ChatGPT 登入未完成${code ? `（${code}）` : ""}。`,
  "signin.notRegistered": ({ app, product }) =>
    `ChatGPT 登入沒有註冊 ${product}；請執行 \`${app} logout chatgpt\` 後重新登入。`,
  "signin.otherAccount": ({ email, app }) =>
    `這台電腦已用 ${email ?? "另一個帳號"} 登入；請先執行 \`${app} logout chatgpt\`。`,
  "signin.planDenied": ({ product }) => `ChatGPT 不允許 ${product} 使用你的方案；請重新登入並同意方案使用。`,
  "signin.planNotAllowed": ({ app, product }) =>
    `ChatGPT 尚未允許 ${product} 使用你的方案；請執行 \`${app} login chatgpt\` 並同意方案使用。`,
  "signin.modelsUnlisted": ({ status }) => `OpenAI 沒有列出方案的模型（HTTP ${status}）。`,
  "signin.cannotCheck": () => "無法連線到 OpenAI 確認登入；請再試一次。",
  "signin.tokenUnverified": () => "ChatGPT 登入傳回的 id token 無法用 OpenAI 的金鑰驗證。",
  "signin.tokenMismatch": () => "ChatGPT 登入傳回的 id token 與這次登入不符。",
  "signin.unreachable": ({ task }) => `無法連線到 OpenAI 以${task}；請再試一次。`,
  "signin.busy": ({ task, code }) => `OpenAI 目前無法${task}（${code}）；請再試一次。`,
  "signin.refused": ({ task, code, action }) => `OpenAI 沒有${task}（${code}）；請${action}。`,
  "signin.unreadable": ({ task }) => `要求 OpenAI ${task}時，無法讀取其回應；請再試一次。`,
  "signin.lockStuck": ({ path }) => `ChatGPT 登入被一個已結束的程序鎖住；移除 ${path} 後再試一次。`,
  "signin.lockBusy": ({ product }) => `另一個 ${product} 程序正在更新 ChatGPT 登入；請再試一次。`,
  "model.stalled": ({ durationMs }) => `模型 ${duration(durationMs)} 沒有傳送任何內容；已結束這個請求。`,
  "model.usageLimit": () => "ChatGPT 方案的使用額度已達上限；請稍後再試或改用其他模型。",

  // Settings and private files
  "config.emptyVariable": ({ name }) => `${name} 已設定但為空值；請取消設定或給它一個值`,
  "config.keyTooShort": ({ name }) => `${name} 太短，不像是金鑰`,
  "config.keyOneLine": () => "金鑰必須是單行且非空白",
  "config.badModel": ({ where, problem }) => `${where}：${problem}`,
  "config.modelForm": ({ providers }) => `模型格式為 provider/id，provider 必須是 ${providers} 之一`,
  "config.unknownProvider": ({ providers }) => `模型的 provider 不是 ${providers} 之一`,
  "config.unknownProviderBlock": ({ path, providers }) => `${path}：providers 中有不屬於 ${providers} 的區塊`,
  "session.routeUnusable": ({ was, reason, now }) =>
    `工作階段原本使用 ${was}，現在無法使用${reason ? `（${reason}）` : ""}${now ? `；改用 ${now} 繼續` : ""}`,
  "session.signedOut": ({ app }) => `尚未登入 ChatGPT：${app} login chatgpt`,
  "session.changedWhileOpening": () => "開啟時工作階段發生變動；請再開啟一次",
  "config.noKey": ({ provider, vars, app }) =>
    `${keyLabel(provider)} 模型需要 API 金鑰：設定 ${vars}，或用 ${app} key ${provider} 儲存`,
  "config.badReasoning": ({ where, levels }) => `${where}：reasoning 必須是 ${levels} 之一`,
  "config.keyForOtherServer": ({ endpoint, app }) =>
    `儲存的伺服器金鑰是給 ${endpoint || "另一台伺服器"} 用的，不會傳給這台：請用 ${app} key model 儲存這台伺服器的金鑰`,
  "config.serverFirst": ({ var: name }) =>
    `請先設定伺服器位址（設定檔中的 providers.openai-compatible.baseURL，或 ${name}）；金鑰會綁定該伺服器`,
  "config.noBaseUrl": ({ var: name }) =>
    `OpenAI 相容模型需要伺服器的 base URL：在設定檔中設定 providers.openai-compatible.baseURL，或 ${name}`,
  "config.invalidProviders": ({ path }) => `${path}：providers 無效`,
  "config.invalidProvider": ({ path, provider }) => `${path}：providers.${provider} 無效`,
  "config.invalidProviderField": ({ path, provider, field }) =>
    `${path}：providers.${provider}.${field} 無效`,
  "config.badBaseUrl": ({ problem }) => `模型 base URL ${problem}`,
  "config.notAUrl": () => "不是 URL",
  "config.urlScheme": () => "必須以 http:// 或 https:// 開頭",
  "config.urlCredentials": () => "不能包含帳密；請改設定模型金鑰",
  "config.badSync": ({ where }) => `sync 必須是 "on" 或 "off"（${where}）；同步維持關閉`,
  "config.keyLength": ({ min }) => `金鑰至少要 ${min} 個字元`,
  "config.fixFirst": ({ path }) => `${path} 無效；請先修正或移除`,
  "config.notObjectFixFirst": ({ path }) => `${path} 不是 JSON 物件；請先修正或移除`,
  "config.unreadable": ({ path }) => `無法讀取 ${path}`,
  "config.notObject": ({ path }) => `${path} 不是 JSON 物件`,
  "config.invalidModel": ({ path }) => `${path}：model 無效`,
  "config.keysUnused": ({ reason }) => `${reason}；其中的金鑰不會被使用`,
  "config.credentialsNotObject": ({ path }) => `${path} 不是 JSON 物件；其中的金鑰不會被使用`,
  "config.unusableKey": ({ path, field }) => `${path}：無法使用的金鑰 ${field}`,
  "config.homeNotAbsolute": ({ variable }) => `${variable} 必須是絕對路徑`,
  "file.symlink": ({ path }) => `${path} 是符號連結`,
  "file.notRegular": ({ path }) => `${path} 不是一般檔案`,
  "file.otherOwner": ({ path }) => `${path} 屬於其他使用者`,
  "file.tooOpen": ({ path }) => `${path} 可被其他人讀取或修改（請執行 chmod 600）`,
  "file.notDirectory": ({ path }) => `${path} 不是目錄`,
  "file.damaged": ({ path, line }) => `${path} 在第 ${line} 行損毀`,
  "file.damagedAt": ({ line }) => `在第 ${line} 行損毀`,

  // Data
  "data.notAvailable": ({ capability }) => `${capability}：目前的設定無法使用。`,
  "data.needsKey": ({ capability, app }) =>
    `${capability}：需要 Tauric API 金鑰。用 \`${app} key tauric\` 或 TAURIC_API_KEY 加入。${getOne()}`,
  "data.listingNotServed": () => "不提供這份清單",
  "data.attempt": ({ source, outcome, detail }) => `${source} ${OUTCOMES[outcome] ?? "失敗"}（${detail}）`,
  "data.fellBack": ({ failed, source }) => `${failed}；這是來自 ${source} 的資料。`,
  "data.signUp": ({ app }) =>
    `Tauric 的 ${KEY_PURPOSE} API 金鑰可取得申報文件、財報、新聞等資料。用 \`${app} key tauric\` 或 TAURIC_API_KEY 加入。${getOne()}`,
  "data.batchFellBack": ({ instruments, source, failed }) =>
    `${instruments} 來自 ${source}：${failed} 無法提供。`,
  "data.sourceAfter": ({ source, failed }) => `${source}（${failed} 失敗後）`,
  "data.source": ({ source }) => `來源：${source}`,
  "data.answerTooLong": ({ source, bytes }) => `${source} 的回應超過 ${bytes} 位元組。`,

  // Tool summaries in the transcript
  "tool.skill": ({ name }) => `skill ${name}`,
  "tool.skillLoaded": ({ name }) => `${name} skill 已在這一輪稍早載入；其方法在上方。`,
  "tool.plan": ({ count }) => `計畫：${count} 個步驟`,
  "tool.asked": ({ count }) => `提出了 ${count} 個問題`,
  "tool.askedAlready": () => "這一輪已提出的問題就是畫面上這些；請把要問的都放在同一次呼叫。",
  "tool.askShown": () => "問題已顯示給使用者；回覆會在他們的下一則訊息中。",
  "ask.questions": ({ questions }) =>
    questions
      .map((q) =>
        [
          q.question,
          ...q.options.map(
            (option, index) => `${index + 1}. ${option.label}${option.note ? `：${option.note}` : ""}`,
          ),
        ].join("\n"),
      )
      .join("\n\n"),
  "tool.noteSaved": () => "筆記已儲存",
  "tool.decision": ({ rating, instrument }) => `決策 ${rating} ${instrument}`,
  "tool.recalled": ({ entries }) => `${entries} 筆過去紀錄`,
  "tool.notRun": () => "未執行（一步中的呼叫太多）",
  "tool.quoteClose": ({ date }) => `（${date} 收盤）`,
  "tool.bars": ({ count, through, interval = "daily" }) =>
    `${count} 根${{ daily: "日", weekly: "週", monthly: "月" }[interval] ?? ` ${interval} `}K 線，至 ${through}`,
  "tool.rates": ({ count, through }) => `${count} 筆參考利率，至 ${through}`,
  "tool.market": ({ count }) => (count === undefined ? "快照" : `${count} 列`),
  "tool.instruments": ({ count }) => `${count} 檔標的`,
  "tool.statement": ({ count }) => `${count} 期`,
  "tool.filings": ({ count }) => `${count} 份申報文件`,
  "tool.section": ({ state }) => `沒有文字（${state}）`,
  "tool.sectionPart": ({ chars }) => `${chars.toLocaleString("en-US")} 個字元`,
  "tool.articles": ({ count, more }) => `${count} 篇文章${more ? "（還有更多）" : ""}`,
  "tool.profile": ({ sector }) => sector ?? "公司概況",
  "tool.corporateActions": ({ count }) => `${count} 筆公司行動`,
  "tool.comps": ({ count }) => `比較了 ${count} 家同業`,
  "tool.tauricView": ({ written }) => `Tauric AI 綜合分析${written ? `，撰寫於 ${written}` : ""}`,
  "tool.estimates": () => "市場共識與行事曆",
  "tool.holders": ({ count, quarter }) => `${count} 位持有人，季度截至 ${quarter}`,
  "tool.insider": ({ count, more }) => `${count} 筆交易${more ? "（還有更多）" : ""}`,
  "tool.technicals": ({ through }) => `至 ${through}`,
  "tool.seriesCandidates": ({ count }) => `${count} 個候選序列`,
  "tool.seriesEmpty": () => "沒有資料期間",
  "tool.series": ({ count, latest }) => `${count} 期，至 ${latest}`,
  "tool.markets": ({ count }) => (count ? `${count} 個進行中的市場` : "沒有進行中的市場"),

  // Tool calls: the model reads these too, so they say plainly that a failure is not a market fact.
  "call.cancelled": () => "呼叫已取消。",
  "call.failed": ({ tool, reason }) => `${tool} 失敗：${reason}`,
  "call.noData": ({ source, detail }) => `${source} 沒有這個請求的資料：${detail}`,
  "call.invalid": ({ source, detail, candidates }) =>
    `${source} 無法依此方式回答這個請求：${detail}${candidates ? ` 候選項目：${candidates}。` : ""}`,
  "call.unsupported": ({ source, detail }) => `${source} 不支援這個請求（${detail}）；這不是關於市場的事實。`,
  "call.quota": ({ source, until }) =>
    `${source} 額度已用完${until ? `，直到 ${until}` : ""}；這不是關於市場的事實。`,
  "call.rateLimited": ({ source }) =>
    `${source} 正在限制請求頻率；這不是關於市場的事實。請稍後再試或改用其他工具。`,
  "call.credentials": ({ source }) => `${source} 無法以目前的憑證使用；這不是關於市場的事實。`,
  "call.everySourceFailed": ({ detail }) => `${detail}。以上都不是關於市場的事實。`,
  "call.storageFull": ({ source }) => `${source} 的儲存額度已滿；這不是關於市場的事實。`,
  "call.unreachable": ({ source, detail }) =>
    `${source} 無法連線或回應無法讀取；這不是關於市場的事實。${detail}`,
};
