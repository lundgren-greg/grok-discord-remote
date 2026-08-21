You are implementing grok-discord-remote in the GitHub Copilot cloud.

Read: AGENTS.md, PROJECT.md, CAPABILITY-MAP.md, docs/SPEC.md, docs/*.md, tasks/todo.md.

Product: Discord DMs are a remote window on **Grok Build** (ACP), same session as `grok --resume`. Like Copilot CLI on the phone.

Not OpenClaw. Not recap-bridge. Not grok.com. Not merging session jsonl files.

Implement v1 in TypeScript:

1. npm project, strict TS, `npm test` / `npm run build` / `npm start`
2. ACP client to `grok agent stdio` (mock in tests)
3. Discord.js bot, DMs + allowlist only
4. session map Discord user → Grok session id
5. `/new` and `/status` in DMs
6. scripts/Install-GrokDiscordRemote.ps1 (WhatIf)
7. .env.example (no real secrets)
8. Tests green; update PROJECT.md; open a PR

Never commit tokens. Never bind ACP off loopback. Do not ask the user questions.
