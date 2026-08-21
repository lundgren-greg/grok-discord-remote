# Spec: session-map

File: `%USERPROFILE%\.grok-discord-remote\sessions.json` (config override).

```json
{
  "discord:543237713038409748": {
    "sessionId": "<uuid>",
    "cwd": "C:\\Repos",
    "updatedAt": "2026-08-21T00:00:00Z"
  }
}
```

- One DM peer → one Grok session (v1).
- `/new` in Discord (exact command from allowlisted user) creates a new Grok session and updates the map.
- Map is not the transcript; Grok owns history.

## Desk resume

README:

```
grok --resume <sessionId>
```

Print session id in Discord on `/status`.
