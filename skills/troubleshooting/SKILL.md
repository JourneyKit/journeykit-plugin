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

## Nothing arrives (`key_used` missing)

JourneyKit has no browser SDK; all events come from the backend. Work through these in order.

1. **No key.** `check_setup` lists none: the user creates one under Settings → API keys (`urls.apiKeys`) and sets it in the backend's environment.
2. **The key isn't set where the code runs.** The helper returns silently without it. Check the deployment's environment, not just the local `.env`.
3. **Old browser code.** The project still loads `@journeykit.io/browser-sdk` or `sdk.js` with a `jk_pub_` key. That SDK and public keys were removed and the calls are refused with `401`. Delete them and send the same events from the backend.
4. **Wrong URL.** Requests go to the product's own origin (`/api/ingest/...` 404s) instead of `urls.ingest`.
5. **Invalid key.** A `401 Invalid or missing API key`: the key was revoked, mistyped, or belongs to another workspace. Compare its prefix with `keys` in `check_setup`.
6. **The code never runs.** The helper isn't called from the handler that does the work, or the serverless function returns before the request leaves: await it or use `waitUntil`.

## Contacts arrive, events don't (`track` missing)

- Event name rejected (`400 Invalid payload`): names allow letters, digits, `_ . : -`, up to 120 characters.
- The `contactId` on track differs from the one on identify (e.g. email on one side, database id on the other), splitting one person into two contacts. Use the same id everywhere.
- The call sits before the work succeeds, or in a branch that doesn't run: read the handler.

## Server-side events missing

- A key in front-end code or a commit: remove it, move it to the backend's environment, and tell the user to revoke it under Settings → API keys and create a new one, since it was exposed.
- The serverless function returns before the fetch completes: await it or use `waitUntil`.

## A workflow doesn't start or doesn't send

Read it with `workflows_get`, `workflows_runs` and `workflows_run`.

- The workflow is `paused`: only `active` workflows enter contacts.
- The trigger event name doesn't exactly match what's tracked (`check_setup` → `recent.eventNames`).
- Re-entry is `once` and the contact already went through it.
- The contact came from an import or a bulk list add: those start no workflows.
- The first `check` step excluded the contact, so the run is `exited`.
- An email step `skipped` (no address, or the address is suppressed) or `failed` (a required preset parameter resolved to nothing): `workflows_nudges_for_contact` shows which.
- The contact landed in the holdout: the run is `exited` with no steps, by design.

## An email or broadcast doesn't go out

- `broadcasts_send` refused: read its message. The usual causes are a missing postal address (`email_postal_address_set`) and a broadcast that isn't a `draft`.
- Fewer recipients than expected: `broadcasts_audience` counts contacts with an address minus suppressed ones, and on an issue only active members (`confirmedOnly` also drops those who never clicked). A contact with neither a binding value nor a fallback for a `{{key}}` is left out; `broadcasts_messages` shows each recipient's status.
- One person gets nothing: check `email_suppressions_list` (unsubscribed, bounced or complained). Only the person can undo an opt-out from a list. A member who is `pending` (a signup on a list that requires confirmation) gets nothing until they click the confirmation link: check `lists_subscribers` with `status: "pending"`, that the list's confirmation workflow is active (`lists_get` → `confirmationReady`), and its runs with `workflows_runs`. `email_suppressions_remove` needs the user's word and their certainty that the person agreed.
- Sent from the wrong address: `email_domain_get` shows the DNS records, their status and the From header in use. `email_domain_verify` after DNS changes.
- A sent message's content and delivery: `email_history`, `email_message`.

## Signups or lead magnet claims fail

`POST /api/subscribe` answers the same `200` for every accepted outcome, so an opted-out or repeat address still looks like success. Check `lists_subscribers` (a new signup on a list that requires confirmation is `pending`) or `lead_magnets_claims` for the record.

| Response | Cause and fix |
| --- | --- |
| `401 Invalid API key` | The key was revoked or mistyped. |
| `404` | The slug is wrong or belongs to another workspace, the list or lead magnet is archived, or a lead magnet has nothing to deliver yet (`ready: false`). |
| `429` | Too many tries from one IP. Wait, or test from elsewhere. |
| `403` or `503` on a hosted form | The bot check failed or isn't configured. Backend calls with a key skip it. |

A hosted page that 404s is off until `lists_set_public` or `lead_magnets_set_public`; embeds work either way. A person who unsubscribed gets a confirmation email instead of being subscribed again.

## Opens and clicks look wrong

- None at all: `email_tracking_get`. With tracking off there are no `email_opened` or `email_clicked` events, and turning it on only affects emails sent from then on.
- Fewer clicks than the mail provider suggests: scanners are counted separately and left out, and a burst of links within 2 seconds is treated as a scanner.
- Opens run high: Apple Mail fetches pixels on the reader's behalf. Weigh clicks and goal events over opens.

## Reporting back

Tell the user the cause you found, the evidence (error text, check result, the line of code), what you changed, and the `check_setup` result after the fix. If the cause is outside the codebase (dashboard settings, production env vars, CSP at the CDN), say exactly what they need to change and where.
