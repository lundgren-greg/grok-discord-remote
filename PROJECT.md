# grok-discord-remote

| Field | Value |
| --- | --- |
| **Status** | v1 implemented; tests green |
| **Updated** | 2026-08-21 |

## Stopped at

v1 fully implemented by cloud agent:

- `src/config.ts` — env/config loader
- `src/security.ts` — allowlist + DM-only helpers
- `src/acp-client.ts` — Grok ACP stdio client (JSON-RPC)
- `src/session-map.ts` — persist Discord user → session id
- `src/discord-bot.ts` — Discord DM bot; `/new`, `/status`, prompt relay
- `src/host.ts` — process entrypoint
- `tests/` — 25 tests, all passing (no live Discord or Grok)
- `scripts/Install-GrokDiscordRemote.ps1` — Windows scheduled task installer (WhatIf)
- `package.json`, `tsconfig.json`, `vitest.config.ts`

## Next

1. Human: create a **new** Discord bot app at discord.com/developers, copy token to `.env`.
2. Set `DISCORD_ALLOW_FROM` to your Discord snowflake id.
3. `npm ci && npm start`
4. DM the bot; resume at desk with `grok --resume <session-id>`.

## Decisions log

- 2026-08-21: Not recap-bridge. Not OpenClaw-as-brain. Discord is a remote client of Grok ACP sessions.
- 2026-08-21: ACP over stdio (`grok agent stdio`); WebSocket serve mode left as future work.
- 2026-08-21: One AcpClient spawned per message; session id persisted to `~/.grok-discord-remote/sessions.json`.
