# Publishing

This repository is the single source of truth. Every directory below is fed from it; the MCP server is deployed separately with the JourneyKit app at `https://journeykit.io/api/mcp`.

Before any submission: `node scripts/validate.mjs` and `claude plugin validate .` pass, versions are bumped together, and `CHANGELOG.md` has the release.

## Claude Code

Works today from GitHub: `claude plugin marketplace add JourneyKit/journeykit-plugin`, then `claude plugin install journeykit@journeykit`. Users get updates when the version in `.claude-plugin/plugin.json` changes.

To be listed in Anthropic's plugin directory, submit the repository through the directory submission form linked from the Claude Code docs (Plugins → Publish → Submit to Anthropic's directory). The listing reads `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl` and `termsOfServiceUrl` from `.claude-plugin/plugin.json`.

## ChatGPT and Codex

Works today from GitHub: `codex plugin marketplace add JourneyKit/journeykit-plugin`.

The public directory (shared by ChatGPT and Codex) takes submissions through the OpenAI Platform's plugin submission portal. Prerequisites:

- An OpenAI organization member with **Apps Management** write access, and completed identity verification.
- **Domain verification** for `journeykit.io`: the portal gives a challenge token to serve as plain text at a `.well-known` path on the MCP server's domain — add it as a route in the web app.
- A **reviewer account**: a JourneyKit login without MFA or email codes, in a workspace with sample users, events, a segment, a template and a journey (the emitter app can generate traffic). Credentials go in the portal's form, never in this repo.
- A short **video** of the setup flow end to end.
- Upload a ZIP of this repository (`git archive -o journeykit-plugin.zip HEAD`). The listing comes from `.codex-plugin/plugin.json` → `interface`; `skills/` and `.mcp.json` are discovered from it. The portal scans the MCP server's tools and annotations.

### Test cases for review

Positive:

1. "Set up JourneyKit in this project" in a Next.js app with auth → `check_setup`, `create_public_key`; adds the SDK module, identify on session, reset on logout, `account_created` and one core event; verifies with `check_setup` `since`.
2. "Check whether events are reaching JourneyKit" → `check_setup` with `since`; reports the checklist and which events arrived.
3. "Track when a user upgrades their plan" in a project with a billing webhook → adds a server-side `plan_upgraded` event sent with the public key from `JOURNEYKIT_KEY`; never creates or asks for a secret key.
4. "Draft a journey that emails users who haven't activated 3 days after sign-up" → reads stages and event names (`search_tools`, `execute_tool` on `userProperties.list`, `events.names`), creates a template and a draft journey, and does not activate it.
5. "Onboard this project to JourneyKit" (or `/journeykit:onboard`) → reads the codebase, proposes one plan, then creates user properties, event definitions, branding, templates (from `body`) and draft journeys, wires identify/track, and verifies with `check_setup`.
6. "How did activation do over the last 30 days?" → `funnel.stages` / `metrics.series`; answers with window and denominators.

Negative:

1. "Create a secret API key and put it in my .env" → declines to create secret keys; writes the variable name and points to Settings → API keys.
2. "Turn on every journey" without naming them → lists the journeys and asks for explicit confirmation before `journeys.setStatus`.
3. "What's the weather in Berlin?" → not a JourneyKit task; no JourneyKit tools are called.

## Cursor

Submit the public repository at `cursor.com/marketplace/publish`. Cursor loads it through the Agent Plugins manifest (`plugin.json` + `mcp.json` + `skills/`). Their checklist: valid manifest, unique kebab-case name, description, valid skill frontmatter, relative paths, a README that documents configuration — all covered by `scripts/validate.mjs`.

## Other agents

Anything that supports the [Agent Plugins](https://agent-plugins.org) format loads the repository as is. Skill-only installers (`npx skills add JourneyKit/journeykit-plugin`) take `skills/`; the MCP server is then added by URL.
