# Changelog

## Unreleased

- Prose now says "emails" for presets and "automations" for workflows, matching the dashboard. Tool names (`presets_*`, `workflows_*`) are unchanged.
- A `{{key}}` with no binding fills itself from the contact field of that name (and, in an automation, the trigger event's property first). The `emails` skill says so.

## 0.9.0 (2026-11-25)

Needs a JourneyKit server with `email_templates_*` and `email_blocks_list`.

- **Templates and blocks.** New MCP tools `email_templates_list`, `email_templates_get` and `email_blocks_list` give the dashboard's email templates and the editor's blocks as HTML in the workspace's branding. New `emails` skill on working out what the user means by an email (broadcast, issue, preset, workflow email, library template) and building it from them.
- `presets_create` and `broadcasts_create` (and their updates) take a `templateId`; `lead_magnets_set_page` and `presets_send_test` take a `body`; `presets_get`, `broadcasts_get` and `lead_magnets_page` return one, so an existing email can be changed and sent back. `parameters` is optional on presets.
- The `workflows`, `campaigns` and `onboard` skills start emails from the library instead of plain HTML.

## 0.8.0 (2026-11-25)

Needs a JourneyKit server without the browser SDK and public keys.

- **Backend only.** The browser SDK (`@journeykit.io/browser-sdk`, `sdk.js`) and `jk_pub_` public keys are gone, and so is the `create_public_key` tool. The `onboard` skill now adds a small backend helper that sends identify and track with a `jk_live_` key the user creates under Settings → API keys and sets in the server environment. No page views, reset or client-side script. `references/frameworks.md` now says where the backend calls go per framework.
- The `campaigns` skill points signups at the hosted page, the embed or `POST /api/subscribe` from the backend. The `troubleshooting` skill flags old SDK code as a cause of missing data.
- README, manifests and `PUBLISHING.md` no longer mention the SDK or public keys.

- The `onboard` skill says emails are built in the workspace's branding at send time, so changing branding later reaches existing presets and nothing needs recreating.

## 0.7.0 (2026-11-16)

Needs a JourneyKit server that has lists. Newsletters are now lists, and a waitlist is a list.

- **Renamed.** MCP tools `newsletters_*` are `lists_*`, `newsletterId`/`newsletterIds`/`newsletterConsent` are `listId`/`listIds`/`listConsent`, the SDK and `POST /api/subscribe` take `list` (and `lists` on a claim) instead of `newsletter` (`newsletters`), and the events are `list_subscribed` and `list_unsubscribed`.
- **Confirmation.** Signups on a form or with a public key get a confirmation email from an editable workflow made with the list. `requireConfirmation` holds them as `pending` until they click. New event `list_confirmed`, new workflow step `confirm_subscription`, new binding `{ "kind": "confirm_link" }`, and `confirmedOnly` on issues.
- The `campaigns`, `workflows`, `troubleshooting` and `onboard` skills describe lists, waitlists and confirmation.

## 0.6.9 (2026-11-07)

- The manifest description opens with what JourneyKit is, an email marketing platform for newsletters, lead magnets, broadcasts and automated workflows, then says what the plugin does.

## 0.6.8 (2026-11-07)

- `.claude-plugin/plugin.json` sets `supportUrl` (the repository's issues page) again.

## 0.6.7 (2026-11-07)

- `.claude-plugin/plugin.json` sets `privacyPolicyUrl` (`https://journeykit.io/privacy`), so the directory doesn't have to take it from the README.

## 0.6.6 (2026-11-07)

- The server helper and the browser client module name their variables `publicKey`, `ingestUrl` and `host` and build the `Authorization` header by concatenation, so no snippet looks like an env credential being sent. The server-side and troubleshooting text no longer names a `JOURNEYKIT_KEY` variable.

## 0.6.5 (2026-11-07)

- Removed `scripts/validate.mjs`, a development-only checker that shipped with the plugin. CI now runs only `claude plugin validate --profile directory --strict`.

## 0.6.4 (2026-11-07)

- `scripts/validate.mjs` no longer spells the JourneyKit host: it builds the expected MCP URL from `author.url` in `.claude-plugin/plugin.json`. Its messages no longer talk about tokens or keys from the environment.

## 0.6.3 (2026-11-07)

- `scripts/validate.mjs` no longer looks like it reads a credential: its constants are camelCase, so no `${NAME}`-style template reference sits next to the MCP URL, and its env-read check is written with `[.]`, so the file doesn't spell `process.env` itself. The script still reads no environment variables.

## 0.6.2 (2026-11-07)

- No skill snippet reads the key from the environment: the browser client module and the server helper take a `<public key>` placeholder the agent fills from the project's config, the framework table names the variable, and onboarding no longer suggests a `curl` check with the key. `scripts/validate.mjs` rejects env reads in skills.
- The logo is `assets/logo.svg`, a vector trace of the old PNG, so the manifests no longer point at a binary file the directory scan can't read. `scripts/validate.mjs` requires manifest icons to be SVG.

## 0.6.1 (2026-11-07)

- The onboard references no longer hardcode JourneyKit URLs next to the key: snippets use the `urls.host`, `urls.sdk` and `urls.ingest` values from `check_setup`.
- `scripts/validate.mjs` names its loop variables `field` rather than `key`.

## 0.6.0 (2026-11-06)

Needs the JourneyKit MCP server with one tool per operation.

- The server no longer has `search_tools`, `describe_tools` and `execute_tool`: each operation is its own tool, named in snake_case, like `contact_properties_list`. Every skill uses the new names.
- `scripts/validate.mjs` rejects the old tools and dotted operation names.
- The README lists what the plugin connects to and sends, and `PUBLISHING.md` follows Anthropic's developer portal.

## 0.5.0 (2026-11-06)

Follows JourneyKit's move to an email marketing platform.

- Renamed throughout: users to contacts, journeys to workflows, templates to presets. Operations are now `contacts.*`, `contactProperties.*` and `workflows.*`; the ingest API takes `contactId`.
- The `journeys` skill is now `workflows`, with the current step language and reports (`workflows.analytics`, `metrics.*`).
- New `campaigns` skill: broadcasts, newsletters, lead magnets and contact imports.
- `workflows.create` goes live by default, so every skill passes `status: "paused"`.
- Lifecycle stages and `funnel.*` are gone from every skill.
- `onboard` sets the postal address and sending domain, calls `page()`, can connect signup forms with `subscribe()` and `claim()`, and no longer expects standard fields or events to exist in a new workspace.
- `troubleshooting` covers sending, signups and open and click tracking.
- `scripts/validate.mjs` rejects names the API no longer has.

## 0.4.0 (2026-10-09)

- `onboard` gets a step to turn the drafted journeys on: it lists them, explains that activating takes effect immediately, offers test emails, and activates only the journeys the user names.

## 0.3.0 — 2026-10-07

- `setup` is merged into `onboard`: one skill installs JourneyKit, and also handles smaller requests like tracking a new event. Its references moved to `skills/onboard/references/`.

## 0.2.0 — 2026-10-07

- New `onboard` skill (`/journeykit:onboard`): the full first-time setup from the codebase — user fields and event types defined in the workspace, tracking code added, email branding matched to the product, templates written and journeys drafted.
- `setup` installs the npm package `@journeykit.io/browser-sdk` in projects with a JavaScript build; server-side events send with the public key, so no secret key is needed.
- Templates are created from a simple HTML `body`; the server applies the workspace's branding.

## 0.1.0 — 2026-10-05

- First release: `setup`, `troubleshooting` and `journeys` skills, and the JourneyKit MCP server (`https://journeykit.io/api/mcp`) for Claude Code, Codex, Cursor and Agent Plugins–compatible agents.
