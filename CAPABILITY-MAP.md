# Capability Map: grok-discord-remote

Discord DMs are a **remote window** on a Grok Build session (Copilot CLI ↔ web/Android analog). One brain: Grok Build on the PC. Two clients: `grok` TUI and Discord DM.

| Module id | Responsibility | Depends on |
|---|---|---|
| security | DM-only, allowlist, loopback ACP, secrets in env | — |
| acp-client | Talk to `grok agent` (stdio or `serve` on 127.0.0.1) | security |
| session-map | Discord user ↔ Grok session id; persist so TUI `/resume` works | acp-client |
| discord-ingress | Discord bot: receive DM, send reply/stream, ignore guilds | security |
| host | Windows process: start Grok agent + bot together | all above |

Build order: security → acp-client → session-map → discord-ingress → host

## Out of scope

- OpenClaw as the agent brain
- recap-bridge / markdown recaps (separate repo)
- grok.com
- Merging `~\.openclaw` session files into `~\.grok\sessions`
- Exposing Grok ACP past loopback
- Reusing the live OpenClaw Discord bot token (one bot, one gateway)
