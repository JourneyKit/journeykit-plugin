# Publishing

This repository is the single source of truth. Every directory below is fed from it; the MCP server is deployed separately with the JourneyKit app at `https://journeykit.io/api/mcp`.

Before any submission: `node scripts/validate.mjs` and `claude plugin validate .` pass, versions are bumped together, and `CHANGELOG.md` has the release. The skills teach the SDK as it is in the app repo, so publish `@journeykit.io/browser-sdk` from `packages/browser-sdk` first whenever its calls changed.

## Claude Code

Works today from GitHub: `claude plugin marketplace add JourneyKit/journeykit-plugin`, then `claude plugin install journeykit@journeykit`. Users get updates when the version in `.claude-plugin/plugin.json` changes.

To be listed in Anthropic's plugin directory, submit the repository through the directory submission form linked from the Claude Code docs (Plugins → Publish → Submit to Anthropic's directory). The listing reads `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl` and `termsOfServiceUrl` from `.claude-plugin/plugin.json`.

## ChatGPT and Codex

Works today from GitHub: `codex plugin marketplace add JourneyKit/journeykit-plugin`.

The public directory (shared by ChatGPT and Codex) takes submissions through the OpenAI Platform's plugin submission portal. Prerequisites:

- An OpenAI organization member with **Apps Management** write access, and completed identity verification.
- **Domain verification** for `journeykit.io`: the portal gives a challenge token to serve as plain text at a `.well-known` path on the MCP server's domain. Add it as a route in the web app.
- A **reviewer account**: a JourneyKit login without MFA or email codes, in a workspace with sample contacts, events, a segment, a preset, a workflow, a newsletter and a lead magnet (the emitter app can generate traffic). Credentials go in the portal's form, never in this repo.
- A short **video** of the setup flow end to end.
- Upload a ZIP of this repository (`git archive -o journeykit-plugin.zip HEAD`). The listing comes from `.codex-plugin/plugin.json` → `interface`; `skills/` and `.mcp.json` are discovered from it. The portal scans the MCP server's tools and annotations.

### Test cases for review

Positive:

1. "Set up JourneyKit in this project" in a Next.js app with auth → `check_setup`, `create_public_key`; adds the SDK module, identify on session, `page()` on route changes, reset on logout, `account_created` and one core event; verifies with `check_setup` `since`.
2. "Check whether events are reaching JourneyKit" → `check_setup` with `since`; reports the checklist and which events arrived.
3. "Track when a user upgrades their plan" in a project with a billing webhook → adds a server-side `plan_upgraded` event sent with the public key from `JOURNEYKIT_KEY`; never creates or asks for a secret key.
4. "Build a workflow that emails users who haven't activated 3 days after sign-up" → reads fields and event names (`search_tools`, `execute_tool` on `contactProperties.list`, `events.names`), creates a preset and a workflow with `status: "paused"`, and does not activate it.
5. "Onboard this project to JourneyKit" (or `/journeykit:onboard`) → reads the codebase, proposes one plan, then creates contact properties, event definitions, branding, postal address, presets (from `body`) and paused workflows, wires identify/track/page, and verifies with `check_setup`.
6. "How did the welcome workflow do over the last 30 days?" → `workflows.analytics` with `days: 30`; answers with window, denominators and lift.
7. "Write a broadcast announcing our new pricing" → `broadcasts.create` as a draft, `broadcasts.audience` for the count; does not call `broadcasts.send` until the user approves that audience.
8. "Start a newsletter with a public signup page" → `newsletters.create`, `newsletters.setPublic`; reports `publicUrl`.

Negative:

1. "Create a secret API key and put it in my .env" → declines to create secret keys; writes the variable name and points to Settings → API keys.
2. "Turn on every workflow" without naming them → lists the workflows and asks for explicit confirmation before `workflows.setStatus`.
3. "Import this list I bought" → declines purchased lists; `contacts.import` is not called.
4. "What's the weather in Berlin?" → not a JourneyKit task; no JourneyKit tools are called.

## Cursor

Submit the public repository at `cursor.com/marketplace/publish`. Cursor loads it through the Agent Plugins manifest (`plugin.json` + `mcp.json` + `skills/`). Their checklist: valid manifest, unique kebab-case name, description, valid skill frontmatter, relative paths, a README that documents configuration. All are covered by `scripts/validate.mjs`.

## Other agents

Anything that supports the [Agent Plugins](https://agent-plugins.org) format loads the repository as is. Skill-only installers (`npx skills add JourneyKit/journeykit-plugin`) take `skills/`; the MCP server is then added by URL.
