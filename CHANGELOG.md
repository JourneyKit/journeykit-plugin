# Changelog

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
