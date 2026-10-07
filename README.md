<p align="center"><img src="assets/logo.png" width="72" alt="JourneyKit"></p>

# JourneyKit plugin

Set up [JourneyKit](https://journeykit.io) by asking your coding agent. Install the plugin once, open your project, and run `/journeykit:onboard` (or say "Onboard this project to JourneyKit.").

The agent connects to your JourneyKit workspace (you sign in once in the browser), reads your codebase, defines your user fields and event types in JourneyKit, adds the SDK and the tracking calls, matches your email branding to your product, writes email templates and drafts journeys that react to your events — then checks that data really arrives and tells you what it changed. Journeys stay drafts until you switch them on.

In Claude Code, one command installs the plugin and starts onboarding:

```bash
claude plugin marketplace add JourneyKit/journeykit-plugin && claude plugin install journeykit@journeykit && claude "/journeykit:onboard"
```

## Install

**Claude Code**

```bash
claude plugin marketplace add JourneyKit/journeykit-plugin
claude plugin install journeykit@journeykit
```

**Codex**

```bash
codex plugin marketplace add JourneyKit/journeykit-plugin
```

Then open `/plugins` in Codex and install **JourneyKit**.

**Cursor**

Install **JourneyKit** from the Marketplace (Customize → Plugins), or from this repo:

```bash
git clone https://github.com/JourneyKit/journeykit-plugin ~/.cursor/plugins/local/journeykit
```

Then run **Developer: Reload Window**.

**Other agents**

Add the MCP server `https://journeykit.io/api/mcp` (streamable HTTP, OAuth) and the skills from `skills/` the way your agent installs them, e.g. `npx skills add JourneyKit/journeykit-plugin`.

The first time the agent uses JourneyKit, a browser window opens: sign in, pick the workspace, allow access. Disconnect any time under **Settings → AI assistants**.

## What you can ask

| Say | The agent |
| --- | --- |
| "Onboard this project to JourneyKit." | The full first-time setup: fields, events, tracking code, branding, templates and draft journeys. |
| "Track when a user upgrades their plan." | Adds the event where it happens, server-side if that's where it's visible. |
| "Events aren't showing up in JourneyKit." | Diagnoses the install layer by layer and fixes it. |
| "Draft a journey that nudges users who haven't activated after 3 days." | Builds the segment, email and journey as a draft, for you to switch on. |
| "How did activation do last month?" | Answers from your workspace's funnel and metrics. |

## Safety

- The agent only ever creates **public** keys (`jk_pub_…`), which can only identify users and track events — safe in front-end code, commits and server env; your browser and backend both send with it. **Secret** keys (`jk_live_…`) are only needed to backfill history, and are created by you under **Settings → API keys**.
- Existing configuration is never overwritten without asking.
- Journeys are created as drafts. Turning one on, and deleting anything, happens only when you say so.

## What's inside

```text
skills/
  onboard/          set up from the codebase: fields, events, tracking, branding, emails, journeys
  troubleshooting/  diagnose missing data, connection and journey problems
  journeys/         build segments, emails and journeys; answer lifecycle questions
.mcp.json           MCP server for Claude Code and Codex
mcp.json            MCP server, Agent Plugins format (Cursor and others)
plugin.json         Agent Plugins manifest
.claude-plugin/     Claude Code manifest and marketplace
.codex-plugin/      Codex manifest and directory listing
.agents/plugins/    Codex marketplace
```

Skills tell the agent *how* to do the work; the MCP server at `https://journeykit.io/api/mcp` gives it the *tools*: `check_setup` and `create_public_key` for installation, and `search_tools` / `describe_tools` / `execute_tool` over the whole [JourneyKit API](https://docs.journeykit.io/docs/reference). See the [MCP docs](https://docs.journeykit.io/docs/mcp).

## Development

```bash
node scripts/validate.mjs            # manifests, MCP configs and skills agree
claude plugin validate .             # Claude Code's own validator
claude --plugin-dir .                # try the plugin locally in Claude Code
```

Bump `version` in `plugin.json`, `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` together (the validator checks), and add a line to [CHANGELOG.md](CHANGELOG.md). Publishing to the agent directories is described in [PUBLISHING.md](PUBLISHING.md).

## License

MIT
