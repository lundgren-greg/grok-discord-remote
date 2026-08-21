/**
 * tests/session-map.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadSessionMap,
  saveSessionMap,
  getSession,
  setSession,
  removeSession,
} from "../src/session-map.js";

const TMP = join(tmpdir(), "grok-discord-test-" + process.pid);
const MAP_PATH = join(TMP, "sessions.json");

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("loadSessionMap", () => {
  it("returns empty object when file does not exist", () => {
    expect(loadSessionMap(MAP_PATH)).toEqual({});
  });
});

describe("setSession / getSession", () => {
  it("stores and retrieves a session entry", () => {
    let map = loadSessionMap(MAP_PATH);
    map = setSession(map, "123", "session-abc", "C:\\Repos");
    saveSessionMap(MAP_PATH, map);

    const loaded = loadSessionMap(MAP_PATH);
    const entry = getSession(loaded, "123");
    expect(entry).toBeDefined();
    expect(entry!.sessionId).toBe("session-abc");
    expect(entry!.cwd).toBe("C:\\Repos");
  });

  it("second DM from same user reuses session", () => {
    let map = loadSessionMap(MAP_PATH);
    map = setSession(map, "123", "session-first", "C:\\Repos");
    saveSessionMap(MAP_PATH, map);

    const loaded = loadSessionMap(MAP_PATH);
    const entry = getSession(loaded, "123");
    expect(entry!.sessionId).toBe("session-first");
  });

  it("/new replaces the old session", () => {
    let map = loadSessionMap(MAP_PATH);
    map = setSession(map, "123", "session-old", "C:\\Repos");
    map = setSession(map, "123", "session-new", "C:\\Repos");
    saveSessionMap(MAP_PATH, map);

    const entry = getSession(map, "123");
    expect(entry!.sessionId).toBe("session-new");
  });
});

describe("removeSession", () => {
  it("removes an entry", () => {
    let map = loadSessionMap(MAP_PATH);
    map = setSession(map, "123", "session-abc", "C:\\Repos");
    map = removeSession(map, "123");
    expect(getSession(map, "123")).toBeUndefined();
  });
});

describe("getSession", () => {
  it("returns undefined for unknown user", () => {
    const map = loadSessionMap(MAP_PATH);
    expect(getSession(map, "unknown-user")).toBeUndefined();
  });
});
