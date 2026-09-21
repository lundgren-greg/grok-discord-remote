/**
 * tests/discord-bot-stream.test.ts — real AcpClient + fake ACP transport
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import type { Message } from "discord.js";
import { DiscordBot } from "../src/discord-bot.js";
import type { Config } from "../src/config.js";

function makeMsg(content: string) {
  const replies: string[] = [];
  const sent: string[] = [];

  return {
    author: {
      id: "543237713038409748",
      bot: false,
    },
    channel: {
      type: 1,
      send: vi.fn(async (text: string) => {
        sent.push(text);
      }),
      sendTyping: vi.fn().mockResolvedValue(undefined),
    },
    content,
    reply: vi.fn(async (text: string) => {
      replies.push(text);
    }),
    _replies: replies,
    _sent: sent,
  };
}

function makeChunkedAcpProc() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const requests: Array<{ method: string; params: unknown }> = [];

  stdin.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      const req = JSON.parse(line) as {
        id: string;
        method: string;
        params: unknown;
      };

      requests.push({ method: req.method, params: req.params });

      if (req.method === "initialize") {
        stdout.push(
          JSON.stringify({
            jsonrpc: "2.0",
            id: req.id,
            result: { ok: true },
          }) + "\n"
        );
      } else if (req.method === "session/new") {
        stdout.push(
          JSON.stringify({
            jsonrpc: "2.0",
            id: req.id,
            result: { sessionId: "session-stream-id" },
          }) + "\n"
        );
      } else if (req.method === "session/prompt") {
        stdout.push(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "agent_message_chunk",
            params: { sessionId: "session-stream-id", text: "Hello " },
          }) + "\n"
        );
        stdout.push(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "agent_message_chunk",
            params: { sessionId: "session-stream-id", text: "from Grok" },
          }) + "\n"
        );
        stdout.push(
          JSON.stringify({
            jsonrpc: "2.0",
            id: req.id,
            result: { done: true },
          }) + "\n"
        );
      }
    }
  });

  return {
    proc: { stdin, stdout, on: vi.fn(), kill: vi.fn() },
    requests,
  };
}

const TMP = join(tmpdir(), `discord-bot-stream-test-${process.pid}`);
const SESSION_MAP_PATH = join(TMP, "sessions.json");

const config: Config = {
  discordBotToken: "fake-token",
  allowFrom: ["543237713038409748"],
  grokCwd: "C:\\Repos",
  grokAlwaysApprove: false,
  grokAgentUrl: undefined,
  grokAgentSecret: undefined,
  sessionMapPath: SESSION_MAP_PATH,
};

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
  rmSync(SESSION_MAP_PATH, { force: true });
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("DiscordBot chunked ACP prompt flow", () => {
  it("creates a session, sends session/prompt, and replies with assembled assistant text", async () => {
    const { proc, requests } = makeChunkedAcpProc();
    const bot = new DiscordBot(config, {
      _spawnOverride: () => proc as never,
    });
    const msg = makeMsg("Stream the reply");

    await bot.handleMessage(msg as unknown as Message);

    expect(requests.map((request) => request.method)).toEqual([
      "initialize",
      "session/new",
      "session/prompt",
    ]);
    expect(requests[2]).toEqual({
      method: "session/prompt",
      params: {
        sessionId: "session-stream-id",
        text: "Stream the reply",
      },
    });
    expect(msg.reply).toHaveBeenCalledWith("Hello from Grok");
    expect(msg.channel.send).not.toHaveBeenCalled();
  });
});
