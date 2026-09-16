/**
 * src/acp-client.ts — communicate with Grok Build via Agent Client Protocol
 *
 * Spawns `grok agent stdio` (or connects to a running `grok agent serve`
 * endpoint if GROK_AGENT_URL is configured).
 *
 * Wire protocol: newline-delimited JSON-RPC 2.0 over stdin/stdout.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params: Json;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string;
  result?: Json;
  error?: { code: number; message: string; data?: Json };
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params: Json;
}

export interface AcpClientOptions {
  /** If set, connect via WebSocket to a running `grok agent serve` */
  agentUrl?: string;
  agentSecret?: string;
  /** Working directory for the spawned grok process */
  grokCwd?: string;
  /** Internal: inject a fake spawn function for tests */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _spawnOverride?: (...args: any[]) => any;
}

export class AcpClient extends EventEmitter {
  private proc: ChildProcess | null = null;
  private pending = new Map<
    string,
    { resolve: (r: Json) => void; reject: (e: Error) => void }
  >();
  private initialized = false;
  private readonly options: AcpClientOptions;

  constructor(options: AcpClientOptions = {}) {
    super();
    this.options = options;
  }

  /** Start the grok agent process (stdio mode). */
  async start(): Promise<void> {
    if (this.options.agentUrl) {
      throw new Error(
        "WebSocket serve mode not yet implemented; use stdio (omit GROK_AGENT_URL)"
      );
    }

    const spawnFn = this.options._spawnOverride ?? spawn;
    const proc = spawnFn("grok", ["agent", "stdio"], {
      cwd: this.options.grokCwd,
      stdio: ["pipe", "pipe", "inherit"],
      windowsHide: true,
    });

    this.proc = proc;

    proc.on("error", (err: Error) => {
      this.emit("error", new Error(`Grok Build is not running on the PC. (${err.message})`));
    });

    proc.on("exit", (code: number | null) => {
      this.emit("exit", code);
    });

    const rl = createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse | JsonRpcNotification;
        if ("id" in msg && msg.id) {
          const pend = this.pending.get(msg.id);
          if (pend) {
            this.pending.delete(msg.id);
            if (msg.error) {
              pend.reject(
                new Error(
                  `ACP error ${msg.error.code}: ${msg.error.message}`
                )
              );
            } else {
              pend.resolve(msg.result);
            }
          }
        } else {
          // Notification
          const notif = msg as JsonRpcNotification;
          this.emit("notification", notif);
          this.emit(notif.method, notif.params);
        }
      } catch {
        // ignore unparsable lines
      }
    });

    await this.initialize();
  }

  private send(method: string, params: Json): Promise<Json> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const req: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
      this.pending.set(id, { resolve, reject });
      this.proc!.stdin!.write(JSON.stringify(req) + "\n");
    });
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.send("initialize", {
      protocolVersion: 1,
      capabilities: { filesystem: true, terminal: true },
    });
    this.initialized = true;
  }

  /** Create a new Grok session. Returns the session id. */
  async newSession(cwd: string): Promise<string> {
    const result = (await this.send("session/new", { cwd })) as {
      sessionId: string;
    };
    return result.sessionId;
  }

  /**
   * Send a prompt to the session.
   * Emits "agent_message_chunk" notifications during the reply.
   * Returns the full concatenated assistant text.
   */
  async prompt(sessionId: string, text: string): Promise<string> {
    const chunks: string[] = [];

    const onChunk = (params: Json) => {
      if (
        params?.sessionId === sessionId &&
        typeof params?.text === "string"
      ) {
        chunks.push(params.text as string);
      }
    };

    this.on("agent_message_chunk", onChunk);

    try {
      await this.send("session/prompt", { sessionId, text });
    } finally {
      this.off("agent_message_chunk", onChunk);
    }

    return chunks.join("");
  }

  stop(): void {
    this.proc?.stdin?.end();
    this.proc?.kill();
    this.proc = null;
  }
}
