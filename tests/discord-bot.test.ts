/**
 * tests/discord-bot.test.ts — mock Discord and ACP; verify bot logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Minimal Discord Message mock ----
function makeMsg(overrides: {
  authorId?: string;
  authorBot?: boolean;
  channelType?: number;
  content?: string;
}) {
  const replies: string[] = [];
  return {
    author: {
      id: overrides.authorId ?? "543237713038409748",
      bot: overrides.authorBot ?? false,
    },
    channel: {
      type: overrides.channelType ?? 1,
      send: vi.fn(),
      sendTyping: vi.fn().mockResolvedValue(undefined),
    },
    content: overrides.content ?? "hello",
    reply: vi.fn(async (text: string) => {
      replies.push(text);
    }),
    _replies: replies,
  };
}

// ---- Mock AcpClient ----
const mockAcpStart = vi.fn().mockResolvedValue(undefined);
const mockAcpNewSession = vi.fn().mockResolvedValue("session-mock-id");
const mockAcpPrompt = vi.fn().mockResolvedValue("I am Grok.");
const mockAcpStop = vi.fn();

vi.mock("../src/acp-client.js", () => ({
  AcpClient: vi.fn().mockImplementation(() => ({
    start: mockAcpStart,
    newSession: mockAcpNewSession,
    prompt: mockAcpPrompt,
    stop: mockAcpStop,
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

// We need a temporary directory for session-map
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TMP = join(tmpdir(), "discord-bot-test-" + process.pid);
const SESSION_MAP_PATH = join(TMP, "sessions.json");

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
  vi.clearAllMocks();
  mockAcpStart.mockResolvedValue(undefined);
  mockAcpNewSession.mockResolvedValue("session-mock-id");
  mockAcpPrompt.mockResolvedValue("I am Grok.");
});

import { DiscordBot } from "../src/discord-bot.js";
import type { Config } from "../src/config.js";
import type { Message } from "discord.js";

const config: Config = {
  discordBotToken: "fake-token",
  allowFrom: ["543237713038409748"],
  grokCwd: "C:\\Repos",
  grokAlwaysApprove: false,
  grokAgentUrl: undefined,
  grokAgentSecret: undefined,
  sessionMapPath: SESSION_MAP_PATH,
};

describe("DiscordBot.handleMessage", () => {
  it("ignores messages from bots", async () => {
    const bot = new DiscordBot(config);
    const msg = makeMsg({ authorBot: true });
    await bot.handleMessage(msg as unknown as Message);
    expect(mockAcpStart).not.toHaveBeenCalled();
  });

  it("ignores non-DM channels", async () => {
    const bot = new DiscordBot(config);
    const msg = makeMsg({ channelType: 0 });
    await bot.handleMessage(msg as unknown as Message);
    expect(mockAcpStart).not.toHaveBeenCalled();
  });

  it("ignores messages from users not in allowlist", async () => {
    const bot = new DiscordBot(config);
    const msg = makeMsg({ authorId: "000000000000000000" });
    await bot.handleMessage(msg as unknown as Message);
    expect(mockAcpStart).not.toHaveBeenCalled();
    expect(msg.reply).not.toHaveBeenCalled();
  });

  it("sends prompt to ACP and replies with assistant text", async () => {
    const bot = new DiscordBot(config);
    const msg = makeMsg({ content: "What is the weather?" });
    await bot.handleMessage(msg as unknown as Message);
    expect(mockAcpPrompt).toHaveBeenCalledWith("session-mock-id", "What is the weather?");
    expect(msg.reply).toHaveBeenCalledWith("I am Grok.");
  });

  it("/new creates a new session and replies with session id", async () => {
    const bot = new DiscordBot(config);
    const msg = makeMsg({ content: "/new" });
    await bot.handleMessage(msg as unknown as Message);
    expect(mockAcpNewSession).toHaveBeenCalled();
    const replyText = (msg.reply as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(replyText).toContain("session-mock-id");
  });

  it("/status replies with session id when session exists", async () => {
    // First create a session via /new
    const bot = new DiscordBot(config);
    const newMsg = makeMsg({ content: "/new" });
    await bot.handleMessage(newMsg as unknown as Message);

    const statusMsg = makeMsg({ content: "/status" });
    await bot.handleMessage(statusMsg as unknown as Message);
    const replyText = (statusMsg.reply as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(replyText).toContain("session-mock-id");
  });

  it("/status says no session when none exists", async () => {
    // Use a different user id with no session
    const freshConfig: Config = {
      ...config,
      allowFrom: ["999999999999999999"],
      sessionMapPath: join(TMP, "sessions-fresh.json"),
    };
    const bot = new DiscordBot(freshConfig);
    const msg = makeMsg({ authorId: "999999999999999999", content: "/status" });
    await bot.handleMessage(msg as unknown as Message);
    const replyText = (msg.reply as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(replyText).toContain("/new");
  });

  it("second DM from same user reuses existing session", async () => {
    // Use a fresh session map path to avoid interference from other tests
    const freshPath = join(TMP, "sessions-reuse.json");
    const freshConfig: Config = { ...config, sessionMapPath: freshPath };
    const bot = new DiscordBot(freshConfig);

    const msg1 = makeMsg({ content: "first message" });
    await bot.handleMessage(msg1 as unknown as Message);
    // Session created with id "session-mock-id"
    expect(mockAcpNewSession).toHaveBeenCalledTimes(1);

    const msg2 = makeMsg({ content: "second message" });
    await bot.handleMessage(msg2 as unknown as Message);
    // Should not create another session
    expect(mockAcpNewSession).toHaveBeenCalledTimes(1);
    expect(mockAcpPrompt).toHaveBeenCalledTimes(2);
  });

  it("ACP error replies with user-friendly message", async () => {
    mockAcpStart.mockRejectedValue(new Error("Grok Build is not running on the PC."));
    const bot = new DiscordBot(config);
    const msg = makeMsg({ content: "hi" });
    await bot.handleMessage(msg as unknown as Message);
    const replyText = (msg.reply as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(replyText).toContain("Grok Build");
  });
});

// cleanup
import { afterAll } from "vitest";
afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});
