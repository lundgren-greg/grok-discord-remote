# Spec: security

- Discord: `dmPolicy` equivalent — ignore all guild messages. DMs only.
- `ALLOW_FROM` = Discord snowflake(s). Default document Greg's id; do not hardcode as the only possible id (config).
- Pairing: v1 is allowlist only (no pairing codes).
- Grok ACP: `127.0.0.1` only if using `serve`. Secret required.
- Tool permissions: default **not** yolo. Config `GROK_ALWAYS_APPROVE=false`. If false, Discord should get a short "needs desk approval" when ACP requests permission (v1 may refuse the tool and tell the user to finish at the TUI).
- Env: `DISCORD_BOT_TOKEN`, `GROK_AGENT_SECRET` (if serve), never in git.
