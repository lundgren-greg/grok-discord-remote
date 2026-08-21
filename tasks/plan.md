# Plan

1. Security + config (no Discord yet).
2. ACP client against a fake JSON-RPC peer.
3. Session map on a temp dir.
4. Discord.js with mocked gateway events.
5. Host + install script.
6. Document that live install needs a new Discord application and Grok on PATH.

Risk: `session/load` vs `session/new` — probe Grok initialize; if load missing, persist id from `session/new` and still support TUI resume via that id.
