# Spec: acp-client

Talk to Grok Build Agent Client Protocol.

## Start

```
grok agent stdio
```

or

```
grok agent serve --bind 127.0.0.1:2419 --secret <token>
```

Do not pass `--always-approve` unless config enables it.

## Lifecycle

1. `initialize` (protocolVersion 1, fs + terminal client caps as needed)
2. `session/new` with `cwd` from config **or** `session/load` if map has an id (if load is unsupported, `session/new` and document; implementer must check Grok's initialize methods and use load/resume if advertised)
3. `session/prompt` with user text from Discord
4. Subscribe to `session/update` / `agent_message_chunk`; concatenate assistant text
5. Ignore or summarize tool_call as a one-line status in Discord (optional); never paste full tool stdout

Session ids returned by Grok must be the ids `grok --resume` accepts (`~\.grok\sessions\`).

## Errors

ACP spawn failure → Discord: "Grok Build is not running on the PC."
