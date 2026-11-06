---
name: troubleshooting
description: Diagnose JourneyKit when something isn't working. Use when events or contacts aren't arriving, a workflow doesn't start, an email or broadcast doesn't send, signups fail, opens or clicks look wrong, the MCP connection fails, or setup verification fails.
---

# Troubleshoot JourneyKit

Diagnose from evidence, outermost layer first: is the agent connected → do requests reach JourneyKit → are they accepted → is the data what the product meant to send → do workflows react → do emails go out. Call `check_setup` first; its `checks` name the first broken layer. Fix one cause at a time and re-verify with `check_setup` and a fresh `since`.

## MCP connection

| Symptom | Cause and fix |
| --- | --- |
| JourneyKit tools aren't available | The plugin's MCP server isn't connected. Claude Code: `/mcp` → `journeykit` → authenticate. Codex: `codex mcp login journeykit`. Cursor: Settings → MCP → JourneyKit → Connect. |
| "This app was disconnected" / 401 after working before | The connection was removed under Settings → Connected apps, or the token expired. Reconnect. |
| "isn't bound to a workspace" / wrong workspace in `check_setup` | Reconnect and pick the right workspace on the consent screen. |
| "needs the journeykit:write scope" | The connection was granted read-only. Approve the re-authorization prompt, or reconnect and allow changes. |
| "You are no longer a member of this workspace" | The signed-in member was removed from it; they need to be re-invited or connect a different workspace. |

## Nothing arrives (`sdk_traffic` missing)

Work through these in order; each is checkable in the code or the browser.

1. **Script not loaded.** The client module isn't imported anywhere that runs, the key env var is undefined at build time (wrong prefix, e.g. `REACT_APP_` in a Vite app; not rebuilt after adding it), or the code only runs on the server.
2. **Wrong host.** Requests go to the product's own origin (`/api/ingest/...` 404s) instead of `https://journeykit.io`. Pass `host` to `init` explicitly.
3. **CSP.** The console shows "Refused to load the script" or "Refused to connect". Add the JourneyKit host to `script-src` and `connect-src`, including the production CSP.
4. **Blocked by an extension.** Ad and tracking blockers may block `sdk.js`. Verify in a clean profile; the app keeps working either way because the module fails quiet.
5. **Invalid key.** A `401 Invalid or missing API key` from `/api/ingest/*`: the key was revoked, mistyped, or belongs to another workspace. Compare its prefix with `keys.public` in `check_setup`; create a new one with `create_public_key` if needed.

## Contacts arrive, events don't (`track` missing)

- `track` runs before `identify`: the SDK drops it with a console warning `track(...) ignored: call identify() first`. Identify earlier, or move the track call after the session is known.
- Event name rejected (`400 Invalid payload`): names allow letters, digits, `_ . : -`, up to 120 characters.
- `page()` sends nothing before `identify()`: views wait in the browser, so anonymous visits never appear.
- `403 Public keys cannot set event timestamps`: a `timestamp` was sent with a public key. Drop it for live events; only a backfill needs one, sent with a secret key the user sets.

## Server-side events missing

- `JOURNEYKIT_KEY` (or the project's name for it) is unset in that environment: the helper returns silently. It's a public key: set it in the deployment's env or commit it to the project's public config.
- A secret key ended up in front-end code or a commit: replace it with the public key, and tell the user to revoke the secret key under Settings → API keys since it was exposed.
- The serverless function returns before the fetch completes: await it or use `waitUntil`.
- The `userId` differs from the front end's (e.g. email on one side, database id on the other), splitting one person into two contacts. Use the same id everywhere.

## A workflow doesn't start or doesn't send

Read it with `workflows.get`, `workflows.runs` and `workflows.run`.

- The workflow is `paused`: only `active` workflows enter contacts.
- The trigger event name doesn't exactly match what's tracked (`check_setup` → `recent.eventNames`).
- Re-entry is `once` and the contact already went through it.
- The contact came from an import or a bulk newsletter add: those start no workflows.
- The first `check` step excluded the contact, so the run is `exited`.
- An email step `skipped` (no address, or the address is suppressed) or `failed` (a required preset parameter resolved to nothing): `workflows.nudgesForContact` shows which.
- The contact landed in the holdout: the run is `exited` with no steps, by design.

## An email or broadcast doesn't go out

- `broadcasts.send` refused: read its message. The usual causes are a missing postal address (`email.postalAddress.set`) and a broadcast that isn't a `draft`.
- Fewer recipients than expected: `broadcasts.audience` counts contacts with an address minus suppressed ones, and on an issue only active subscribers. A contact with neither a binding value nor a fallback for a `{{key}}` is left out; `broadcasts.messages` shows each recipient's status.
- One person gets nothing: check `email.suppressions.list` (unsubscribed, bounced or complained). Only the person can undo an opt-out from a newsletter. `email.suppressions.remove` needs the user's word and their certainty that the person agreed.
- Sent from the wrong address: `email.domain.get` shows the DNS records, their status and the From header in use. `email.domain.verify` after DNS changes.
- A sent message's content and delivery: `email.history`, `email.message`.

## Signups or lead magnet claims fail

`POST /api/subscribe` answers the same `200` for every accepted outcome, so an opted-out or repeat address still looks like success. Check `newsletters.subscribers` or `leadMagnets.claims` for the record.

| Response | Cause and fix |
| --- | --- |
| `401 Invalid API key` | The key was revoked or mistyped. |
| `404` | The slug is wrong or belongs to another workspace, the newsletter or lead magnet is archived, or a lead magnet has nothing to deliver yet (`ready: false`). |
| `429` | Too many tries from one IP. Wait, or test from elsewhere. |
| `403` or `503` on a hosted form | The bot check failed or isn't configured. SDK calls with a key skip it. |

A hosted page that 404s is off until `newsletters.setPublic` or `leadMagnets.setPublic`; embeds and the SDK work either way. A person who unsubscribed gets a confirmation email instead of being subscribed again.

## Opens and clicks look wrong

- None at all: `email.tracking.get`. With tracking off there are no `email_opened` or `email_clicked` events, and turning it on only affects emails sent from then on.
- Fewer clicks than the mail provider suggests: scanners are counted separately and left out, and a burst of links within 2 seconds is treated as a scanner.
- Opens run high: Apple Mail fetches pixels on the reader's behalf. Weigh clicks and goal events over opens.

## Reporting back

Tell the user the cause you found, the evidence (error text, check result, the line of code), what you changed, and the `check_setup` result after the fix. If the cause is outside the codebase (dashboard settings, production env vars, CSP at the CDN), say exactly what they need to change and where.
