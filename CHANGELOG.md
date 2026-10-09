# Changelog

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
