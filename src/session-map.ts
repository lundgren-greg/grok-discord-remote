/**
 * src/session-map.ts — persist Discord user → Grok session id mapping
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface SessionEntry {
  sessionId: string;
  cwd: string;
  updatedAt: string;
}

export type SessionMap = Record<string, SessionEntry>;

function mapKey(discordUserId: string): string {
  return `discord:${discordUserId}`;
}

export function loadSessionMap(path: string): SessionMap {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as SessionMap;
  } catch {
    return {};
  }
}

export function saveSessionMap(path: string, map: SessionMap): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(map, null, 2), "utf-8");
}

export function getSession(
  map: SessionMap,
  discordUserId: string
): SessionEntry | undefined {
  return map[mapKey(discordUserId)];
}

export function setSession(
  map: SessionMap,
  discordUserId: string,
  sessionId: string,
  cwd: string
): SessionMap {
  const updated: SessionMap = {
    ...map,
    [mapKey(discordUserId)]: {
      sessionId,
      cwd,
      updatedAt: new Date().toISOString(),
    },
  };
  return updated;
}

export function removeSession(
  map: SessionMap,
  discordUserId: string
): SessionMap {
  const updated: SessionMap = { ...map };
  delete updated[mapKey(discordUserId)];
  return updated;
}
