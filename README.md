# grok-discord-remote

**Discord remote for Grok Build.** Phone Discord DM and desktop `grok` are two windows on the **same** Grok Build session.

This is not grok.com. This is not OpenClaw. OpenClaw's @MyGrokAssistant is a different agent.

## Use case

1. PC is on; this host and Grok Build are running.
2. Phone: DM the bot. That text is a Grok Build prompt (files, tools, that session).
3. Desk: `grok --resume <session-id>` and keep going.

Like GitHub Copilot CLI ↔ Copilot web/Android.

## Spec

[CAPABILITY-MAP.md](CAPABILITY-MAP.md) · [docs/SPEC.md](docs/SPEC.md)

## Quick Start

### Prerequisites

- Node.js 22+
- Grok Build CLI installed and logged in (`grok agent` works)
- A **new** Discord bot token (not OpenClaw's)

### Setup

```sh
npm ci
cp .env.example .env
# Edit .env: set DISCORD_BOT_TOKEN and DISCORD_ALLOW_FROM
npm start
```

### Commands (Discord DM)

| Command | Description |
|---|---|
| `/new` | Start a fresh Grok session |
| `/status` | Show current session id |
| *(any text)* | Prompt Grok Build |

### Resume at the desk

```sh
grok --resume <session-id>
```

The session id is shown when you send `/status` in the DM, or after `/new`.

### Windows install (scheduled task)

```powershell
pwsh -NoProfile -File ./scripts/Install-GrokDiscordRemote.ps1 -WhatIf
pwsh -NoProfile -File ./scripts/Install-GrokDiscordRemote.ps1
```

### Tests

```sh
npm test
npm run build
```

## Status

See [PROJECT.md](PROJECT.md).
