import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);

const STORAGE_KEY = "debate-coach-pwa.state.v2";
const ENCRYPTED_API_KEY_STORAGE_KEY = "debate-coach-pwa.encrypted-api-key.v1";
const IOS_INSTALL_HINT_DISMISSED_KEY = "debate-coach-pwa.ios-install-hint-dismissed.v1";
const LEGACY_STORAGE_KEYS = ["debate-coach-pwa.state.v1"];
const PROMPT_URL = "./content/SKILL.md";
const CASE_WRITER_PROMPT_URL = "./case-writing-skill/SKILL.md";
const PRIVACY_URL = "./content/PrivacyPolicy.md";

const UNIVERSE_CASE_SCHEMA_PROMPT = `## 批量辩案生成模式

你现在处于自动批量生成模式。不需要等待用户输入，不需要逐步引导，不需要确认。
直接基于《辩论筑基》知识体系，一次性生成一份完整的标准化辩案。

输出格式：结构化 Markdown。严格按以下章节顺序和标题输出，不得省略任何章节。

## E1 · 资料搜集

### 关键词解释
针对辩题关键词（2-3个），每个关键词给出多视角解释及对本辩题的意义。

### 参考案例
2-3个与辩题高度相关的案例，注明案例名、简述、与辩题关联、信息认知依据。

### 相关理论与学者
1-2个相关理论或学者观点，注明名称/来源、核心内容、在本辩题的应用方式。

## E3 · 论点穷举

用表格列出 10-12 条论点。我方不少于 8 条，对方不少于 2 条。

| 编号 | 因为（理由） | 所以（结论） | 立场 |
|------|------------|------------|------|

## E4 · 论证架构

### 关键词定义
每个关键词：固有定义域 → 我方讨论范围 → 完整定义陈述句。

### B0 核心标准
完整标准陈述句，说明凭什么用此标准，并给出2条支撑论证。

### 分论点
2个分论点，每个包含分论点陈述句、回扣B0的逻辑路径、2条具体论证。

### 赛制分工
表格：辩位 | 环节 | 任务 | 预计时长

## E5 · 我方防守

定义防守、讨论范围防守、B0标准防守、分论点防守。每条都写成可在赛场直接说的回应。

## E6 · 我方攻击

3个预判对方论点，每个包含：对方完整A→B→C逻辑链、事实层攻击、逻辑层攻击、价值层攻击。

## E7 · 自由辩套题

2-3个战场，每个战场包含：问、追1、追2、归、转。`;

const UNIVERSE_AGGREGATION_PROMPT = `你是一个辩论辩案聚合专家。
你的任务是把多个AI辩手独立生成的完整辩案合并成一份“高概率社会共识辩案”。

聚合规则：
1. 识别内容相同或高度相似的论点、定义、攻防路径，并统计出现频率。
2. 相似内容合并为一条，并标注 [高频: X/N]、[中频: X/N] 或 [低频: X/N]。
3. 高频内容作为主框架，低频但有价值的内容放入“补充/备选”。
4. 不要机械拼接，必须消除重复、补齐逻辑链、统一术语。
5. 输出一份完整 Markdown 辩案，包含 E1、E3、E4、E5、E6、E7。`;

const STRINGS = {
  zh: {
    appName: "Debate-Coach",
    consentTitle: "开始之前",
    consentIntro:
      "我是基于 griII-me 审问模式、学习《辩论筑基》（Debate Universal Grammar，精靈 Moon 著）全套体系内容训练的辩论教练。",
    consentItems: [
      "仅供技术学习与参考使用。",
      "本工具仅供技术学习，用户需自行承担使用 API 产生的法律、合规及费用风险。",
      "内容基于 AI 对课件的学习，而非权威视频讲解。",
      "本地会话记录默认仅保存在此设备，除非你主动导出。",
    ],
    acceptRisk: "我已理解并继续",
    later: "稍后再说",
    chat: "对话",
    history: "记录",
    extensions: "拓展",
    settings: "设置",
    extensionsTitle: "拓展",
    extensionsCopy: "把更重的辩论工具放在这里，需要时再打开。",
    argumentUniverse: "论点宇宙",
    argumentUniverseCopy: "并行采样多条模型辩案，再聚合成一份共识辩案。",
    open: "打开",
    motion: "辩题",
    stance: "持方",
    format: "赛制",
    branches: "分支数量",
    parallel: "并发数",
    startUniverse: "开始生成",
    restartUniverse: "重新生成",
    stopUniverse: "停止采样",
    saveUniverseToHistory: "放到记录中",
    universeSavedToHistory: "已放到历史记录",
    universeRunning: "采样中",
    universeAggregating: "聚合中",
    universeComplete: "已完成",
    universeIdle: "未启动",
    universeStopped: "已停止",
    universeProgress: "分支进度",
    universeMonitor: "模型实施进程",
    universeResult: "聚合辩案",
    universeNoResult: "完成后会在这里看到合并后的辩案。",
    universeBranchDetail: "分支详情",
    formatted: "格式化",
    raw: "原文",
    close: "关闭",
    expand: "展开",
    collapse: "收起",
    pending: "等待中",
    running: "生成中",
    complete: "完成",
    stopped: "已停止",
    error: "错误",
    engineUnavailable: "论点宇宙生成失败，请检查模型配置、API Key 或并发数。",
    noSession: "创建一个新会话开始旅程。",
    welcomeTitle: "开始一场新的辩论旅程",
    welcomeCopy: "输入辩题，拆解、立论、攻防与复盘。",
    placeholder: "输入辩题，开始练习...",
    apiWarning: "请先在设置中填写 API Key。",
    importedSession: "Imported Session",
    newConversation: "New Conversation",
    clearCurrent: "清空当前会话",
    clearCurrentConfirm: "这会删除当前本地聊天记录。",
    cancel: "取消",
    clear: "清空",
    importSession: "导入会话",
    exportJson: "导出 JSON",
    exportMd: "导出 Markdown",
    exportHtml: "导出 HTML",
    exportJpg: "导出 JPG",
    saved: "已保存",
    sending: "正在思考",
    regenerate: "重新生成",
    skip: "先跳过",
    historyTitle: "历史记录",
    historyCopy: "查看并恢复之前的练习会话。",
    noHistory: "还没有历史记录",
    noMessages: "还没有消息",
    delete: "删除",
    restore: "恢复",
    recycleBin: "回收站",
    recycleEmpty: "回收站为空",
    deletedSessions: "已删除会话",
    deletedEmpty: "已删除的空白会话",
    provider: "模型配置",
    endpoint: "API Endpoint",
    model: "Model",
    apiKey: "API Key",
    saveSettings: "保存配置",
    clearApiKey: "清除 API Key",
    encryptApiKey: "本地加密存储 API Key",
    encryptionPassphrase: "本地解锁密码",
    unlockApiKey: "解锁已加密 API Key",
    encryptedKeyReady: "已启用本地加密存储，当前设备会话中已解锁。",
    encryptedKeyLocked: "已启用本地加密存储。刷新或重新打开后，需要输入本地解锁密码才能使用。",
    encryptionHint: "仅用于本地加密存储；浏览器发请求时仍需在运行时解密。",
    encryptionNeedsKey: "启用本地加密前，请先输入 API Key。",
    encryptionNeedsPassphrase: "请输入本地解锁密码。",
    encryptionUnavailable: "当前浏览器不支持本地加密存储。",
    encryptionFailed: "本地加密失败，请稍后再试。",
    decryptionFailed: "解锁失败，请检查本地解锁密码是否正确。",
    apiKeyUnlocked: "API Key 已解锁",
    apiKeyEncryptedSaved: "配置已保存，API Key 已加密存储",
    directSendNotice: "请求会由APP直接发送到你填写的接口地址。",
    legal: "法律与支持",
    privacy: "隐私政策",
    support: "联系支持",
    supportText:
      "PWA 版保留了 iOS 端的核心能力，但 Web 无法 1:1 复刻系统级手势、键盘动画与原生分享面板。其余视觉、布局和操作流已经尽量贴近。",
    about: "关于",
    aboutText:
      "出品：精靈Moon\n开发：精靈Moon, Boyuan Wang\n本工具仅供技术学习，用户需自行承担使用 API 产生的法律及费用风险。\n内容基于《辩论筑基》。",
    language: "语言",
    notice: "提示",
    ok: "好的",
    installHintTitle: "保存到主屏幕",
    installHintStepShare: "点击底部分享按钮",
    installHintStepAdd: "点击“添加到主屏幕”即可在桌面使用app",
    installHintDismiss: "知道了",
    failedNoContent: "教练这次没有返回内容，你可以点击“重新生成”再试一次。",
    invalidFile: "无效文件格式，请选择由本工具导出的 JSON 文件。",
    missingKey: "请先在设置中填写 API Key。",
  },
  en: {
    appName: "Debate-Coach",
    consentTitle: "Before You Start",
    consentIntro:
      "I am a debate coach trained on the griII-me questioning style and the structured content of Debate Universal Grammar by Jingling Moon.",
    consentItems: [
      "For technical learning and reference only.",
      "You are responsible for legal, compliance, and API cost risks when using this tool.",
      "The content is learned from AI study of the course material, not an authoritative video lecture.",
      "Local conversations stay on this device by default unless you export them yourself.",
    ],
    acceptRisk: "I Understand",
    later: "Not Now",
    chat: "Chat",
    history: "History",
    extensions: "Extensions",
    settings: "Settings",
    extensionsTitle: "Extensions",
    extensionsCopy: "Heavier debate tools live here and open only when needed.",
    argumentUniverse: "Argument Universe",
    argumentUniverseCopy: "Sample many model casebooks in parallel, then merge them into one consensus case.",
    open: "Open",
    motion: "Motion",
    stance: "Side",
    format: "Format",
    branches: "Branches",
    parallel: "Parallel",
    startUniverse: "Start",
    restartUniverse: "Regenerate",
    stopUniverse: "Stop",
    saveUniverseToHistory: "Save to History",
    universeSavedToHistory: "Saved to history",
    universeRunning: "Sampling",
    universeAggregating: "Aggregating",
    universeComplete: "Complete",
    universeIdle: "Idle",
    universeStopped: "Stopped",
    universeProgress: "Branch Progress",
    universeMonitor: "Model Runs",
    universeResult: "Merged Case",
    universeNoResult: "The merged case will appear here when generation completes.",
    universeBranchDetail: "Branch Detail",
    formatted: "Formatted",
    raw: "Raw",
    close: "Close",
    expand: "Expand",
    collapse: "Collapse",
    pending: "Pending",
    running: "Running",
    complete: "Complete",
    stopped: "Stopped",
    error: "Error",
    engineUnavailable: "Argument Universe failed. Check model settings, API key, or concurrency.",
    noSession: "Create a new session to begin.",
    welcomeTitle: "Start a new debate session",
    welcomeCopy: "Enter a motion and the coach will help you build, test, and refine your case.",
    placeholder: "Enter your motion to begin...",
    apiWarning: "Enter your API Key in Settings before sending messages.",
    importedSession: "Imported Session",
    newConversation: "New Conversation",
    clearCurrent: "Clear Current Session",
    clearCurrentConfirm: "This will remove the current local chat history.",
    cancel: "Cancel",
    clear: "Clear",
    importSession: "Import Session",
    exportJson: "Export JSON",
    exportMd: "Export Markdown",
    exportHtml: "Export HTML",
    exportJpg: "Export JPG",
    saved: "Saved",
    sending: "Coach is thinking",
    regenerate: "Regenerate",
    skip: "Skip for now",
    historyTitle: "History",
    historyCopy: "Review and reopen previous practice sessions.",
    noHistory: "No saved history yet",
    noMessages: "No messages yet",
    delete: "Delete",
    restore: "Restore",
    recycleBin: "Recycle Bin",
    recycleEmpty: "Recycle bin is empty",
    deletedSessions: "Deleted Sessions",
    deletedEmpty: "Deleted empty session",
    provider: "Provider",
    endpoint: "API Endpoint",
    model: "Model",
    apiKey: "API Key",
    saveSettings: "Save Provider Settings",
    clearApiKey: "Clear API Key",
    encryptApiKey: "Encrypt API Key Locally",
    encryptionPassphrase: "Local Unlock Passphrase",
    unlockApiKey: "Unlock Encrypted API Key",
    encryptedKeyReady: "Local encrypted storage is enabled and unlocked for this device session.",
    encryptedKeyLocked: "Local encrypted storage is enabled. After refresh or reopen, enter the local passphrase to unlock it.",
    encryptionHint: "This protects local storage only; the browser still decrypts the key before sending requests.",
    encryptionNeedsKey: "Enter an API Key before enabling local encryption.",
    encryptionNeedsPassphrase: "Enter a local unlock passphrase.",
    encryptionUnavailable: "This browser does not support local encrypted storage.",
    encryptionFailed: "Local encryption failed. Please try again.",
    decryptionFailed: "Unlock failed. Please check the local passphrase.",
    apiKeyUnlocked: "API Key unlocked",
    apiKeyEncryptedSaved: "Settings saved and API Key encrypted locally",
    directSendNotice: "Requests are sent directly from this browser to the endpoint you enter, without an extra server.",
    legal: "Legal & Support",
    privacy: "Privacy Policy",
    support: "Contact Support",
    supportText:
      "The PWA keeps the iOS flow, but the web cannot fully reproduce system gestures, keyboard choreography, or native share sheets.",
    about: "About",
    aboutText:
      "Produced by: Jingling Moon\nDeveloped by: Jingling Moon, Boyuan Wang\nThis tool is for technical learning only. Users are responsible for legal and cost risks from API usage.",
    language: "Language",
    notice: "Notice",
    ok: "OK",
    installHintTitle: "Add to Home Screen",
    installHintStepShare: "Tap the Share button below",
    installHintStepAdd: "Then choose Add to Home Screen",
    installHintDismiss: "Got it",
    failedNoContent:
      "The coach returned no content this time. Tap Regenerate to try again.",
    invalidFile:
      "Invalid file format. Please select a JSON file exported by this tool.",
    missingKey: "Please enter your API Key in Settings first.",
  },
};

const DEFAULT_STATE = {
  tab: "chat",
  extensionView: "list",
  menuOpen: false,
  notice: "",
  modal: null,
  draft: "",
  streamingText: "",
  sendingSessionId: "",
  failedUserMessageIdBySession: {},
  settings: {
    baseURL: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-v4-pro",
    apiKey: "",
    keyStorageMode: "plain",
    language: "zh",
    riskAccepted: false,
    currentSessionId: "",
  },
  sessions: [],
};

function tFor(language, key) {
  return STRINGS[language]?.[key] || STRINGS.zh[key] || key;
}

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createSessionObject(title) {
  return {
    id: generateId(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    messages: [],
  };
}

function activeSessions(state) {
  return state.sessions.filter((session) => !session.deletedAt);
}

function trashedSessions(state) {
  return state.sessions.filter((session) => session.deletedAt);
}

function currentSession(state) {
  return (
    activeSessions(state).find((item) => item.id === state.settings.currentSessionId) ||
    activeSessions(state)[0] ||
    null
  );
}

function purgeExpiredDeletedSessions(sessions) {
  const now = Date.now();
  return sessions.filter((session) => {
    if (!session.deletedAt) {
      return true;
    }
    return now - new Date(session.deletedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  });
}

function ensureSessionIfNeeded(state) {
  const cleanedSessions = purgeExpiredDeletedSessions(state.sessions);
  let nextState = cleanedSessions === state.sessions ? state : { ...state, sessions: cleanedSessions };

  if (!nextState.settings.riskAccepted) {
    return nextState;
  }

  const active = activeSessions(nextState);
  if (!active.length) {
    const session = createSessionObject(tFor(nextState.settings.language, "newConversation"));
    return {
      ...nextState,
      sessions: [session, ...nextState.sessions],
      settings: { ...nextState.settings, currentSessionId: session.id },
    };
  }

  if (!active.find((item) => item.id === nextState.settings.currentSessionId)) {
    return {
      ...nextState,
      settings: { ...nextState.settings, currentSessionId: active[0].id },
    };
  }

  return nextState;
}

function suggestedTitle(language, text) {
  const clean = (text || "").replace(/\n+/g, " ").trim();
  if (!clean) {
    return tFor(language, "importedSession");
  }
  return clean.slice(0, 28);
}

function sessionPreview(language, session) {
  if (session.kind === "argument-universe" && session.universeSnapshot) {
    return session.universeSnapshot.resultMarkdown || session.universeSnapshot.compileBuffer || tFor(language, "argumentUniverseCopy");
  }
  const last = session.messages[session.messages.length - 1];
  return last ? last.content : tFor(language, "noMessages");
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString();
}

function recycleInfo(session) {
  const deletedAt = new Date(session.deletedAt);
  const expires = new Date(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return `Deleted ${deletedAt.toLocaleString()} · Expires ${expires.toLocaleString()}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url) {
  const trimmed = String(url || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function renderInlineMarkdown(text) {
  const tokens = [];
  let working = String(text || "");

  working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUrl(url);
    const token = `__MD_LINK_${tokens.length}__`;
    tokens.push(
      safeUrl
        ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
        : escapeHtml(label)
    );
    return token;
  });

  working = escapeHtml(working);
  working = working.replace(/`([^`]+)`/g, "<code>$1</code>");
  working = working.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  working = working.replace(/(^|[^\*])\*([^*]+)\*/g, "$1<em>$2</em>");
  working = working.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  working = working.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  working = working.replace(/\n/g, "<br />");

  tokens.forEach((tokenHtml, index) => {
    working = working.replace(`__MD_LINK_${index}__`, tokenHtml);
  });

  return working;
}

function renderMarkdown(source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  const paragraph = [];
  let listType = "";
  let listItems = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }
    output.push(`<p>${renderInlineMarkdown(paragraph.join("\n"))}</p>`);
    paragraph.length = 0;
  }

  function flushList() {
    if (!listItems.length || !listType) {
      return;
    }
    output.push(
      `<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${listType}>`
    );
    listType = "";
    listItems = [];
  }

  function flushCodeBlock() {
    if (!inCodeBlock) {
      return;
    }
    output.push(
      `<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(
        codeLines.join("\n")
      )}</code></pre>`
    );
    inCodeBlock = false;
    codeLanguage = "";
    codeLines = [];
  }

  function splitMarkdownTableRow(line) {
    const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map((cell) => cell.trim());
  }

  function isMarkdownTableSeparator(line) {
    const cells = splitMarkdownTableRow(line);
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^```([\w-]*)\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
        codeLanguage = fenceMatch[1] || "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      output.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const nextLine = lines[index + 1] || "";
    if (line.includes("|") && isMarkdownTableSeparator(nextLine)) {
      flushParagraph();
      flushList();
      const headers = splitMarkdownTableRow(line);
      const aligns = splitMarkdownTableRow(nextLine).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        return "left";
      });
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        rows.push(splitMarkdownTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      output.push(
        `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headers
          .map(
            (cell, cellIndex) =>
              `<th style="text-align:${aligns[cellIndex] || "left"}">${renderInlineMarkdown(cell)}</th>`
          )
          .join("")}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${headers
                .map(
                  (_, cellIndex) =>
                    `<td style="text-align:${aligns[cellIndex] || "left"}">${renderInlineMarkdown(
                      row[cellIndex] || ""
                    )}</td>`
                )
                .join("")}</tr>`
          )
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      output.push("<hr />");
      continue;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      flushList();
      output.push(`<blockquote><p>${renderInlineMarkdown(blockquoteMatch[1])}</p></blockquote>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listItems.push(orderedMatch[1]);
      continue;
    }

    if (listType) {
      flushList();
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  if (inCodeBlock) {
    flushCodeBlock();
  }

  return output.join("");
}

function MarkdownContent({ text, className = "bubble-text markdown-body" }) {
  return html`<div className=${className} dangerouslySetInnerHTML=${{ __html: renderMarkdown(text) }}></div>`;
}

function createUniverseBranch(id) {
  return {
    id,
    status: "pending",
    text: "",
    result: null,
    wordCount: 0,
    error: "",
  };
}

function createUniverseBranches(count) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const id = String(index + 1).padStart(3, "0");
      return [id, createUniverseBranch(id)];
    })
  );
}

function universePhaseLabel(language, status) {
  const labels = {
    zh: {
      created: "未启动",
      sampling: "采样中",
      aggregating: "聚合中",
      complete: "已完成",
      error: "错误",
      idle: "未启动",
      stopped: "已停止",
    },
    en: {
      created: "Idle",
      sampling: "Sampling",
      aggregating: "Aggregating",
      complete: "Complete",
      error: "Error",
      idle: "Idle",
      stopped: "Stopped",
    },
  };
  return labels[language]?.[status] || labels.zh[status] || status;
}

function universeStatusLabel(language, status) {
  const labels = {
    zh: { pending: "等待中", running: "生成中", complete: "完成", stopped: "已停止", error: "错误" },
    en: { pending: "Pending", running: "Running", complete: "Complete", stopped: "Stopped", error: "Error" },
  };
  return labels[language]?.[status] || labels.zh[status] || status;
}

function UserTextContent({ text }) {
  return html`<span className="bubble-user-text">${String(text || "")}</span>`;
}

function HistorySessionCard({ item, preview, onOpen, onDelete, isOpen, setOpenId, deleteLabel, typeLabel }) {
  const touchStartXRef = useRef(0);
  const touchDeltaXRef = useRef(0);

  function handleTouchStart(event) {
    touchStartXRef.current = event.touches[0]?.clientX || 0;
    touchDeltaXRef.current = 0;
  }

  function handleTouchMove(event) {
    const currentX = event.touches[0]?.clientX || 0;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  }

  function handleTouchEnd() {
    if (touchDeltaXRef.current <= -36) {
      setOpenId(item.id);
    } else if (touchDeltaXRef.current >= 24) {
      setOpenId("");
    }
    touchStartXRef.current = 0;
    touchDeltaXRef.current = 0;
  }

  function handleCardClick() {
    if (isOpen) {
      setOpenId("");
      return;
    }
    onOpen();
  }

  return html`
    <article className=${`swipe-card ${isOpen ? "open" : ""}`}>
      <button className="swipe-delete-btn" onClick=${onDelete}>${deleteLabel}</button>
      <button
        className="session-card session-card-button"
        onClick=${handleCardClick}
        onTouchStart=${handleTouchStart}
        onTouchMove=${handleTouchMove}
        onTouchEnd=${handleTouchEnd}
      >
        <div className="history-card-head">
          <div>
            <div className="session-title">${item.title}</div>
            <div className="session-meta">${formatTimestamp(item.updatedAt)}</div>
          </div>
          ${typeLabel ? html`<span className="history-type-pill">${typeLabel}</span>` : null}
        </div>
        <${MarkdownContent} text=${preview} className="session-preview markdown-body session-preview-markdown" />
      </button>
    </article>
  `;
}

function HistoryUniverseCard({
  item,
  preview,
  onOpen,
  onDelete,
  isOpen,
  setOpenId,
  deleteLabel,
  t,
}) {
  const touchStartXRef = useRef(0);
  const touchDeltaXRef = useRef(0);
  function handleTouchStart(event) {
    touchStartXRef.current = event.touches[0]?.clientX || 0;
    touchDeltaXRef.current = 0;
  }

  function handleTouchMove(event) {
    const currentX = event.touches[0]?.clientX || 0;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  }

  function handleTouchEnd() {
    if (touchDeltaXRef.current <= -36) {
      setOpenId(item.id);
    } else if (touchDeltaXRef.current >= 24) {
      setOpenId("");
    }
    touchStartXRef.current = 0;
    touchDeltaXRef.current = 0;
  }

  function handleCardClick() {
    if (isOpen) {
      setOpenId("");
      return;
    }
    onOpen();
  }

  return html`
    <article className=${`swipe-card ${isOpen ? "open" : ""}`}>
      <button className="swipe-delete-btn" onClick=${onDelete}>${deleteLabel}</button>
      <button
        className="session-card history-universe-card"
        onClick=${handleCardClick}
        onTouchStart=${handleTouchStart}
        onTouchMove=${handleTouchMove}
        onTouchEnd=${handleTouchEnd}
      >
        <div className="history-universe-head">
          <div>
            <div className="session-title">${item.title}</div>
            <div className="session-meta">${formatTimestamp(item.updatedAt)}</div>
          </div>
          <span className="history-type-pill">${t("argumentUniverse")}</span>
        </div>
        <${MarkdownContent} text=${preview} className="session-preview markdown-body session-preview-markdown history-universe-summary" />
      </button>
    </article>
  `;
}

function lastAssistantMessageId(session) {
  for (let index = session.messages.length - 1; index >= 0; index -= 1) {
    if (session.messages[index].role === "assistant") {
      return session.messages[index].id;
    }
  }
  return "";
}

function shouldShowSkip(content) {
  const normalized = content.replace(/\s+/g, "").toLowerCase();
  return (
    (normalized.includes("你们这次比赛的赛制是什么") &&
      normalized.includes("几个环节") &&
      normalized.includes("先跳过")) ||
    (normalized.includes("whatistheformatofyourcompetition") &&
      normalized.includes("howmanysegments") &&
      normalized.includes("skipfornow"))
  );
}

function makeFilename(title, ext) {
  const safeTitle = (title || "session").replace(/[\\/:*?"<>|,\s]+/g, "-");
  const stamp = new Date().toISOString().slice(0, 16).replace("T", ".").replace(":", "");
  return `debate-coach-session-${safeTitle}-${stamp}.${ext}`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function wrapForCanvas(text, maxChars) {
  const rows = [];
  let current = "";
  for (const char of text) {
    current += char;
    if (current.length >= maxChars) {
      rows.push(current);
      current = "";
    }
  }
  if (current) {
    rows.push(current);
  }
  return rows;
}

function wrapCanvasTextByWidth(context, text, maxWidth) {
  const rows = [];
  const paragraphs = String(text || "").replace(/\r\n?/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      rows.push("");
      continue;
    }

    let current = "";
    for (const char of paragraph) {
      const next = current + char;
      if (context.measureText(next).width <= maxWidth || !current) {
        current = next;
      } else {
        rows.push(current);
        current = char;
      }
    }
    if (current) {
      rows.push(current);
    }
  }

  return rows.length ? rows : [""];
}

function buildExportMarkup(session, language) {
  const exportTime = new Date().toLocaleString();
  const body = session.messages
    .map((message) => {
      const isUser = message.role === "user";
      const content =
        message.role === "user"
          ? `<div class="export-user-text">${escapeHtml(message.content).replace(/\n/g, "<br />")}</div>`
          : renderMarkdown(message.content);
      return `
        <div class="export-row ${isUser ? "user" : "assistant"}">
          <div class="export-bubble ${isUser ? "user" : "assistant"}">
            <div class="export-bubble-body markdown-body">${content}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${language === "zh" ? "zh-CN" : "en"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(session.title)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
        background: linear-gradient(180deg, #eef0f2 0px, #f3f1ec 132px, #ece8e1 100%);
        color: #171717;
      }
      .export-page {
        width: 900px;
        padding: 40px 40px 44px;
      }
      .export-title {
        font-size: 40px;
        font-weight: 700;
        letter-spacing: -0.04em;
      }
      .export-time {
        margin-top: 8px;
        font-size: 16px;
        color: #7f7a72;
      }
      .export-thread {
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .export-row {
        display: flex;
      }
      .export-row.user {
        justify-content: flex-end;
      }
      .export-row.assistant {
        justify-content: flex-start;
      }
      .export-bubble {
        max-width: 620px;
        padding: 14px 18px;
        border-radius: 24px;
        box-shadow: 0 10px 26px rgba(23, 23, 23, 0.05);
        font-size: 22px;
        line-height: 1.5;
      }
      .export-bubble.user {
        background: linear-gradient(135deg, #e2eaff, #d4e0ff);
      }
      .export-bubble.assistant {
        background: #f8f5ef;
      }
      .export-bubble-body {
        white-space: normal;
      }
      .export-user-text {
        white-space: pre-wrap;
        word-break: normal;
      }
      .markdown-body > :first-child { margin-top: 0; }
      .markdown-body > :last-child { margin-bottom: 0; }
      .markdown-body p,
      .markdown-body ul,
      .markdown-body ol,
      .markdown-body pre,
      .markdown-body blockquote,
      .markdown-body hr,
      .markdown-body .md-table-wrap { margin: 0.24em 0; }
      .markdown-body h1,
      .markdown-body h2,
      .markdown-body h3,
      .markdown-body h4,
      .markdown-body h5,
      .markdown-body h6 {
        margin: 0.2em 0 0.3em;
        line-height: 1.28;
      }
      .markdown-body ul,
      .markdown-body ol { padding-left: 1.2em; }
      .markdown-body code {
        font-family: "SFMono-Regular", "SF Mono", "Menlo", monospace;
        font-size: 0.92em;
        background: rgba(23, 23, 23, 0.07);
        padding: 0.08em 0.32em;
        border-radius: 7px;
      }
      .markdown-body pre {
        overflow: hidden;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(23, 23, 23, 0.08);
        white-space: pre-wrap;
        word-break: break-word;
      }
      .markdown-body pre code {
        background: transparent;
        padding: 0;
      }
      .markdown-body blockquote {
        padding-left: 12px;
        border-left: 3px solid rgba(23, 23, 23, 0.18);
        color: #6e6a64;
      }
      .markdown-body a {
        color: #0f2f8a;
        text-decoration: none;
      }
      .markdown-body hr {
        border: 0;
        height: 1px;
        background: rgba(23, 23, 23, 0.1);
      }
      .md-table-wrap { overflow: hidden; }
      .md-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;
      }
      .md-table th,
      .md-table td {
        padding: 5px 8px;
        border: 1px solid rgba(23, 23, 23, 0.1);
        vertical-align: top;
      }
      .md-table th {
        background: rgba(23, 23, 23, 0.05);
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="export-page">
      <div class="export-title">${escapeHtml(session.title)}</div>
      <div class="export-time">${escapeHtml(exportTime)}</div>
      <section class="export-thread">${body}</section>
    </main>
  </body>
</html>`;
}

function extractCanvasBlocksFromMarkdown(markdownText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${renderMarkdown(markdownText)}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) {
    return [{ type: "text", text: String(markdownText || ""), variant: "body" }];
  }

  const blocks = [];

  Array.from(root.children).forEach((node) => {
    const tag = node.tagName;

    if (tag === "P") {
      blocks.push({ type: "text", text: node.textContent || "", variant: "body" });
      return;
    }

    if (/^H[1-6]$/.test(tag)) {
      blocks.push({ type: "text", text: node.textContent || "", variant: "heading" });
      return;
    }

    if (tag === "BLOCKQUOTE") {
      blocks.push({ type: "quote", text: node.textContent || "" });
      return;
    }

    if (tag === "PRE") {
      blocks.push({ type: "code", text: node.textContent || "" });
      return;
    }

    if (tag === "UL" || tag === "OL") {
      const items = Array.from(node.querySelectorAll("li")).map((item, index) =>
        `${tag === "OL" ? `${index + 1}.` : "•"} ${item.textContent || ""}`
      );
      blocks.push({ type: "list", items });
      return;
    }

    if (tag === "HR") {
      blocks.push({ type: "rule" });
      return;
    }

    if (tag === "DIV" && node.classList.contains("md-table-wrap")) {
      const rows = Array.from(node.querySelectorAll("tr")).map((row) =>
        Array.from(row.children).map((cell) => cell.textContent || "")
      );
      if (rows.length) {
        blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      }
      return;
    }

    const text = node.textContent || "";
    if (text.trim()) {
      blocks.push({ type: "text", text, variant: "body" });
    }
  });

  return blocks.length ? blocks : [{ type: "text", text: String(markdownText || ""), variant: "body" }];
}

function measureCanvasBlocks(context, blocks, maxWidth) {
  const measured = [];

  const wrapWithFont = (font, text, width) => {
    context.font = font;
    return wrapCanvasTextByWidth(context, text, width);
  };

  blocks.forEach((block) => {
    if (block.type === "text") {
      const font = block.variant === "heading" ? '700 24px "SF Pro Text", "PingFang SC", sans-serif' : '500 22px "SF Pro Text", "PingFang SC", sans-serif';
      const lineHeight = block.variant === "heading" ? 30 : 26;
      const lines = wrapWithFont(font, block.text, maxWidth);
      measured.push({ ...block, font, lineHeight, lines, height: lines.length * lineHeight });
      return;
    }

    if (block.type === "quote") {
      const font = '500 21px "SF Pro Text", "PingFang SC", sans-serif';
      const lineHeight = 26;
      const lines = wrapWithFont(font, block.text, maxWidth - 20);
      measured.push({ ...block, font, lineHeight, lines, height: lines.length * lineHeight + 4 });
      return;
    }

    if (block.type === "code") {
      const font = '500 19px "SF Mono", "Menlo", monospace';
      const lineHeight = 24;
      const lines = wrapWithFont(font, block.text, maxWidth - 24);
      measured.push({ ...block, font, lineHeight, lines, height: lines.length * lineHeight + 24 });
      return;
    }

    if (block.type === "list") {
      const font = '500 22px "SF Pro Text", "PingFang SC", sans-serif';
      const lineHeight = 26;
      const entries = block.items.map((item) => wrapWithFont(font, item, maxWidth));
      const height = entries.reduce((sum, lines) => sum + lines.length * lineHeight + 4, 0);
      measured.push({ ...block, font, lineHeight, entries, height });
      return;
    }

    if (block.type === "rule") {
      measured.push({ ...block, height: 12 });
      return;
    }

    if (block.type === "table") {
      const font = '500 18px "SF Pro Text", "PingFang SC", sans-serif';
      const headerFont = '700 18px "SF Pro Text", "PingFang SC", sans-serif';
      const colCount = Math.max(block.headers.length, ...block.rows.map((row) => row.length), 1);
      const colWidth = Math.floor(maxWidth / colCount);
      const headerLines = block.headers.map((cell) => wrapWithFont(headerFont, cell, colWidth - 16));
      const bodyLines = block.rows.map((row) => row.map((cell) => wrapWithFont(font, cell, colWidth - 16)));
      const rowHeights = [
        Math.max(...headerLines.map((lines) => Math.max(lines.length, 1))) * 22 + 14,
        ...bodyLines.map((row) => Math.max(...row.map((lines) => Math.max(lines.length, 1))) * 22 + 14),
      ];
      const height = rowHeights.reduce((sum, value) => sum + value, 0) + 1;
      measured.push({ ...block, font, headerFont, colCount, colWidth, headerLines, bodyLines, rowHeights, height });
    }
  });

  return measured;
}

function drawCanvasBlocks(context, blocks, x, startY, maxWidth) {
  let y = startY;

  blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0) {
      y += 8;
    }

    if (block.type === "text") {
      context.font = block.font;
      context.fillStyle = "#171717";
      block.lines.forEach((line) => {
        context.fillText(line, x, y + block.lineHeight - 6);
        y += block.lineHeight;
      });
      return;
    }

    if (block.type === "quote") {
      context.fillStyle = "rgba(23,23,23,0.18)";
      context.fillRect(x, y + 2, 4, block.height - 4);
      context.font = block.font;
      context.fillStyle = "#5f5b55";
      block.lines.forEach((line) => {
        context.fillText(line, x + 14, y + block.lineHeight - 6);
        y += block.lineHeight;
      });
      y += 4;
      return;
    }

    if (block.type === "code") {
      context.fillStyle = "rgba(23,23,23,0.08)";
      context.fillRect(x, y, maxWidth, block.height);
      context.font = block.font;
      context.fillStyle = "#171717";
      let lineY = y + 20;
      block.lines.forEach((line) => {
        context.fillText(line, x + 12, lineY);
        lineY += block.lineHeight;
      });
      y += block.height;
      return;
    }

    if (block.type === "list") {
      context.font = block.font;
      context.fillStyle = "#171717";
      block.entries.forEach((entryLines) => {
        entryLines.forEach((line) => {
          context.fillText(line, x, y + block.lineHeight - 6);
          y += block.lineHeight;
        });
        y += 4;
      });
      return;
    }

    if (block.type === "rule") {
      context.fillStyle = "rgba(23,23,23,0.1)";
      context.fillRect(x, y + 5, maxWidth, 1);
      y += block.height;
      return;
    }

    if (block.type === "table") {
      let rowY = y;
      const totalWidth = block.colCount * block.colWidth;
      const allRows = [block.headerLines, ...block.bodyLines];
      block.rowHeights.forEach((rowHeight, rowIndex) => {
        const isHeader = rowIndex === 0;
        let cellX = x;
        const row = allRows[rowIndex];
        for (let colIndex = 0; colIndex < block.colCount; colIndex += 1) {
          context.fillStyle = isHeader ? "rgba(23,23,23,0.05)" : "rgba(255,255,255,0.35)";
          context.fillRect(cellX, rowY, block.colWidth, rowHeight);
          context.strokeStyle = "rgba(23,23,23,0.1)";
          context.strokeRect(cellX, rowY, block.colWidth, rowHeight);
          context.font = isHeader ? block.headerFont : block.font;
          context.fillStyle = "#171717";
          const lines = row[colIndex] || [""];
          let textY = rowY + 20;
          lines.forEach((line) => {
            context.fillText(line, cellX + 8, textY);
            textY += 22;
          });
          cellX += block.colWidth;
        }
        rowY += rowHeight;
      });
      context.strokeStyle = "rgba(23,23,23,0.1)";
      context.strokeRect(x, y, totalWidth, block.height - 1);
      y += block.height;
    }
  });

  return y;
}

function extractApiMessage(status, body) {
  const text = String(body || "");
  try {
    const parsed = JSON.parse(text);
    const message = parsed?.error?.message || parsed?.message;
    if (message) {
      return message;
    }
  } catch (error) {
    //
  }
  if (status === 401) {
    return "Your API Key appears incorrect. Please check and try again.";
  }
  if (status === 402) {
    return "Your API balance is insufficient. Please top up and try again.";
  }
  if (status === 429) {
    return "Too many API requests. Please try again later.";
  }
  if (status === 500) {
    return "API server error. Please try again later.";
  }
  return text || `Request failed with status ${status}.`;
}

function hasEncryptedApiKey() {
  return Boolean(localStorage.getItem(ENCRYPTED_API_KEY_STORAGE_KEY));
}

function persistEncryptedApiKey(payload) {
  localStorage.setItem(ENCRYPTED_API_KEY_STORAGE_KEY, payload);
}

function readEncryptedApiKey() {
  return localStorage.getItem(ENCRYPTED_API_KEY_STORAGE_KEY) || "";
}

function clearEncryptedApiKey() {
  localStorage.removeItem(ENCRYPTED_API_KEY_STORAGE_KEY);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function derivePassphraseKey(passphrase, salt, usage) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("encryption_unavailable");
  }
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

async function encryptStoredSecret(secret, passphrase) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("encryption_unavailable");
  }
  const encoder = new TextEncoder();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePassphraseKey(passphrase, salt, ["encrypt"]);
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(secret));
  return JSON.stringify({
    v: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
  });
}

async function decryptStoredSecret(payload, passphrase) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("encryption_unavailable");
  }
  const parsed = JSON.parse(payload || "{}");
  const salt = base64ToBytes(parsed.salt || "");
  const iv = base64ToBytes(parsed.iv || "");
  const data = base64ToBytes(parsed.data || "");
  const key = await derivePassphraseKey(passphrase, salt, ["decrypt"]);
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plaintext);
}

function getPersistableState(state) {
  return {
    ...state,
    settings: {
      ...state.settings,
      apiKey: state.settings.keyStorageMode === "encrypted" ? "" : state.settings.apiKey,
    },
  };
}

function loadStoredState() {
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(legacyKey);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return ensureSessionIfNeeded(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw);
    const parsedSettings = { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) };
    return ensureSessionIfNeeded({
      ...DEFAULT_STATE,
      ...parsed,
      menuOpen: false,
      notice: "",
      modal: null,
      streamingText: "",
      sendingSessionId: "",
      settings: {
        ...parsedSettings,
        apiKey: parsedSettings.keyStorageMode === "encrypted" ? "" : parsedSettings.apiKey || "",
      },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      failedUserMessageIdBySession: parsed.failedUserMessageIdBySession || {},
    });
  } catch (error) {
    return ensureSessionIfNeeded(DEFAULT_STATE);
  }
}

async function streamChat({ baseURL, apiKey, model, prompt, conversation, onChunk, signal, maxTokens = 4096, temperature = 0.7 }) {
  const body = {
    model: model || "deepseek-v4-pro",
    messages: [{ role: "system", content: prompt }, ...conversation],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  const response = await fetch(baseURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(extractApiMessage(response.status, text));
  }

  if (!response.body) {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    if (content) {
      onChunk(content);
    }
    return content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        continue;
      }
      try {
        const parsed = JSON.parse(payload);
        const chunk =
          parsed?.choices?.[0]?.delta?.content ||
          parsed?.choices?.[0]?.message?.content ||
          "";
        if (chunk) {
          fullText += chunk;
          onChunk(chunk);
        }
      } catch (error) {
        continue;
      }
    }
  }

  return fullText;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => registration.update().catch(() => {}))
      .catch(() => {});
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem("debate-coach-pwa.sw-reloaded") === "1") {
      return;
    }
    sessionStorage.setItem("debate-coach-pwa.sw-reloaded", "1");
    window.location.reload();
  });
}

function TabIcon({ tab }) {
  if (tab === "chat") {
    return html`
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          d="M12 3.8c4.58 0 8.2 2.94 8.2 6.72 0 3.79-3.62 6.74-8.2 6.74-.76 0-1.49-.09-2.2-.24-.26-.06-.54.01-.74.18l-2.97 2.18c-.51.38-1.23-.01-1.19-.64l.16-2.53c.02-.28-.1-.54-.3-.72C3.58 14.23 2.8 12.44 2.8 10.52 2.8 6.74 6.42 3.8 12 3.8Z"
          fill="currentColor"
        />
      </svg>
    `;
  }

  if (tab === "history") {
    return html`
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          d="M12 7.25v4.9l3.1 2.1M20 12a8 8 0 1 1-2.62-5.88M20 4.75v4.5h-4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  if (tab === "extensions") {
    return html`
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          d="M7.2 3.8h3.2v3.4H7.2V3.8Zm6.4 0h3.2v3.4h-3.2V3.8ZM4.8 10.3h3.4v3.4H4.8v-3.4Zm5.9 0h2.6v3.4h-2.6v-3.4Zm5.1 0h3.4v3.4h-3.4v-3.4ZM7.2 16.8h3.2v3.4H7.2v-3.4Zm6.4 0h3.2v3.4h-3.2v-3.4Z"
          fill="currentColor"
        />
      </svg>
    `;
  }

  return html`
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M4 7.25h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        <path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        <path d="M4 16.75h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="15.75" cy="7.25" r="2.05" fill="#fff" stroke="currentColor" stroke-width="2.2" />
        <circle cx="9.25" cy="12" r="2.05" fill="#fff" stroke="currentColor" stroke-width="2.2" />
        <circle cx="14" cy="16.75" r="2.05" fill="#fff" stroke="currentColor" stroke-width="2.2" />
      </svg>
  `;
}

function ConsentItemIcon({ kind }) {
  if (kind === "alert") {
    return html`
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M12 3.7 21 19.3a1.4 1.4 0 0 1-1.22 2.1H4.22A1.4 1.4 0 0 1 3 19.3L12 3.7Z" fill="currentColor" />
        <path d="M12 8.5v5.4" stroke="#f7f3eb" stroke-width="2" stroke-linecap="round" />
        <circle cx="12" cy="16.9" r="1.1" fill="#f7f3eb" />
      </svg>
    `;
  }

  if (kind === "key") {
    return html`
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <circle cx="9" cy="9" r="4.1" fill="none" stroke="currentColor" stroke-width="2.2" />
        <path d="M12.3 11.9 20 19.6M17.2 16.8l1.7-1.7M15.2 14.8l1.7-1.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      </svg>
    `;
  }

  if (kind === "book") {
    return html`
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M4.7 6.4c0-1 .8-1.7 1.8-1.7h4.2c1 0 2 .33 2.8.94.8-.61 1.8-.94 2.8-.94h1.2c1 0 1.8.8 1.8 1.7v11.2c0 .7-.7 1.2-1.3.93a7.2 7.2 0 0 0-3-.61c-1.2 0-2.38.3-3.4.88a.9.9 0 0 1-.9 0 6.85 6.85 0 0 0-3.4-.88c-1.04 0-2.05.21-3 .61-.66.28-1.3-.22-1.3-.93V6.4Z" fill="currentColor" />
      </svg>
    `;
  }

  return html`
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="6.2" y="10.2" width="11.6" height="9.3" rx="2.2" fill="currentColor" />
      <path d="M8.8 10.2V8.3A3.2 3.2 0 0 1 12 5.1a3.2 3.2 0 0 1 3.2 3.2v1.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    </svg>
  `;
}

function NewSessionIcon() {
  return html`
    <svg className="new-session-icon" viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
      <path
        d="M12 6.2v11.6"
        fill="none"
        stroke="currentColor"
        stroke-width="2.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M6.2 12h11.6"
        fill="none"
        stroke="currentColor"
        stroke-width="2.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

function IosShareIcon() {
  return html`
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 14.8V4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      <path d="M8.3 8.4 12 4.7l3.7 3.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6.4 10.4v7.1c0 .94.76 1.7 1.7 1.7h7.8c.94 0 1.7-.76 1.7-1.7v-7.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean(window.navigator.standalone);
}

function isIPhoneSafari() {
  const ua = window.navigator.userAgent || "";
  const isIPhone = /iPhone/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  return isIPhone && isSafari;
}

function shouldShowIosInstallHint() {
  return isIPhoneSafari() && !isStandaloneDisplay() && localStorage.getItem(IOS_INSTALL_HINT_DISMISSED_KEY) !== "1";
}

function usePersistentState() {
  const [state, setState] = useState(() => loadStoredState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState(state)));
  }, [state]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return [state, setState];
}

function App() {
  const [state, setState] = usePersistentState();
  const [openHistorySwipeId, setOpenHistorySwipeId] = useState("");
  const [isClosingRecycleBin, setIsClosingRecycleBin] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const [historyUniverseOpenBySession, setHistoryUniverseOpenBySession] = useState({});
  const [activeHistoryUniverseId, setActiveHistoryUniverseId] = useState("");
  const [historyUniverseDetail, setHistoryUniverseDetail] = useState({ sessionId: "", branchId: "", tab: "formatted" });
  const [universe, setUniverse] = useState({
    motion: "",
    stance: "正方",
    format: "标准传辩",
    nBranches: 10,
    parallel: 5,
    jobId: "",
    status: "idle",
    branches: {},
    monitorOpen: false,
    resultOpen: false,
    aggLog: "",
    compileBuffer: "",
    resultMarkdown: "",
    error: "",
  });
  const [universeDetail, setUniverseDetail] = useState({ branchId: "", tab: "formatted" });
  const stateRef = useRef(state);
  const universeRef = useRef(universe);
  const promptCacheRef = useRef("");
  const caseWriterPromptCacheRef = useRef("");
  const privacyCacheRef = useRef("");
  const bannerTimerRef = useRef(0);
  const modalCloseTimerRef = useRef(0);
  const abortControllerRef = useRef(null);
  const universeAbortControllerRef = useRef(null);
  const composerRef = useRef(null);
  const importInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastTabPressRef = useRef({ tab: "", at: 0 });
  const riskAcceptingRef = useRef(false);
  const scrollPositionsRef = useRef({ chat: {}, history: 0, settings: 0 });

  stateRef.current = state;
  universeRef.current = universe;

  const t = (key) => tFor(state.settings.language, key);
  const session = currentSession(state);
  const isSending = Boolean(session && state.sendingSessionId === session.id);

  useEffect(() => {
    if (!state.notice) {
      return undefined;
    }

    window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, notice: "" }));
    }, 1200);

    return () => window.clearTimeout(bannerTimerRef.current);
  }, [state.notice, setState]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 124)}px`;
  }, [state.draft]);

  useEffect(() => {
    if (!state.settings.riskAccepted) {
      setShowIosInstallHint(false);
      return;
    }
    setShowIosInstallHint(shouldShowIosInstallHint());
  }, [state.settings.riskAccepted]);

  function saveViewScroll(tab, sessionId) {
    const y = window.scrollY || window.pageYOffset || 0;

    if (tab === "chat" && sessionId) {
      scrollPositionsRef.current.chat[sessionId] = y;
      return;
    }

    scrollPositionsRef.current[tab] = y;
  }

  function saveCurrentViewScroll() {
    const current = stateRef.current;
    saveViewScroll(current.tab, currentSession(current)?.id || "");
  }

  function switchTab(nextTab) {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    saveCurrentViewScroll();
    setState((prev) => ({ ...prev, tab: nextTab, menuOpen: false }));
  }

  function switchTabImmediately(nextTab) {
    lastTabPressRef.current = { tab: nextTab, at: Date.now() };
    switchTab(nextTab);
  }

  function handleTabPointerDown(nextTab, event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    switchTabImmediately(nextTab);
  }

  function handleTabTouchStart(nextTab, event) {
    if ("PointerEvent" in window) {
      return;
    }

    event.preventDefault();
    switchTabImmediately(nextTab);
  }

  function handleTabClick(nextTab, event) {
    const lastPress = lastTabPressRef.current;
    if (lastPress.tab === nextTab && Date.now() - lastPress.at < 700) {
      event.preventDefault();
      return;
    }

    switchTab(nextTab);
  }

  function acceptRiskAndEnterApp(event) {
    event?.preventDefault();
    if (riskAcceptingRef.current) {
      return;
    }
    riskAcceptingRef.current = true;

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    const nextState = ensureSessionIfNeeded({
      ...stateRef.current,
      tab: "chat",
      menuOpen: false,
      settings: { ...stateRef.current.settings, riskAccepted: true },
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState(nextState)));
    } catch (error) {
      setState(nextState);
      riskAcceptingRef.current = false;
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      window.requestAnimationFrame(() => {
        window.location.reload();
      });
    });
  }

  function openSessionInChat(sessionId) {
    saveCurrentViewScroll();
    setOpenHistorySwipeId("");
    setState((prev) => ({
      ...prev,
      tab: "chat",
      settings: { ...prev.settings, currentSessionId: sessionId },
    }));
  }

  useEffect(() => {
    const activeTab = state.tab;
    const activeSessionId = session?.id || "";

    function rememberScroll() {
      saveViewScroll(activeTab, activeSessionId);
    }

    window.addEventListener("scroll", rememberScroll, { passive: true });
    return () => {
      saveViewScroll(activeTab, activeSessionId);
      window.removeEventListener("scroll", rememberScroll);
    };
  }, [state.tab, session?.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const innerFrame = window.requestAnimationFrame(() => {
        if (state.tab === "chat" && session?.id) {
          messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
        } else {
          const savedY = scrollPositionsRef.current[state.tab] || 0;
          window.scrollTo({ top: savedY, behavior: "auto" });
        }
      });

      return () => window.cancelAnimationFrame(innerFrame);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.tab, session?.id]);

  useEffect(() => {
    if (state.tab !== "chat" || !isSending) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.tab, isSending, session?.messages.length, state.streamingText]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      universeAbortControllerRef.current?.abort();
      window.clearTimeout(bannerTimerRef.current);
      window.clearTimeout(modalCloseTimerRef.current);
    };
  }, []);

  function updateUniverseBranch(branchId, updater) {
    setUniverse((prev) => {
      const branch = prev.branches[branchId] || createUniverseBranch(branchId);
      return {
        ...prev,
        branches: {
          ...prev.branches,
          [branchId]: updater(branch),
        },
      };
    });
  }

  function stopUniverseJob() {
    const stoppedLabel = tFor(stateRef.current.settings.language, "stopped");
    universeAbortControllerRef.current?.abort();
    universeAbortControllerRef.current = null;
    setUniverse((prev) => ({
      ...prev,
      status: "stopped",
      branches: Object.fromEntries(
        Object.entries(prev.branches).map(([branchId, branch]) => [
          branchId,
          branch.status === "complete"
            ? branch
            : {
                ...branch,
                status: "stopped",
                error: branch.text ? "" : stoppedLabel,
              },
        ])
      ),
    }));
    showBanner(tFor(stateRef.current.settings.language, "universeStopped"));
  }

  function buildUniverseHistoryMarkdown(snapshot) {
    const branches = Object.values(snapshot.branches || {});
    const statusLabel = universePhaseLabel(stateRef.current.settings.language, snapshot.status);
    const branchLines = branches
      .map((branch) => {
        const label = universeStatusLabel(stateRef.current.settings.language, branch.status);
        const content = branch.text || branch.error || "（暂无内容）";
        return `### 分支 #${branch.id} · ${label}${branch.wordCount ? ` · ${branch.wordCount} 字` : ""}\n\n${content}`;
      })
      .join("\n\n---\n\n");

    return `# ${tFor(stateRef.current.settings.language, "argumentUniverse")} · ${snapshot.motion || "Untitled"}

- 持方：${snapshot.stance}
- 赛制：${snapshot.format}
- 状态：${statusLabel}
- 分支数量：${branches.length || snapshot.nBranches}
- 并发数：${snapshot.parallel}
- 生成时间：${new Date().toLocaleString()}

## 模型实施进程

${branchLines || "（暂无分支记录）"}

## 聚合辩案

${snapshot.resultMarkdown || snapshot.compileBuffer || "（暂无聚合辩案）"}`;
  }

  function saveUniverseToHistory() {
    const snapshot = universeRef.current;
    const content = buildUniverseHistoryMarkdown(snapshot);
    const titleBase = snapshot.motion?.trim() || tFor(stateRef.current.settings.language, "argumentUniverse");
    const savedSession = createSessionObject(`${tFor(stateRef.current.settings.language, "argumentUniverse")} · ${suggestedTitle(stateRef.current.settings.language, titleBase)}`);
    savedSession.kind = "argument-universe";
    savedSession.universeSnapshot = {
      ...snapshot,
      branches: Object.fromEntries(
        Object.entries(snapshot.branches || {}).map(([branchId, branch]) => [
          branchId,
          { ...branch },
        ])
      ),
      savedAt: new Date().toISOString(),
    };
    savedSession.messages = [
      {
        id: generateId(),
        role: "user",
        content: `论点宇宙采样：${titleBase}\n持方：${snapshot.stance}\n赛制：${snapshot.format}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        role: "assistant",
        content,
        createdAt: new Date(Date.now() + 1).toISOString(),
      },
    ];
    savedSession.updatedAt = new Date().toISOString();

    setState((prev) => ({
      ...prev,
      tab: "history",
      extensionView: "list",
      sessions: [savedSession, ...prev.sessions],
    }));
    setHistoryUniverseOpenBySession((prev) => ({
      ...prev,
      [savedSession.id]: { monitorOpen: false, resultOpen: false },
    }));
    setActiveHistoryUniverseId(savedSession.id);
    showBanner(tFor(stateRef.current.settings.language, "universeSavedToHistory"));
  }

  async function startUniverseJob() {
    const current = stateRef.current;
    const motion = universeRef.current.motion.trim();
    if (!motion) {
      openModal({ type: "content", title: tFor(current.settings.language, "notice"), content: tFor(current.settings.language, "placeholder") });
      return;
    }
    if (!current.settings.apiKey.trim()) {
      openModal({ type: "content", title: tFor(current.settings.language, "notice"), content: tFor(current.settings.language, "missingKey") });
      return;
    }

    const branchCount = Math.max(1, Math.min(50, Number(universeRef.current.nBranches) || 10));
    const parallel = Math.max(1, Math.min(10, Number(universeRef.current.parallel) || 5));
    const controller = new AbortController();
    universeAbortControllerRef.current?.abort();
    universeAbortControllerRef.current = controller;
    const jobId = generateId().slice(0, 8);
    setUniverse((prev) => ({
      ...prev,
      nBranches: branchCount,
      parallel,
      jobId,
      status: "sampling",
      branches: createUniverseBranches(branchCount),
      monitorOpen: false,
      resultOpen: false,
      aggLog: "",
      compileBuffer: "",
      resultMarkdown: "",
      error: "",
    }));

    try {
      const systemBase = [await loadPrompt(), await loadCaseWriterPrompt(), UNIVERSE_CASE_SCHEMA_PROMPT]
        .filter(Boolean)
        .join("\n\n---\n\n");
      const ids = Array.from({ length: branchCount }, (_, index) => String(index + 1).padStart(3, "0"));
      const completedBranches = [];
      let cursor = 0;

      async function runOne(branchId) {
        updateUniverseBranch(branchId, (branch) => ({ ...branch, status: "running", text: "", error: "" }));
        const prompt = `辩题：${motion}
持方：${universeRef.current.stance}
赛制：${universeRef.current.format}
采样分支：${branchId}/${String(branchCount).padStart(3, "0")}

请生成一份完整标准化辩案。这个分支要独立思考，允许选择与其他分支不同的定义、B0、分论点和攻防路径；但必须严格保留 ## E1、## E3、## E4、## E5、## E6、## E7 六个章节。直接输出 Markdown。`;
        const text = await streamChat({
          baseURL: current.settings.baseURL.trim(),
          apiKey: current.settings.apiKey.trim(),
          model: current.settings.model.trim(),
          prompt: systemBase,
          conversation: [{ role: "user", content: prompt }],
          signal: controller.signal,
          maxTokens: 8192,
          temperature: 0.85,
          onChunk(chunk) {
            updateUniverseBranch(branchId, (branch) => ({ ...branch, text: `${branch.text}${chunk}` }));
          },
        });
        updateUniverseBranch(branchId, (branch) => ({
          ...branch,
          status: "complete",
          text,
          wordCount: text.length,
        }));
        completedBranches.push({ id: branchId, text });
      }

      async function worker() {
        while (cursor < ids.length) {
          const branchId = ids[cursor];
          cursor += 1;
          try {
            await runOne(branchId);
          } catch (error) {
            if (error?.name === "AbortError") {
              throw error;
            }
            updateUniverseBranch(branchId, (branch) => ({
              ...branch,
              status: "error",
              error: String(error.message || error),
            }));
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(parallel, branchCount) }, () => worker()));
      if (controller.signal.aborted) {
        const abortError = new Error("Stopped");
        abortError.name = "AbortError";
        throw abortError;
      }
      if (!completedBranches.length) {
        throw new Error("所有分支都生成失败，请检查模型配置。");
      }
      await aggregateUniverseBranches({ motion, branches: completedBranches, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        setUniverse((prev) => ({
          ...prev,
          status: "stopped",
          branches: Object.fromEntries(
            Object.entries(prev.branches).map(([branchId, branch]) => [
              branchId,
              branch.status === "complete" ? branch : { ...branch, status: "stopped" },
            ])
          ),
        }));
      } else {
        setUniverse((prev) => ({ ...prev, status: "error", error: String(error.message || error) }));
        openModal({ type: "content", title: tFor(current.settings.language, "notice"), content: String(error.message || error) });
      }
    } finally {
      if (universeAbortControllerRef.current === controller) {
        universeAbortControllerRef.current = null;
      }
    }
  }

  async function aggregateUniverseBranches({ motion, branches, signal }) {
    const current = stateRef.current;
    setUniverse((prev) => ({
      ...prev,
      status: "aggregating",
      aggLog: `采样完成：${branches.length}/${prev.nBranches}\n正在合并共识辩案...\n\n`,
      compileBuffer: "",
      resultMarkdown: "",
    }));

    const branchPayload = branches
      .map((branch) => {
        const clipped = branch.text.length > 7000 ? `${branch.text.slice(0, 7000)}\n\n[分支内容过长，已截断]` : branch.text;
        return `### Branch ${branch.id}\n\n${clipped}`;
      })
      .join("\n\n---\n\n");

    const userPrompt = `辩题：${motion}
持方：${universeRef.current.stance}
赛制：${universeRef.current.format}
总分支数：${universeRef.current.nBranches}
有效分支数：${branches.length}

以下是各分支独立生成的辩案：

${branchPayload}

请按系统要求合并为一份完整辩案。`;

    const result = await streamChat({
      baseURL: current.settings.baseURL.trim(),
      apiKey: current.settings.apiKey.trim(),
      model: current.settings.model.trim(),
      prompt: UNIVERSE_AGGREGATION_PROMPT,
      conversation: [{ role: "user", content: userPrompt }],
      signal,
      maxTokens: 8192,
      temperature: 0.35,
      onChunk(chunk) {
        setUniverse((prev) => ({
          ...prev,
          compileBuffer: `${prev.compileBuffer}${chunk}`,
          aggLog: `${prev.aggLog}${chunk}`,
        }));
      },
    });

    setUniverse((prev) => ({
      ...prev,
      status: "complete",
      resultMarkdown: result,
      compileBuffer: result,
      resultOpen: true,
    }));
    showBanner(tFor(stateRef.current.settings.language, "universeComplete"));
  }

  async function loadPrompt() {
    if (promptCacheRef.current) {
      return promptCacheRef.current;
    }
    try {
      const response = await fetch(PROMPT_URL);
      promptCacheRef.current = await response.text();
    } catch (error) {
      promptCacheRef.current = "";
    }
    return promptCacheRef.current;
  }

  async function loadPrivacy() {
    if (privacyCacheRef.current) {
      return privacyCacheRef.current;
    }
    try {
      const response = await fetch(PRIVACY_URL);
      privacyCacheRef.current = await response.text();
    } catch (error) {
      privacyCacheRef.current = "Privacy policy is unavailable in this build.";
    }
    return privacyCacheRef.current;
  }

  async function loadCaseWriterPrompt() {
    if (caseWriterPromptCacheRef.current) {
      return caseWriterPromptCacheRef.current;
    }
    try {
      const response = await fetch(CASE_WRITER_PROMPT_URL);
      caseWriterPromptCacheRef.current = await response.text();
    } catch (error) {
      caseWriterPromptCacheRef.current = "";
    }
    return caseWriterPromptCacheRef.current;
  }

  function openModal(modal) {
    setIsClosingRecycleBin(false);
    setState((prev) => ({ ...prev, modal }));
  }

  function closeModal() {
    const currentModal = stateRef.current.modal;
    if (currentModal?.type === "recycle-bin") {
      setIsClosingRecycleBin(true);
      window.clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = window.setTimeout(() => {
        setState((prev) => ({ ...prev, modal: null }));
        setIsClosingRecycleBin(false);
      }, 160);
      return;
    }

    setState((prev) => ({ ...prev, modal: null }));
  }

  function showBanner(message) {
    setState((prev) => ({ ...prev, notice: message }));
  }

  function dismissIosInstallHint() {
    localStorage.setItem(IOS_INSTALL_HINT_DISMISSED_KEY, "1");
    setShowIosInstallHint(false);
  }

  async function saveProviderSettings() {
    const current = stateRef.current;
    const normalizedBaseURL = current.settings.baseURL.trim();
    const normalizedModel = current.settings.model.trim();

    clearEncryptedApiKey();
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        baseURL: normalizedBaseURL,
        model: normalizedModel,
        keyStorageMode: "plain",
      },
    }));
    showBanner(t("saved"));
  }

  function clearStoredApiKey() {
    clearEncryptedApiKey();
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        apiKey: "",
        keyStorageMode: "plain",
      },
    }));
  }

  function exportSession(kind) {
    const activeSession = currentSession(stateRef.current);
    if (!activeSession) {
      return;
    }
    const exportMarkup = buildExportMarkup(activeSession, stateRef.current.settings.language);

    if (kind === "json") {
      const payload = {
        exportedAt: new Date().toISOString(),
        messageCount: activeSession.messages.length,
        messages: activeSession.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };
      downloadFile(makeFilename(activeSession.title, "json"), JSON.stringify(payload, null, 2), "application/json");
    }

    if (kind === "md") {
      let markdown = "# debate-coach Session Record\n\n";
      markdown += `Export time: ${new Date().toLocaleString()}\n\n---\n\n`;
      activeSession.messages.forEach((message) => {
        const heading =
          message.role === "user" ? "## You" : message.role === "assistant" ? "## Debate Coach" : "### System";
        markdown += `${heading}\n\n${message.content}\n\n---\n\n`;
      });
      downloadFile(makeFilename(activeSession.title, "md"), markdown, "text/markdown");
    }

    if (kind === "html") {
      downloadFile(makeFilename(activeSession.title, "html"), exportMarkup, "text/html;charset=utf-8");
    }

    if (kind === "jpg") {
      showBanner("Exporting JPG...");
      const canvas = document.createElement("canvas");
      const scale = 2;
      const width = 900;
      const padding = 40;
      const bubblePadX = 18;
      const bubblePadY = 16;
      const maxBubbleWidth = 620;
      const contentWidth = width - padding * 2;
      const context = canvas.getContext("2d");
      if (!context) {
        openModal({ type: "content", title: t("notice"), content: "JPG export failed in this browser." });
        return;
      }

      const messageLayouts = activeSession.messages.map((message) => {
        const blocks =
          message.role === "user"
            ? measureCanvasBlocks(context, [{ type: "text", text: message.content, variant: "body" }], Math.min(maxBubbleWidth, contentWidth) - bubblePadX * 2)
            : measureCanvasBlocks(context, extractCanvasBlocksFromMarkdown(message.content), Math.min(maxBubbleWidth, contentWidth) - bubblePadX * 2);
        const contentHeight = blocks.reduce((sum, block, index) => sum + block.height + (index > 0 ? 8 : 0), 0);
        return {
          ...message,
          blocks,
          bubbleWidth: Math.min(maxBubbleWidth, contentWidth),
          bubbleHeight: contentHeight + bubblePadY * 2,
        };
      });

      const totalHeight =
        128 +
        messageLayouts.reduce((sum, item) => sum + item.bubbleHeight, 0) +
        Math.max(messageLayouts.length - 1, 0) * 18 +
        56;

      canvas.width = width * scale;
      canvas.height = Math.max(760, totalHeight) * scale;
      context.scale(scale, scale);
      context.fillStyle = "#f3f1ec";
      context.fillRect(0, 0, width, Math.max(760, totalHeight));

      context.fillStyle = "#171717";
      context.font = '700 40px "SF Pro Display", "PingFang SC", sans-serif';
      context.fillText(activeSession.title, padding, 62);
      context.font = '500 16px "SF Pro Text", "PingFang SC", sans-serif';
      context.fillStyle = "#7f7a72";
      context.fillText(new Date().toLocaleString(), padding, 92);

      let y = 126;
      messageLayouts.forEach((item) => {
        const isUser = item.role === "user";
        const x = isUser ? width - padding - item.bubbleWidth : padding;

        context.fillStyle = isUser ? "#d8e4ff" : "#f8f5ef";
        const radius = 24;
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + item.bubbleWidth, y, x + item.bubbleWidth, y + item.bubbleHeight, radius);
        context.arcTo(x + item.bubbleWidth, y + item.bubbleHeight, x, y + item.bubbleHeight, radius);
        context.arcTo(x, y + item.bubbleHeight, x, y, radius);
        context.arcTo(x, y, x + item.bubbleWidth, y, radius);
        context.closePath();
        context.fill();

        drawCanvasBlocks(context, item.blocks, x + bubblePadX, y + bubblePadY, item.bubbleWidth - bubblePadX * 2);
        y += item.bubbleHeight + 18;
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          openModal({ type: "content", title: t("notice"), content: "JPG export failed in this browser." });
          return;
        }
        downloadFile(makeFilename(activeSession.title, "jpg"), blob, "image/jpeg");
        showBanner("JPG exported");
      }, "image/jpeg", 0.96);
    }

    setState((prev) => ({ ...prev, menuOpen: false }));
  }

  async function send(explicitText) {
    const current = stateRef.current;
    const activeSession = currentSession(current);
    if (!activeSession || current.sendingSessionId === activeSession.id) {
      return;
    }

    const text = (explicitText ?? current.draft).trim();
    if (!text) {
      return;
    }
    if (!current.settings.apiKey.trim()) {
      openModal({ type: "content", title: tFor(current.settings.language, "notice"), content: tFor(current.settings.language, "missingKey") });
      return;
    }

    const userMessage = {
      id: generateId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const updatedSessions = current.sessions.map((item) => {
      if (item.id !== activeSession.id) {
        return item;
      }
      return {
        ...item,
        title:
          item.title === tFor(current.settings.language, "newConversation") ||
          item.title === tFor(current.settings.language, "importedSession")
            ? suggestedTitle(current.settings.language, text)
            : item.title,
        updatedAt: new Date().toISOString(),
        messages: [...item.messages, userMessage],
      };
    });

    setState((prev) => ({
      ...prev,
      sessions: updatedSessions,
      draft: "",
      streamingText: "",
      sendingSessionId: activeSession.id,
      failedUserMessageIdBySession: {
        ...prev.failedUserMessageIdBySession,
        [activeSession.id]: "",
      },
    }));

    const updatedState = {
      ...current,
      sessions: updatedSessions,
    };

    try {
      const prompt = await loadPrompt();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await streamChat({
        baseURL: updatedState.settings.baseURL,
        apiKey: updatedState.settings.apiKey,
        model: updatedState.settings.model,
        prompt,
        conversation:
          currentSession(updatedState)?.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })) || [],
        signal: controller.signal,
        onChunk(chunk) {
          setState((prev) => ({ ...prev, streamingText: prev.streamingText + chunk }));
        },
      });

      if (response.trim()) {
        setState((prev) => ({
          ...prev,
          sessions: prev.sessions.map((item) => {
            if (item.id !== activeSession.id) {
              return item;
            }
            return {
              ...item,
              updatedAt: new Date().toISOString(),
              messages: [
                ...item.messages,
                {
                  id: generateId(),
                  role: "assistant",
                  content: response,
                  createdAt: new Date().toISOString(),
                },
              ],
            };
          }),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          failedUserMessageIdBySession: {
            ...prev.failedUserMessageIdBySession,
            [activeSession.id]: userMessage.id,
          },
          modal: {
            type: "content",
            title: tFor(prev.settings.language, "notice"),
            content: tFor(prev.settings.language, "failedNoContent"),
          },
        }));
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setState((prev) => ({
          ...prev,
          failedUserMessageIdBySession: {
            ...prev.failedUserMessageIdBySession,
            [activeSession.id]: userMessage.id,
          },
          modal: {
            type: "content",
            title: tFor(prev.settings.language, "notice"),
            content: String(error.message || error),
          },
        }));
      }
    } finally {
      abortControllerRef.current = null;
      setState((prev) => ({
        ...prev,
        streamingText: "",
        sendingSessionId: "",
      }));
    }
  }

  async function regenerate() {
    const current = stateRef.current;
    const activeSession = currentSession(current);
    if (!activeSession) {
      return;
    }

    const messages = [...activeSession.messages];
    while (messages.length && messages[messages.length - 1].role === "assistant") {
      messages.pop();
    }

    const lastUser = messages[messages.length - 1];
    if (!lastUser || lastUser.role !== "user") {
      openModal({ type: "content", title: t("notice"), content: "There is no previous user message to regenerate." });
      return;
    }

    messages.pop();
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((item) =>
        item.id === activeSession.id
          ? {
              ...item,
              updatedAt: new Date().toISOString(),
              messages,
            }
          : item
      ),
    }));

    await send(lastUser.content);
  }

  function moveToRecycleBin(sessionId) {
    setState((prev) => {
      const sessions = prev.sessions.map((item) =>
        item.id === sessionId
          ? { ...item, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : item
      );
      const next = {
        ...prev,
        sessions,
        settings: {
          ...prev.settings,
          currentSessionId:
            prev.settings.currentSessionId === sessionId
              ? activeSessions({ ...prev, sessions }).find((item) => item.id !== sessionId)?.id || ""
              : prev.settings.currentSessionId,
        },
      };
      return ensureSessionIfNeeded(next);
    });
  }

  function restoreSession(sessionId) {
    saveCurrentViewScroll();
    setState((prev) => ({
      ...prev,
      tab: "chat",
      sessions: prev.sessions.map((item) =>
        item.id === sessionId ? { ...item, deletedAt: null, updatedAt: new Date().toISOString() } : item
      ),
      settings: { ...prev.settings, currentSessionId: sessionId },
      modal: null,
    }));
  }

  function permanentlyDeleteSession(sessionId) {
    setState((prev) => ensureSessionIfNeeded({ ...prev, sessions: prev.sessions.filter((item) => item.id !== sessionId) }));
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.messages) || !payload.messages.length) {
        throw new Error(t("invalidFile"));
      }
      const firstUser = payload.messages.find((item) => item.role === "user")?.content;
      const sessionTitle = suggestedTitle(stateRef.current.settings.language, firstUser);
      const importedSession = createSessionObject(sessionTitle);
      importedSession.messages = payload.messages.map((item, index) => ({
        id: generateId(),
        role: item.role,
        content: item.content,
        createdAt: new Date(Date.now() + index).toISOString(),
      }));
      importedSession.updatedAt = new Date().toISOString();

      setState((prev) => ({
        ...prev,
        tab: "chat",
        sessions: [importedSession, ...prev.sessions],
        settings: { ...prev.settings, currentSessionId: importedSession.id },
      }));
    } catch (error) {
      openModal({ type: "content", title: t("notice"), content: String(error.message || t("invalidFile")) });
    } finally {
      event.target.value = "";
    }
  }

  const language = state.settings.language;
  const historyItems = activeSessions(state).filter((item) => item.messages.length);
  const universeBranches = Object.values(universe.branches);
  const universeDone = universeBranches.filter((branch) => branch.status === "complete").length;
  const universeErrored = universeBranches.filter((branch) => branch.status === "error").length;
  const universeProgress = universeBranches.length ? Math.round((universeDone / universeBranches.length) * 100) : 0;
  const selectedUniverseBranch = universeDetail.branchId ? universe.branches[universeDetail.branchId] : null;
  const universeIsBusy = universe.status === "sampling" || universe.status === "aggregating";
  const universeHasRun = universe.status !== "idle" || Boolean(universe.jobId || universe.resultMarkdown || universe.compileBuffer);
  const activeHistoryUniverseSession = activeHistoryUniverseId
    ? state.sessions.find((item) => item.id === activeHistoryUniverseId && item.kind === "argument-universe" && item.universeSnapshot)
    : null;
  const activeHistoryUniverseSnapshot = activeHistoryUniverseSession?.universeSnapshot || null;
  const activeHistoryUniverseOpenState = activeHistoryUniverseId
    ? historyUniverseOpenBySession[activeHistoryUniverseId] || { monitorOpen: false, resultOpen: false }
    : { monitorOpen: false, resultOpen: false };
  const activeHistoryUniverseBranches = activeHistoryUniverseSnapshot ? Object.values(activeHistoryUniverseSnapshot.branches || {}) : [];
  const activeHistoryUniverseDone = activeHistoryUniverseBranches.filter((branch) => branch.status === "complete").length;
  const activeHistoryUniverseErrored = activeHistoryUniverseBranches.filter((branch) => branch.status === "error").length;
  const activeHistoryUniverseProgress = activeHistoryUniverseBranches.length ? Math.round((activeHistoryUniverseDone / activeHistoryUniverseBranches.length) * 100) : 0;
  const selectedHistoryUniverseSession = historyUniverseDetail.sessionId
    ? state.sessions.find((item) => item.id === historyUniverseDetail.sessionId)
    : null;
  const selectedHistoryUniverseBranch =
    selectedHistoryUniverseSession?.universeSnapshot?.branches?.[historyUniverseDetail.branchId] || null;
  const consentItems = t("consentItems");
  const consentIntro =
    language === "zh"
      ? html`我是基于 <span className="consent-linkish">griII-me</span> 审问模式、学习《辩论筑基》（Debate Universal Grammar，精靈 Moon 著）全套体系内容训练的辩论教练。`
      : t("consentIntro");

  return html`
    <div className="app-shell">
      <div className="phone-frame">
        ${state.notice ? html`<div className="banner">${state.notice}</div>` : null}
        ${showIosInstallHint
          ? html`
              <div className="install-hint-card">
                <div className="install-hint-title">${t("installHintTitle")}</div>
                <div className="install-hint-steps">
                  <div className="install-hint-step">
                    <div className="install-hint-badge">1</div>
                    <div className="install-hint-copy">
                      ${t("installHintStepShare")}
                      <span className="install-hint-share-icon"><${IosShareIcon} /></span>
                    </div>
                  </div>
                  <div className="install-hint-step">
                    <div className="install-hint-badge">2</div>
                    <div className="install-hint-copy">${t("installHintStepAdd")}</div>
                  </div>
                </div>
                <button className="install-hint-btn" onClick=${dismissIosInstallHint}>${t("installHintDismiss")}</button>
              </div>
            `
          : null}
        ${
          !state.settings.riskAccepted
            ? html`
                <div className="consent-screen consent-screen-page">
                  <div className="consent-page">
                    <section className="consent-copy-block">
                      <div className="consent-page-title">${t("consentTitle")}</div>
                      <div className="consent-page-intro">
                        ${consentIntro}
                      </div>
                      <div className="consent-list">
                        ${[
                          ["alert", consentItems[0]],
                          ["key", consentItems[1]],
                          ["book", consentItems[2]],
                          ["lock", consentItems[3]],
                        ].map(
                          ([kind, text]) => html`
                            <div className="consent-row">
                              <div className="consent-icon"><${ConsentItemIcon} kind=${kind} /></div>
                              <div className="consent-row-text">${text}</div>
                            </div>
                          `
                        )}
                      </div>
                    </section>
                    <div className="consent-footer">
                      <button
                        className="primary-btn consent-accept-btn"
                        type="button"
                        onPointerDown=${(event) => {
                          if (event.pointerType === "mouse" && event.button !== 0) {
                            return;
                          }
                          acceptRiskAndEnterApp(event);
                        }}
                        onTouchStart=${(event) => {
                          if ("PointerEvent" in window) {
                            return;
                          }
                          acceptRiskAndEnterApp(event);
                        }}
                        onClick=${acceptRiskAndEnterApp}
                      >
                        ${t("acceptRisk")}
                      </button>
                    </div>
                  </div>
                </div>
              `
            : html`
                <main className="screen">
	                  ${state.tab === "chat"
                    ? html`
                        <div className="nav-blur nav-blur-chat">
                          <div className="topbar topbar-chat">
                            <button
                              className="circle-btn"
                              aria-label="New session"
                              onClick=${() =>
                                setState((prev) => {
                                  const active = currentSession(prev);
                                  if (active && !active.messages.length) {
                                    return prev;
                                  }
                                  const nextSession = createSessionObject(tFor(prev.settings.language, "newConversation"));
                                  return {
                                    ...prev,
                                    tab: "chat",
                                    sessions: [nextSession, ...prev.sessions],
                                    settings: { ...prev.settings, currentSessionId: nextSession.id },
                                  };
                                })}
                            >
                              <${NewSessionIcon} />
                            </button>
                            <div className="topbar-title">${session ? session.title : t("appName")}</div>
                            <button className="menu-btn" aria-label="Menu" onClick=${() => setState((prev) => ({ ...prev, menuOpen: !prev.menuOpen }))}>
                              ⋯
                            </button>
                          </div>
                        </div>
	                        <div className="screen-pad">
	                          <div className="messages">
	                            ${session && !session.messages.length && !state.streamingText
	                              ? html`
	                                  <section className="welcome-state welcome-state-minimal">
	                                    <div className="welcome-title">${t("welcomeTitle")}</div>
                                    <div className="welcome-copy">${t("welcomeCopy")}</div>
                                  </section>
                                `
                              : null}
	                            ${session
	                              ? session.messages.map((message) => {
                                  const role = message.role;
                                  const showRegenerate =
                                    message.id === lastAssistantMessageId(session) ||
                                    state.failedUserMessageIdBySession[session.id] === message.id;
                                  const showSkip =
                                    role === "assistant" &&
                                    message.id === lastAssistantMessageId(session) &&
                                    shouldShowSkip(message.content);
                                  return html`
                                    <div key=${message.id} className=${`bubble-row ${role}`}>
                                      <div>
                                        <div className=${`bubble ${role}`}>
                                          ${role === "user"
                                            ? html`<${UserTextContent} text=${message.content} />`
                                            : html`<${MarkdownContent} text=${message.content} />`}
                                        </div>
                                        ${showRegenerate || showSkip
                                          ? html`
                                              <div className="bubble-actions">
                                                ${showRegenerate
                                                  ? html`<button className="mini-btn" onClick=${regenerate}>${t("regenerate")}</button>`
                                                  : null}
                                                ${showSkip
                                                  ? html`<button className="mini-btn" onClick=${() => send(t("skip"))}>${t("skip")}</button>`
                                                  : null}
                                              </div>
                                            `
                                          : null}
                                      </div>
                                    </div>
                                  `;
                                })
                              : null}
                            ${isSending
                              ? html`
                                  <div className="bubble-row assistant">
                                    <div className="bubble assistant">
                                      <div className="streaming-indicator">
                                        <${MarkdownContent} text=${state.streamingText} className="bubble-text markdown-body streaming-text" />
                                        <span className="dots"><span></span><span></span><span></span></span>
                                      </div>
                                    </div>
                                  </div>
                                `
                              : null}
                            <div ref=${messagesEndRef} className="footer-space"></div>
                          </div>
                        </div>
                      `
                    : null}
                  ${state.tab === "history"
                    ? html`
                        ${activeHistoryUniverseSession
                          ? html`
                              <div className="nav-blur">
                                <div className="topbar">
                                  <button
                                    className="circle-btn"
                                    aria-label="Back"
                                    onClick=${() => {
                                      setActiveHistoryUniverseId("");
                                      setHistoryUniverseDetail({ sessionId: "", branchId: "", tab: "formatted" });
                                    }}
                                  >
                                    <span className="universe-back-icon">‹</span>
                                  </button>
                                  <div className="topbar-title">${activeHistoryUniverseSession.title}</div>
                                  <div className="circle-btn ghost-spacer"></div>
                                </div>
                              </div>
                              <section className="stack history-universe-detail-page">
                                <article className="settings-card history-universe-overview">
                                  <div className="history-universe-head">
                                    <div>
                                      <div className="card-title">${t("argumentUniverse")}</div>
                                      <div className="universe-subtitle">${activeHistoryUniverseSnapshot.motion || t("argumentUniverseCopy")}</div>
                                    </div>
                                    <span className="history-type-pill">${t("argumentUniverse")}</span>
                                  </div>
                                  <div className="history-universe-meta">
                                    ${activeHistoryUniverseSnapshot.stance || ""}${activeHistoryUniverseSnapshot.format ? ` · ${activeHistoryUniverseSnapshot.format}` : ""}
                                  </div>
                                </article>
                                <article className="settings-card universe-monitor universe-collapsible">
                                  <button
                                    className="universe-collapse-head"
                                    onClick=${() =>
                                      setHistoryUniverseOpenBySession((prev) => ({
                                        ...prev,
                                        [activeHistoryUniverseId]: {
                                          ...activeHistoryUniverseOpenState,
                                          monitorOpen: !activeHistoryUniverseOpenState.monitorOpen,
                                        },
                                      }))}
                                  >
                                    <div>
                                      <div className="card-title">${t("universeMonitor")}</div>
                                      <div className="universe-subtitle">
                                        ${t("universeProgress")} ${activeHistoryUniverseDone}/${activeHistoryUniverseBranches.length}${activeHistoryUniverseErrored ? ` · ${activeHistoryUniverseErrored} ${t("error")}` : ""}
                                      </div>
                                    </div>
                                    <div className="universe-head-right">
                                      <div className="universe-percent">${activeHistoryUniverseProgress}%</div>
                                      <span className=${`universe-chevron ${activeHistoryUniverseOpenState.monitorOpen ? "open" : ""}`} aria-hidden="true"></span>
                                    </div>
                                  </button>
                                  <div className="universe-progress-track">
                                    <div className="universe-progress-fill" style=${{ width: `${activeHistoryUniverseProgress}%` }}></div>
                                  </div>
                                  ${activeHistoryUniverseOpenState.monitorOpen
                                    ? html`
                                        <div className="universe-branches">
                                          ${activeHistoryUniverseBranches.map((branch) => {
                                            const preview = branch.error || branch.text.split("\n").filter(Boolean).slice(-3).join("\n") || universeStatusLabel(language, branch.status);
                                            return html`
                                              <button
                                                key=${branch.id}
                                                className=${`universe-branch ${branch.status}`}
                                                onClick=${() => setHistoryUniverseDetail({ sessionId: activeHistoryUniverseId, branchId: branch.id, tab: "formatted" })}
                                              >
                                                <div className="universe-branch-top">
                                                  <span className="universe-branch-id">#${branch.id}</span>
                                                  <span className=${`universe-dot ${branch.status}`}></span>
                                                </div>
                                                <div className="universe-branch-preview">${preview}</div>
                                                <div className="universe-branch-foot">${universeStatusLabel(language, branch.status)}${branch.wordCount ? ` · ${branch.wordCount} 字` : ""}</div>
                                              </button>
                                            `;
                                          })}
                                        </div>
                                      `
                                    : null}
                                </article>
                                <article className="settings-card universe-result-card universe-collapsible">
                                  <button
                                    className="universe-collapse-head"
                                    onClick=${() =>
                                      setHistoryUniverseOpenBySession((prev) => ({
                                        ...prev,
                                        [activeHistoryUniverseId]: {
                                          ...activeHistoryUniverseOpenState,
                                          resultOpen: !activeHistoryUniverseOpenState.resultOpen,
                                        },
                                      }))}
                                  >
                                    <div>
                                      <div className="card-title">${t("universeResult")}</div>
                                      <div className="universe-subtitle">${universePhaseLabel(language, activeHistoryUniverseSnapshot.status)}</div>
                                    </div>
                                    <span className=${`universe-chevron ${activeHistoryUniverseOpenState.resultOpen ? "open" : ""}`} aria-hidden="true"></span>
                                  </button>
                                  ${activeHistoryUniverseOpenState.resultOpen
                                    ? html`
                                        <${MarkdownContent}
                                          text=${activeHistoryUniverseSnapshot.resultMarkdown || activeHistoryUniverseSnapshot.compileBuffer || t("universeNoResult")}
                                          className="markdown-body universe-markdown"
                                        />
                                      `
                                    : null}
                                </article>
                              </section>
                            `
                          : html`
                              <section className="section-head section-head-large">
                                <div className="section-title">${t("historyTitle")}</div>
                              </section>
                              <section className="stack">
                                ${historyItems.length
                                  ? historyItems.map(
                                      (item) =>
                                        item.kind === "argument-universe" && item.universeSnapshot
                                          ? html`
                                              <${HistoryUniverseCard}
                                                key=${item.id}
                                                item=${item}
                                                preview=${sessionPreview(language, item)}
                                                isOpen=${openHistorySwipeId === item.id}
                                                setOpenId=${setOpenHistorySwipeId}
                                                deleteLabel=${t("delete")}
                                                t=${t}
                                                onOpen=${() => {
                                                  setOpenHistorySwipeId("");
                                                  setActiveHistoryUniverseId(item.id);
                                                }}
                                                onDelete=${() => {
                                                  setOpenHistorySwipeId("");
                                                  if (activeHistoryUniverseId === item.id) {
                                                    setActiveHistoryUniverseId("");
                                                  }
                                                  moveToRecycleBin(item.id);
                                                }}
                                              />
                                            `
                                          : html`
                                              <${HistorySessionCard}
                                                key=${item.id}
                                                item=${item}
                                                preview=${sessionPreview(language, item)}
                                                isOpen=${openHistorySwipeId === item.id}
                                                setOpenId=${setOpenHistorySwipeId}
                                                deleteLabel=${t("delete")}
                                                typeLabel=${t("chat")}
                                                onOpen=${() => openSessionInChat(item.id)}
                                                onDelete=${() => {
                                                  setOpenHistorySwipeId("");
                                                  moveToRecycleBin(item.id);
                                                }}
                                              />
                                            `
                                    )
                                  : html`<div className="empty-note empty-note-centered">${t("noHistory")}</div>`}
                              </section>
                            `}
                      `
                    : null}
                  ${state.tab === "extensions"
                    ? html`
                        ${state.extensionView === "argument-universe"
                          ? html`
                              <div className="nav-blur">
                                <div className="topbar">
                                  <button
                                    className="circle-btn"
                                    aria-label="Back"
                                    onClick=${() => setState((prev) => ({ ...prev, extensionView: "list" }))}
                                  >
                                    <span className="universe-back-icon">‹</span>
                                  </button>
                                  <div className="topbar-title">${t("argumentUniverse")}</div>
                                  <div className="circle-btn ghost-spacer"></div>
                                </div>
                              </div>
                              <section className="stack extension-stack">
                                <article className="settings-card universe-config">
                                  <div className="universe-status-row">
                                    <div>
                                      <div className="card-title">${t("argumentUniverse")}</div>
                                      <div className="universe-subtitle">${t("argumentUniverseCopy")}</div>
                                    </div>
                                    <span className=${`universe-phase ${universe.status}`}>${universePhaseLabel(language, universe.status)}</span>
                                  </div>
                                  <div className="field">
                                    <label>${t("motion")}</label>
                                    <input
                                      value=${universe.motion}
                                      placeholder="例：人工智能的普及对人类创造力是促进大于阻碍"
                                      onInput=${(event) => setUniverse((prev) => ({ ...prev, motion: event.target.value }))}
                                    />
                                  </div>
                                  <div className="universe-form-grid">
                                    <div className="field">
                                      <label>${t("stance")}</label>
                                      <select
                                        value=${universe.stance}
                                        onInput=${(event) => setUniverse((prev) => ({ ...prev, stance: event.target.value }))}
                                      >
                                        <option value="正方">正方</option>
                                        <option value="反方">反方</option>
                                      </select>
                                    </div>
                                    <div className="field">
                                      <label>${t("format")}</label>
                                      <select
                                        value=${universe.format}
                                        onInput=${(event) => setUniverse((prev) => ({ ...prev, format: event.target.value }))}
                                      >
                                        <option value="标准传辩">标准传辩</option>
                                        <option value="BP英国议会制">BP英国议会制</option>
                                        <option value="奥瑞冈式政策辩">奥瑞冈式政策辩</option>
                                        <option value="自定义">自定义</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="universe-form-grid">
                                    <div className="field">
                                      <label>${t("branches")}</label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value=${universe.nBranches}
                                        onInput=${(event) => {
                                          const rawValue = event.target.value;
                                          const value = rawValue === "" ? "" : Math.max(1, Math.min(50, Number(rawValue) || 1));
                                          setUniverse((prev) => ({
                                            ...prev,
                                            nBranches: value,
                                            branches: universeHasRun && value !== "" ? createUniverseBranches(value) : prev.branches,
                                          }));
                                        }}
                                      />
                                    </div>
                                    <div className="field">
                                      <label>${t("parallel")}</label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value=${universe.parallel}
                                        onInput=${(event) => {
                                          const rawValue = event.target.value;
                                          setUniverse((prev) => ({
                                            ...prev,
                                            parallel: rawValue === "" ? "" : Math.max(1, Math.min(10, Number(rawValue) || 1)),
                                          }));
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="universe-actions">
                                    <button className="primary-btn universe-start-btn" disabled=${universeIsBusy} onClick=${startUniverseJob}>
                                      ${universeIsBusy ? t("universeRunning") : universe.resultMarkdown ? t("restartUniverse") : t("startUniverse")}
                                    </button>
                                    ${universeIsBusy
                                      ? html`<button className="danger-btn universe-stop-btn" onClick=${stopUniverseJob}>${t("stopUniverse")}</button>`
                                      : null}
	                                  </div>
	                                </article>

                                ${universeHasRun
                                  ? html`
                                      <article className="settings-card universe-monitor universe-collapsible">
                                        <button
                                          className="universe-collapse-head"
                                          onClick=${() => setUniverse((prev) => ({ ...prev, monitorOpen: !prev.monitorOpen }))}
                                        >
                                          <div>
                                            <div className="card-title">${t("universeMonitor")}</div>
                                            <div className="universe-subtitle">${t("universeProgress")} ${universeDone}/${universeBranches.length}${universeErrored ? ` · ${universeErrored} ${t("error")}` : ""}</div>
                                          </div>
                                          <div className="universe-head-right">
                                            <div className="universe-percent">${universeProgress}%</div>
                                            <span className=${`universe-chevron ${universe.monitorOpen ? "open" : ""}`} aria-hidden="true"></span>
                                          </div>
                                        </button>
                                        <div className="universe-progress-track">
                                          <div className="universe-progress-fill" style=${{ width: `${universeProgress}%` }}></div>
                                        </div>
                                        ${universe.monitorOpen
                                          ? html`
                                              <div className="universe-branches">
                                                ${universeBranches.map((branch) => {
                                                  const preview = branch.error || branch.text.split("\n").filter(Boolean).slice(-3).join("\n") || universeStatusLabel(language, branch.status);
                                                  return html`
                                                    <button
                                                      key=${branch.id}
                                                      className=${`universe-branch ${branch.status}`}
                                                      onClick=${() => setUniverseDetail({ branchId: branch.id, tab: "formatted" })}
                                                    >
                                                      <div className="universe-branch-top">
                                                        <span className="universe-branch-id">#${branch.id}</span>
                                                        <span className=${`universe-dot ${branch.status}`}></span>
                                                      </div>
                                                      <div className="universe-branch-preview">${preview}</div>
                                                      <div className="universe-branch-foot">${universeStatusLabel(language, branch.status)}${branch.wordCount ? ` · ${branch.wordCount} 字` : ""}</div>
                                                    </button>
                                                  `;
                                                })}
                                              </div>
                                            `
                                          : null}
                                      </article>

                                      <article className="settings-card universe-result-card universe-collapsible">
                                        <button
                                          className="universe-collapse-head"
                                          onClick=${() => setUniverse((prev) => ({ ...prev, resultOpen: !prev.resultOpen }))}
                                        >
                                          <div>
                                            <div className="card-title">${t("universeResult")}</div>
                                            <div className="universe-subtitle">
                                              ${universe.resultMarkdown || universe.compileBuffer ? universePhaseLabel(language, universe.status) : t("universeNoResult")}
                                            </div>
                                          </div>
                                          <span className=${`universe-chevron ${universe.resultOpen ? "open" : ""}`} aria-hidden="true"></span>
                                        </button>
	                                        ${universe.resultOpen
	                                          ? universe.resultMarkdown || universe.compileBuffer
	                                            ? html`
	                                                <${MarkdownContent} text=${universe.resultMarkdown || universe.compileBuffer} className="markdown-body universe-markdown" />
	                                              `
	                                            : html`<div className="empty-note">${t("universeNoResult")}</div>`
	                                          : null}
                                      </article>
                                      ${universe.status === "complete" && universe.resultMarkdown
                                        ? html`<button className="ghost-btn universe-save-btn universe-save-under-result" onClick=${saveUniverseToHistory}>${t("saveUniverseToHistory")}</button>`
                                        : null}
                                    `
                                  : null}
                              </section>
                            `
                          : html`
                              <section className="section-head section-head-large">
                                <div className="section-title">${t("extensionsTitle")}</div>
                                <div className="section-copy">${t("extensionsCopy")}</div>
                              </section>
                              <section className="stack">
                                <article className="extension-card">
                                  <button
                                    className="extension-card-button"
                                    onClick=${() => setState((prev) => ({ ...prev, extensionView: "argument-universe" }))}
                                  >
                                    <div className="extension-glyph">AU</div>
                                    <div className="extension-body">
                                      <div className="extension-title">${t("argumentUniverse")}</div>
                                      <div className="extension-copy">${t("argumentUniverseCopy")}</div>
                                    </div>
                                    <div className="extension-open">${t("open")}</div>
                                  </button>
                                </article>
                              </section>
                            `}
                      `
                    : null}
                  ${state.tab === "settings"
                    ? html`
                        <section className="section-head section-head-large">
                          <div className="section-title">${t("settings")}</div>
                        </section>
                        <section className="stack">
                          <article className="settings-card">
                            <div className="card-title">${t("provider")}</div>
                            <div className="field">
                              <label>${t("endpoint")}</label>
                              <input
                                value=${state.settings.baseURL}
                                onInput=${(event) =>
                                  setState((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, baseURL: event.target.value },
                                  }))}
                              />
                            </div>
                            <div className="field">
                              <label>${t("model")}</label>
                              <input
                                value=${state.settings.model}
                                onInput=${(event) =>
                                  setState((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, model: event.target.value },
                                  }))}
                              />
                            </div>
                            <div className="field">
                              <label>${t("apiKey")}</label>
                              <input
                                type="password"
                                value=${state.settings.apiKey}
                                onInput=${(event) =>
                                  setState((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, apiKey: event.target.value },
                                  }))}
                              />
                            </div>
                            <div className="security-note security-note-subtle">${t("directSendNotice")}</div>
                            <div className="settings-actions">
                              <button className="primary-btn" onClick=${saveProviderSettings}>${t("saveSettings")}</button>
                              <button
                                className="danger-link"
                                onClick=${clearStoredApiKey}
                              >
                                ${t("clearApiKey")}
                              </button>
                            </div>
                          </article>

                          <article className="settings-card settings-card-plain">
                            <div className="card-title">${t("recycleBin")}</div>
                            <button className="inline-row inline-row-plain" onClick=${() => openModal({ type: "recycle-bin" })}>
                              <span>${t("deletedSessions")}</span>
                              <span>${trashedSessions(state).length}</span>
                            </button>
                          </article>

                          <article className="settings-card">
                            <div className="card-title">${t("about")}</div>
                            <div className="legal-copy">${t("aboutText")}</div>
                          </article>

                          <article className="settings-card settings-card-plain">
                            <div className="card-title">${t("legal")}</div>
                            <button className="inline-row inline-row-plain" onClick=${async () => openModal({ type: "content", title: t("privacy"), content: await loadPrivacy() })}>
                              <span>${t("privacy")}</span>
                              <span>›</span>
                            </button>
                            <button className="inline-row inline-row-plain" onClick=${() => openModal({ type: "content", title: t("support"), content: t("supportText") })}>
                              <span>${t("support")}</span>
                              <span>›</span>
                            </button>
                          </article>
                        </section>
                      `
                    : null}
                </main>

                <div className=${`bottom-dock ${state.tab === "chat" ? "chat-open" : ""}`}>
                  ${state.tab === "chat"
                    ? html`
                        <div className="composer-wrap">
                          ${!state.settings.apiKey.trim() ? html`<div className="key-warning">${t("apiWarning")}</div>` : null}
                          <div className="composer">
                            <textarea
                              ref=${composerRef}
                              rows="1"
                              placeholder=${t("placeholder")}
                              value=${state.draft}
                              onInput=${(event) => setState((prev) => ({ ...prev, draft: event.target.value }))}
                              onKeyDown=${(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  send();
                                }
                              }}
                            ></textarea>
                            <button className=${`send-btn ${isSending || !state.draft.trim() ? "disabled" : ""}`} onClick=${() => send()}>
                              ${isSending ? "…" : "➜"}
                            </button>
                          </div>
                        </div>
                      `
                    : null}
                  <nav className="tabbar">
                    ${["chat", "history", "extensions", "settings"].map(
                      (tab) => html`
                        <button
                          key=${tab}
                          type="button"
                          className=${`tab-btn ${state.tab === tab ? "active" : ""}`}
                          onPointerDown=${(event) => handleTabPointerDown(tab, event)}
                          onTouchStart=${(event) => handleTabTouchStart(tab, event)}
                          onClick=${(event) => handleTabClick(tab, event)}
                        >
                          <span className="tab-icon"><${TabIcon} tab=${tab} /></span>
                          <span className="tab-label">${t(tab)}</span>
                        </button>
                      `
                    )}
                  </nav>
                </div>

                ${state.menuOpen
                  ? html`
                      <div className="menu-sheet" onClick=${() => setState((prev) => ({ ...prev, menuOpen: false }))}>
                        <div className="sheet-panel" onClick=${(event) => event.stopPropagation()}>
                          <div className="sheet-grabber"></div>
                              <button className="sheet-action" onClick=${() => importInputRef.current?.click()}>${t("importSession")}</button>
                          ${session
                            ? html`
                                <button className="sheet-action" onClick=${() => exportSession("json")}>${t("exportJson")}</button>
                                <button className="sheet-action" onClick=${() => exportSession("md")}>${t("exportMd")}</button>
                                <button className="sheet-action" onClick=${() => exportSession("html")}>${t("exportHtml")}</button>
                                <button className="sheet-action" onClick=${() => exportSession("jpg")}>${t("exportJpg")}</button>
                                <button
                                  className="sheet-action danger"
                                  onClick=${() => {
                                    if (!window.confirm(t("clearCurrentConfirm"))) {
                                      return;
                                    }
                                    setState((prev) => ({
                                      ...prev,
                                      menuOpen: false,
                                      sessions: prev.sessions.map((item) =>
                                        item.id === session.id
                                          ? {
                                              ...item,
                                              title: tFor(prev.settings.language, "newConversation"),
                                              updatedAt: new Date().toISOString(),
                                              messages: [],
                                            }
                                          : item
                                      ),
                                    }));
                                  }}
                                >
                                  ${t("clearCurrent")}
                                </button>
                              `
                            : null}
                          <button className="sheet-action" onClick=${() => setState((prev) => ({ ...prev, menuOpen: false }))}>${t("cancel")}</button>
                        </div>
                      </div>
                    `
                  : null}

	                ${selectedUniverseBranch
	                  ? html`
	                      <div className="modal center universe-detail-overlay" onClick=${() => setUniverseDetail({ branchId: "", tab: "formatted" })}>
                        <div className="modal-card universe-detail-card" onClick=${(event) => event.stopPropagation()}>
                          <div className="universe-detail-head">
                            <div>
                              <div className="modal-title">${t("universeBranchDetail")} #${selectedUniverseBranch.id}</div>
                              <div className="session-meta">
                                ${universeStatusLabel(language, selectedUniverseBranch.status)}${selectedUniverseBranch.wordCount ? ` · ${selectedUniverseBranch.wordCount} 字` : ""}
                              </div>
                            </div>
                            <button className="mini-btn" onClick=${() => setUniverseDetail({ branchId: "", tab: "formatted" })}>${t("close")}</button>
                          </div>
                          <div className="universe-detail-tabs">
                            ${["formatted", "raw"].map(
                              (detailTab) => html`
                                <button
                                  className=${`universe-detail-tab ${universeDetail.tab === detailTab ? "active" : ""}`}
                                  onClick=${() => setUniverseDetail((prev) => ({ ...prev, tab: detailTab }))}
                                >
                                  ${t(detailTab)}
                                </button>
                              `
                            )}
                          </div>
                          <div className="universe-detail-content">
                            ${universeDetail.tab === "raw"
                              ? html`<pre className="universe-raw">${selectedUniverseBranch.text || selectedUniverseBranch.error || t("noMessages")}</pre>`
                              : html`<${MarkdownContent} text=${selectedUniverseBranch.text || selectedUniverseBranch.error || t("noMessages")} className="markdown-body universe-markdown" />`}
                          </div>
                        </div>
                      </div>
	                    `
	                  : null}

	                ${selectedHistoryUniverseBranch
	                  ? html`
	                      <div className="modal center universe-detail-overlay" onClick=${() => setHistoryUniverseDetail({ sessionId: "", branchId: "", tab: "formatted" })}>
	                        <div className="modal-card universe-detail-card" onClick=${(event) => event.stopPropagation()}>
	                          <div className="universe-detail-head">
	                            <div>
	                              <div className="modal-title">${t("universeBranchDetail")} #${selectedHistoryUniverseBranch.id}</div>
	                              <div className="session-meta">
	                                ${universeStatusLabel(language, selectedHistoryUniverseBranch.status)}${selectedHistoryUniverseBranch.wordCount ? ` · ${selectedHistoryUniverseBranch.wordCount} 字` : ""}
	                              </div>
	                            </div>
	                            <button className="mini-btn" onClick=${() => setHistoryUniverseDetail({ sessionId: "", branchId: "", tab: "formatted" })}>${t("close")}</button>
	                          </div>
	                          <div className="universe-detail-tabs">
	                            ${["formatted", "raw"].map(
	                              (detailTab) => html`
	                                <button
	                                  className=${`universe-detail-tab ${historyUniverseDetail.tab === detailTab ? "active" : ""}`}
	                                  onClick=${() => setHistoryUniverseDetail((prev) => ({ ...prev, tab: detailTab }))}
	                                >
	                                  ${t(detailTab)}
	                                </button>
	                              `
	                            )}
	                          </div>
	                          <div className="universe-detail-content">
	                            ${historyUniverseDetail.tab === "raw"
	                              ? html`<pre className="universe-raw">${selectedHistoryUniverseBranch.text || selectedHistoryUniverseBranch.error || t("noMessages")}</pre>`
	                              : html`<${MarkdownContent} text=${selectedHistoryUniverseBranch.text || selectedHistoryUniverseBranch.error || t("noMessages")} className="markdown-body universe-markdown" />`}
	                          </div>
	                        </div>
	                      </div>
	                    `
	                  : null}

	                ${state.modal
                  ? html`
                      <div className=${`modal center ${isClosingRecycleBin ? "modal-closing" : ""}`} onClick=${closeModal}>
                        <div className=${`modal-card ${state.modal.type === "recycle-bin" ? "modal-card-solid" : ""} ${isClosingRecycleBin ? "modal-card-closing" : ""}`} onClick=${(event) => event.stopPropagation()}>
                          <div className="modal-title">
                            ${state.modal.type === "recycle-bin" ? t("recycleBin") : state.modal.title}
                          </div>
                          ${state.modal.type === "recycle-bin"
                            ? html`
                                <div className="modal-content modal-content-solid">
                                  ${trashedSessions(state).length
                                    ? trashedSessions(state).map(
                                        (item) => html`
                                          <div key=${item.id} className="recycle-item">
                                            <div className="session-title">${item.title}</div>
                                            <div className="session-meta">${recycleInfo(item)}</div>
                                            <${MarkdownContent}
                                              text=${sessionPreview(language, item) || t("deletedEmpty")}
                                              className="session-preview markdown-body session-preview-markdown"
                                            />
                                            <div className="bubble-actions">
                                              <button className="mini-btn" onClick=${() => restoreSession(item.id)}>${t("restore")}</button>
                                              <button className="mini-btn" onClick=${() => permanentlyDeleteSession(item.id)}>${t("delete")}</button>
                                            </div>
                                          </div>
                                        `
                                      )
                                    : html`<div className="empty-note empty-note-centered empty-note-modal">${t("recycleEmpty")}</div>`}
                                </div>
                              `
                            : html`
                                <div className="modal-copy">${state.modal.copy || ""}</div>
                                <div className="modal-content">${state.modal.content || ""}</div>
                              `}
                          <div className=${`modal-actions ${state.modal.type === "recycle-bin" ? "modal-actions-plain" : ""}`}>
                            <button className=${state.modal.type === "recycle-bin" ? "plain-accent-btn" : "ghost-btn"} onClick=${closeModal}>${t("ok")}</button>
                          </div>
                        </div>
                      </div>
                    `
                  : null}

                <input
                  ref=${importInputRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange=${handleImportFile}
                />
              `}
      </div>
    </div>
  `;
}

createRoot(document.getElementById("app")).render(html`<${App} />`);
