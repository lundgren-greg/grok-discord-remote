/**
 * src/config.ts — load and validate environment / config
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  discordBotToken: string;
  /** Comma-separated snowflake ids (or array after parsing) */
  allowFrom: string[];
  grokCwd: string;
  grokAlwaysApprove: boolean;
  /** Optional: if set, connect to a running grok agent serve endpoint */
  grokAgentUrl: string | undefined;
  grokAgentSecret: string | undefined;
  /** Path to sessions.json on disk */
  sessionMapPath: string;
}

function loadFromFile(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), "config.json"), "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function loadConfig(): Config {
  const file = loadFromFile();

  const token = process.env["DISCORD_BOT_TOKEN"] ?? file["DISCORD_BOT_TOKEN"] ?? "";
  const allowRaw =
    process.env["DISCORD_ALLOW_FROM"] ?? file["DISCORD_ALLOW_FROM"] ?? "";
  const allowFrom = allowRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const grokCwd =
    process.env["GROK_CWD"] ?? file["GROK_CWD"] ?? "C:\\Repos";
  const grokAlwaysApprove =
    (process.env["GROK_ALWAYS_APPROVE"] ?? file["GROK_ALWAYS_APPROVE"] ?? "false") ===
    "true";

  const grokAgentUrl = process.env["GROK_AGENT_URL"] ?? file["GROK_AGENT_URL"];
  const grokAgentSecret =
    process.env["GROK_AGENT_SECRET"] ?? file["GROK_AGENT_SECRET"];

  const userprofile =
    process.env["USERPROFILE"] ?? process.env["HOME"] ?? process.cwd();
  const sessionMapPath =
    process.env["SESSION_MAP_PATH"] ??
    file["SESSION_MAP_PATH"] ??
    join(userprofile, ".grok-discord-remote", "sessions.json");

  return {
    discordBotToken: token,
    allowFrom,
    grokCwd,
    grokAlwaysApprove,
    grokAgentUrl: grokAgentUrl || undefined,
    grokAgentSecret: grokAgentSecret || undefined,
    sessionMapPath,
  };
}
