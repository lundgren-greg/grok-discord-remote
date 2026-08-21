# grok-discord-remote

| Field | Value |
| --- | --- |
| **Status** | Spec; Copilot cloud agent |
| **Updated** | 2026-08-21 |

## Stopped at

1. Spec: Discord DM ↔ same Grok Build session as local `grok` (Copilot CLI-style attach).
2. Cloud agent dispatched to implement v1.

## Next

1. Implement per `tasks/todo.md`.
2. Human: create a **new** Discord bot, put token in `.env`, run on the Grok host (not the OpenClaw bot token).

## Decisions log

- 2026-08-21: Not recap-bridge. Not OpenClaw-as-brain. Discord is a remote client of Grok ACP sessions.
- 2026-08-21: GitHub repo is **public**. Others who run Grok Build and want Discord as the phone window can use it. Personal Discord ids stay out of the repo.
