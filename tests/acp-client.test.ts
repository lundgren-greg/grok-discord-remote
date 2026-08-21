/**
 * tests/acp-client.test.ts — mock-based ACP client tests
 *
 * We test AcpClient by injecting a fake spawn function directly,
 * since vi.spyOn cannot redefine built-in ES module exports.
 */
import { describe, it, expect, vi } from "vitest";
import { PassThrough } from "node:stream";
import { AcpClient } from "../src/acp-client.js";

// Override the spawn dependency via the exported setter
// (We expose a testable seam in acp-client.ts below, or we test via the
// public AcpClient constructor that accepts a spawn override.)

function makeJsonRpc(id: string, result: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n";
}

function makeFakeProc(responses: Map<string, unknown>) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();

  stdin.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const req = JSON.parse(line) as { id: string; method: string };
        const result = responses.get(req.method);
        if (result !== undefined) {
          stdout.push(makeJsonRpc(req.id, result));
        }
      } catch {
        // ignore
      }
    }
  });

  return { stdin, stdout, on: vi.fn(), kill: vi.fn() };
}

describe("AcpClient", () => {
  it("initialize + newSession returns a session id", async () => {
    const responses = new Map<string, unknown>([
      ["initialize", { ok: true }],
      ["session/new", { sessionId: "test-session-123" }],
    ]);

    const fakeProc = makeFakeProc(responses);
    const client = new AcpClient({
      grokCwd: "C:\\Repos",
      _spawnOverride: () => fakeProc as never,
    });
    await client.start();
    const sessionId = await client.newSession("C:\\Repos");
    expect(sessionId).toBe("test-session-123");
    client.stop();
  });

  it("prompt returns concatenated assistant text from chunks", async () => {
    const sessionId = "session-abc";

    const stdin = new PassThrough();
    const stdout = new PassThrough();

    stdin.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const req = JSON.parse(line) as { id: string; method: string };
          if (req.method === "initialize") {
            stdout.push(makeJsonRpc(req.id, { ok: true }));
          } else if (req.method === "session/prompt") {
            stdout.push(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "agent_message_chunk",
                params: { sessionId, text: "Hello " },
              }) + "\n"
            );
            stdout.push(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "agent_message_chunk",
                params: { sessionId, text: "world" },
              }) + "\n"
            );
            stdout.push(makeJsonRpc(req.id, { done: true }));
          }
        } catch {
          // ignore
        }
      }
    });

    const client = new AcpClient({
      grokCwd: "C:\\Repos",
      _spawnOverride: () => ({ stdin, stdout, on: vi.fn(), kill: vi.fn() }) as never,
    });
    await client.start();
    const reply = await client.prompt(sessionId, "say hello");
    expect(reply).toBe("Hello world");
    client.stop();
  });

  it("spawn error emits error event with user-friendly message", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    let procErrorHandler: ((err: Error) => void) | null = null;

    // Fake proc: capture error handler registration
    const fakeProc = {
      stdin,
      stdout,
      on: vi.fn((event: string, cb: (e: Error) => void) => {
        if (event === "error") procErrorHandler = cb;
      }),
      kill: vi.fn(),
    };

    stdin.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const req = JSON.parse(line) as { id: string; method: string };
          if (req.method === "initialize") {
            stdout.push(makeJsonRpc(req.id, { ok: true }));
          }
        } catch { /* ignore */ }
      }
    });

    const client = new AcpClient({
      grokCwd: "C:\\Repos",
      _spawnOverride: () => fakeProc as never,
    });

    const errPromise = new Promise<Error>((resolve) =>
      client.on("error", resolve)
    );

    await client.start();
    procErrorHandler!(new Error("ENOENT"));

    const err = await errPromise;
    expect(err.message).toContain("Grok Build is not running");
    client.stop();
  });
});
