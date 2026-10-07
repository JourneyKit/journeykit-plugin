---
name: troubleshooting
description: Diagnose a JourneyKit installation that isn't working — events or users not arriving, stages missing, journeys not starting, or the JourneyKit MCP connection failing. Use when JourneyKit data looks wrong or setup verification fails.
---

# Troubleshoot JourneyKit

Diagnose from evidence, outermost layer first: is the agent connected → do requests reach JourneyKit → are they accepted → is the data what the product meant to send → do journeys react. Call `check_setup` first; its `checks` name the first broken layer. Fix one cause at a time and re-verify with `check_setup` and a fresh `since`.

## MCP connection

| Symptom | Cause and fix |
| --- | --- |
| JourneyKit tools aren't available | The plugin's MCP server isn't connected. Claude Code: `/mcp` → `journeykit` → authenticate. Codex: `codex mcp login journeykit`. Cursor: Settings → MCP → JourneyKit → Connect. |
| "This app was disconnected" / 401 after working before | The connection was revoked under Settings → AI assistants, or the token expired. Reconnect. |
| "isn't bound to a workspace" / wrong workspace in `check_setup` | Reconnect and pick the right workspace on the consent screen. |
| "needs the journeykit:write scope" | The connection was granted read-only. Approve the re-authorization prompt, or reconnect and allow changes. |
| "You are no longer a member of this workspace" | The user was removed from it; they need to be re-invited or connect a different workspace. |

## Nothing arrives (`sdk_traffic` missing)

Work through these in order; each is checkable in the code or the browser.

1. **Script not loaded** — the client module isn't imported anywhere that runs, the key env var is undefined at build time (wrong prefix, e.g. `REACT_APP_` in a Vite app; not rebuilt after adding it), or the code only runs on the server.
2. **Wrong host** — requests go to the product's own origin (`/api/ingest/...` 404s) instead of `https://journeykit.io`. Pass `host` to `init` explicitly.
3. **CSP** — the console shows "Refused to load the script" or "Refused to connect". Add the JourneyKit host to `script-src` and `connect-src`, including the production CSP.
4. **Blocked by an extension** — ad/tracking blockers may block `sdk.js`. Verify in a clean profile; the app keeps working either way because the module fails quiet.
5. **Invalid key** — a `401 Invalid or missing API key` from `/api/ingest/*`: the key was revoked, mistyped, or belongs to another workspace. Compare its prefix with `keys.public` in `check_setup`; create a new one with `create_public_key` if needed.

## Users arrive, events don't (`track` missing)

- `track` runs before `identify` — the SDK drops it with a console warning `track(...) ignored: call identify() first`. Identify earlier, or move the track call after the session is known.
- Event name rejected (`400 Invalid payload`) — names allow letters, digits, `_ . : -`, up to 120 characters.
- Events are batched and flushed every 2 seconds and on page hide. A test that closes the page instantly still sends via `sendBeacon`; a test that checks within a second may simply be early — re-check.
- `403 Public keys cannot set event timestamps` — a `timestamp` was sent with a public key. Drop it for live events; only a backfill needs one, sent with a secret key the user sets.

## Server-side events missing

- `JOURNEYKIT_KEY` (or the project's name for it) is unset in that environment — the helper returns silently. It's a public key: set it in the deployment's env or commit it to the project's public config.
- A secret key ended up in front-end code or a commit — replace it with the public key, and tell the user to revoke the secret key under Settings → API keys since it was exposed.
- The serverless function returns before the fetch completes — await it or use `waitUntil`.
- The `userId` differs from the front end's (e.g. email on one side, database id on the other), splitting one person into two users. Use the same id everywhere.

## Users have no stage (`stage` missing)

The stage is only ever the `stage` property on identify — JourneyKit never infers it from events. Send it with identify when the user moves (from the front end or the backend), using a name from `check_setup`'s `stages`. An unknown stage name is stored as-is but sits outside the funnel order.

## A journey doesn't start or doesn't send

Read it with `search_tools` → `journeys.get` (and its runs) via `describe_tools` / `execute_tool`.

- The journey is `draft` or `paused` — only `active` journeys enter users.
- The trigger event name doesn't exactly match what's tracked (`check_setup` → `recent.eventNames`).
- Re-entry is `once` and the user already went through it.
- The first *only continue if* step excluded the user — the run is `exited`.
- An email step `skipped` (user has no email) or `failed` (a required template parameter resolved to nothing) — the run's nudges show which.

## Reporting back

Tell the user the cause you found, the evidence (error text, check result, the line of code), what you changed, and the `check_setup` result after the fix. If the cause is outside the codebase (dashboard settings, production env vars, CSP at the CDN), say exactly what they need to change and where.
