![JourneyKit](assets/logo.svg)

# JourneyKit plugin

Set up [JourneyKit](https://journeykit.io) by asking your coding agent. Install the plugin once, open your project, and run `/journeykit:onboard` (or say "Onboard this project to JourneyKit.").

The agent connects to your JourneyKit workspace (you sign in once in the browser), reads your codebase, defines your contact fields and event types in JourneyKit, adds the tracking calls to your backend, matches your email branding to your product, sets up your sender, writes emails and builds automations that react to your events. Then it checks that data really arrives and tells you what it changed. Automations stay paused until you switch them on.

After that, the same agent runs your email: broadcasts, newsletters and waitlists, lead magnets, list imports and reports.

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

The first time the agent uses JourneyKit, a browser window opens: sign in, pick the workspace, allow access. Disconnect any time under **Settings → Connected apps**.

## What you can ask

| Say | The agent |
| --- | --- |
| "Onboard this project to JourneyKit." | The full first-time setup: fields, events, tracking code, branding, sender, emails and paused automations. |
| "Track when a user upgrades their plan." | Adds the event where it happens, server-side if that's where it's visible. |
| "Events aren't showing up in JourneyKit." | Diagnoses the install layer by layer and fixes it. |
| "Build an automation that nudges users who haven't activated after 3 days." | Builds the segment, email and automation, paused, for you to switch on. |
| "Make a trial ending email from your templates." | Starts from a ready-made template or blocks in your branding, rewrites it for your product and saves it as an email you can edit. |
| "Announce the new pricing to everyone on a paid plan." | Writes the broadcast, shows you the audience size, and sends only on your word. |
| "Start a monthly newsletter with a signup page." | Creates the list, turns on its public page and adds the form to your site. |
| "Give away our launch checklist for an email address." | Sets up the lead magnet, its form and the delivery email. |
| "Import this CSV of subscribers." | Imports the list, keeps opt-outs out, and starts no workflows. |
| "How did the welcome automation do last month?" | Answers from your automation reports and metrics, with lift against the holdout. |

## Safety

- JourneyKit has no browser SDK and no public keys. Your backend sends contacts and events with a workspace API key (`jk_live_…`), which can do everything, so it stays in your server environment, never in front-end code or a commit. You create it yourself under **Settings → API keys**; the agent can't create keys and never needs you to paste one into the chat.
- Existing configuration is never overwritten without asking.
- Automations are created paused. Turning one on, sending a broadcast or issue, and deleting or archiving anything happen only when you say so.

## Data and network access

The plugin is skills and one MCP server. It has no hooks, scripts or local server, and it collects no telemetry of its own.

- **Connection:** the plugin's one server is `https://journeykit.io/api/mcp`. You sign in with OAuth and pick one workspace, and the agent gets read and write access to that workspace only. During `onboard` the agent may also open your own live site to read your branding.
- **What's sent to JourneyKit:** what the work needs: event and field names taken from your code, branding such as colors and your logo URL, email copy, and whatever you ask it to create or import, including contact lists. Your source code itself isn't uploaded.
- **What's read back:** workspace data you ask about, such as contacts, reports and setup status. Contact records are personal data and enter the conversation with your agent when it reads them.
- **Changes to your project:** `onboard` adds a small backend helper and tracking calls, which then send your contacts and events to JourneyKit from your own server. No client-side script is added.

See the [privacy policy](https://journeykit.io/privacy) and [terms](https://journeykit.io/terms). Disconnect any time under **Settings → Connected apps**.

## What's inside

```text
skills/
  onboard/          set up from the codebase: fields, events, tracking, branding, sender, emails, workflows
  workflows/        build segments, presets and workflows; answer questions from your reports
  emails/           write emails from ready-made templates and blocks
  campaigns/        broadcasts, lists, lead magnets and contact imports
  troubleshooting/  diagnose missing data, connection, workflow, sending and signup problems
.mcp.json           MCP server for Claude Code and Codex
mcp.json            MCP server, Agent Plugins format (Cursor and others)
plugin.json         Agent Plugins manifest
.claude-plugin/     Claude Code manifest and marketplace
.codex-plugin/      Codex manifest and directory listing
.agents/plugins/    Codex marketplace
```

Skills tell the agent *how* to do the work; the MCP server at `https://journeykit.io/api/mcp` gives it the *tools*: `check_setup` for installation, and one tool for each operation of the [JourneyKit API](https://docs.journeykit.io/docs/reference), such as `contacts_list` and `workflows_create`. See the [MCP docs](https://docs.journeykit.io/docs/mcp).

## Development

```bash
claude plugin validate . --profile directory --strict  # Claude Code's validator, with the directory rules
claude --plugin-dir .                # try the plugin locally in Claude Code
```

Bump `version` in `plugin.json`, `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` together, and add a line to [CHANGELOG.md](CHANGELOG.md). Publishing to the agent directories is described in [PUBLISHING.md](PUBLISHING.md).

## License

MIT
