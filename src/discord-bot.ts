/**
 * src/discord-bot.ts — Discord DM bot
 *
 * Receives DMs from allowlisted users, sends prompts to Grok ACP,
 * replies with assistant text. Ignores guild/channel messages.
 */
import {
  Client,
  GatewayIntentBits,
  Partials,
  type Message,
  type DMChannel,
} from "discord.js";
import { isAllowed, isDM, redactToken } from "./security.js";
import { AcpClient, type AcpClientOptions } from "./acp-client.js";
import {
  loadSessionMap,
  saveSessionMap,
  getSession,
  setSession,
} from "./session-map.js";
import type { Config } from "./config.js";

const TYPING_INTERVAL_MS = 5000;

export class DiscordBot {
  private client: Client;
  private readonly config: Config;
  private acp: AcpClient | null = null;
  private acpStarting: Promise<void> | null = null;
  private readonly acpOptions: AcpClientOptions;

  constructor(config: Config, acpOptionsOverride?: Partial<AcpClientOptions>) {
    this.config = config;
    this.acpOptions = {
      agentUrl: config.grokAgentUrl,
      agentSecret: config.grokAgentSecret,
      grokCwd: config.grokCwd,
      ...acpOptionsOverride,
    };

    this.client = new Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.client.on("messageCreate", (msg) => {
      this.handleMessage(msg).catch((err: unknown) => {
        console.error("[discord-bot] unhandled error in messageCreate:", err);
      });
    });
  }

  /** Login to Discord and begin receiving events. */
  async start(): Promise<void> {
    console.log(
      `[discord-bot] logging in (token ${redactToken(this.config.discordBotToken)})`
    );
    await this.client.login(this.config.discordBotToken);
    console.log("[discord-bot] ready");
  }

  async stop(): Promise<void> {
    this.acp?.stop();
    this.acp = null;
    await this.client.destroy();
  }

  /**
   * Return a ready AcpClient, starting or restarting as needed.
   * Serialises concurrent start attempts so we don't double-spawn.
   */
  private async getAcp(): Promise<AcpClient> {
    if (this.acp) return this.acp;

    if (this.acpStarting) {
      await this.acpStarting;
      return this.acp!;
    }

    const client = new AcpClient(this.acpOptions);

    client.on("exit", () => {
      if (this.acp === client) {
        console.log("[discord-bot] grok agent exited; will restart on next message");
        this.acp = null;
      }
    });

    client.on("error", (err: Error) => {
      console.error("[discord-bot] ACP error:", err.message);
      if (this.acp === client) this.acp = null;
    });

    this.acpStarting = client.start().then(() => {
      this.acp = client;
      this.acpStarting = null;
    }).catch((err: unknown) => {
      this.acpStarting = null;
      throw err;
    });

    await this.acpStarting;
    return this.acp!;
  }

  /** Exposed for testing — not called directly from Discord events in tests. */
  async handleMessage(msg: Message): Promise<void> {
    // Ignore bots (including ourselves)
    if (msg.author.bot) return;

    // DMs only
    if (!isDM(msg.channel.type)) return;

    // Allowlist check
    if (!isAllowed(msg.author.id, this.config.allowFrom)) {
      console.log(`[discord-bot] ignored message from ${msg.author.id} (not in allowlist)`);
      return;
    }

    const text = msg.content.trim();

    // --- /new command ---
    if (text === "/new") {
      await this.handleNewCommand(msg);
      return;
    }

    // --- /status command ---
    if (text === "/status") {
      await this.handleStatusCommand(msg);
      return;
    }

    // --- Regular prompt ---
    await this.handlePrompt(msg, text);
  }

  private async handleNewCommand(msg: Message): Promise<void> {
    let map = loadSessionMap(this.config.sessionMapPath);

    try {
      const acp = await this.getAcp();
      const sessionId = await acp.newSession(this.config.grokCwd);
      map = setSession(map, msg.author.id, sessionId, this.config.grokCwd);
      saveSessionMap(this.config.sessionMapPath, map);
      await msg.reply(
        `✅ New Grok session started.\nSession id: \`${sessionId}\`\nResume at desk: \`grok --resume ${sessionId}\``
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await msg.reply(`❌ Could not start new session: ${message}`);
    }
  }

  private async handleStatusCommand(msg: Message): Promise<void> {
    const map = loadSessionMap(this.config.sessionMapPath);
    const entry = getSession(map, msg.author.id);
    if (!entry) {
      await msg.reply(
        "No active session. Use `/new` to start one."
      );
      return;
    }
    await msg.reply(
      `📋 Active session: \`${entry.sessionId}\`\nCwd: \`${entry.cwd}\`\nUpdated: ${entry.updatedAt}\nResume at desk: \`grok --resume ${entry.sessionId}\``
    );
  }

  private async handlePrompt(msg: Message, text: string): Promise<void> {
    let map = loadSessionMap(this.config.sessionMapPath);
    let entry = getSession(map, msg.author.id);

    const dmChannel = msg.channel as DMChannel;

    // Typing indicator loop
    const typingInterval = setInterval(() => {
      dmChannel.sendTyping().catch(() => {});
    }, TYPING_INTERVAL_MS);
    void dmChannel.sendTyping().catch(() => {});

    try {
      const acp = await this.getAcp();

      if (!entry) {
        const sessionId = await acp.newSession(this.config.grokCwd);
        map = setSession(map, msg.author.id, sessionId, this.config.grokCwd);
        saveSessionMap(this.config.sessionMapPath, map);
        entry = getSession(map, msg.author.id)!;
      }

      const reply = await acp.prompt(entry.sessionId, text);
      const trimmed = reply.trim() || "(no response)";

      // Discord message limit: 2000 chars
      if (trimmed.length <= 2000) {
        await msg.reply(trimmed);
      } else {
        // Split into chunks
        for (let i = 0; i < trimmed.length; i += 1990) {
          await dmChannel.send(trimmed.slice(i, i + 1990));
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await msg.reply(`❌ ${message}`);
    } finally {
      clearInterval(typingInterval);
    }
  }
}
