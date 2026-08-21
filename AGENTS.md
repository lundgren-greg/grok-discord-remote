# Agent instructions — grok-discord-remote

Read `PROJECT.md`, `CAPABILITY-MAP.md`, `docs/SPEC.md`.

This is a **Discord remote client for Grok Build**, like Copilot CLI on web/Android. One Grok session; Discord is a window.

## Product rules

- Grok Build is the brain. Not OpenClaw. Not grok.com. Not recap-bridge.
- DMs + allowlist only. Loopback ACP only.
- New Discord bot; do not use the OpenClaw bot token.
- Windows-first. TypeScript. Tests mock Discord and ACP.
- Never commit `.env` or tokens.

## Verify

```
npm test
npm run build
```

Update `PROJECT.md` when you stop. Open a PR (cloud agent) or commit on a branch. No force-push to `main`.
