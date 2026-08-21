# Spec: grok-discord-remote

## Objective

Greg DMs a Discord bot on his phone. That message is a prompt to **Grok Build on GREG-PC**. Replies stream back to the DM. At the desk he runs `grok --resume <session-id>` (or the welcome picker) and continues **the same conversation**.

Success: a DM and a later TUI resume share one session under `~\.grok\sessions\`.

User: Greg (Discord user `543237713038409748`), America/Chicago, Windows host.

## Assumptions

1. Grok Build CLI is installed and logged in on the host (`grok agent` works).
2. Phone UX is Discord DMs, not a new app, not grok.com, not AFK Pilot (AFK Pilot is an alternative, not this repo).
3. A **new** Discord bot (do not steal OpenClaw's running token).
4. ACP is the integration: `grok agent stdio` or `grok agent serve --bind 127.0.0.1:<port> --secret`.
5. Default cwd for new sessions: `C:\Repos` (config).
6. Cloud Copilot implements and tests with mocks; it cannot talk to live Discord or Greg's `grok`.

## Tech Stack

- Node.js 22+ / TypeScript
- `discord.js` for Discord Gateway (outbound websocket; no inbound ports)
- `@agentclientprotocol/sdk` for ACP
- Vitest (or node:test) for unit tests
- Config: `config.json` + `.env` (never commit `.env`)

## Commands

```
npm ci
npm test
npm run build
npm start
```

Windows install (after implementer lands it):

```
pwsh -NoProfile -File ./scripts/Install-GrokDiscordRemote.ps1
```

Starts (or documents) a scheduled task that launches the host if Grok is on PATH.

## Project Structure

```
src/security.ts
src/acp-client.ts
src/session-map.ts
src/discord-bot.ts
src/host.ts
src/config.ts
tests/
scripts/Install-GrokDiscordRemote.ps1
.env.example
```

## Code Style

TypeScript strict. No `any` except at JSON-RPC edges. Secrets only from env. Log redaction for tokens.

## Testing Strategy

- Mock Discord and mock ACP (no live bot in CI).
- Allowlist: unknown Discord user → no ACP call.
- Guild/channel messages ignored.
- Session map: second DM from same user reuses session id.
- ACP errors surface as a short Discord error, not a stack dump.

## Boundaries

- Always: loopback ACP; DM + allowlist; tests before commit.
- Ask first: binding to LAN; always-approve/yolo for tools; sharing one Discord bot with OpenClaw.
- Never: commit tokens; `grok agent serve` on `0.0.0.0`; dump session jsonl to Discord.

## Success Criteria

- [ ] DM from allowlisted user → `session/prompt` on Grok ACP
- [ ] Assistant text (not raw tool JSON) posted back to the DM
- [ ] Same Discord user maps to one Grok session id stored on disk
- [ ] README documents `grok --resume <id>` for the desk
- [ ] Unit tests pass without Discord or Grok
- [ ] OpenClaw can keep running in parallel (different bot)

## Open Questions (non-blocking)

- Prefer `grok agent stdio` (spawn) vs `serve` (long-lived). Default: stdio child of the host process unless config sets serve URL.
