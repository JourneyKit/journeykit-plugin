# Publishing

This repository is the single source of truth. Every directory below is fed from it; the MCP server is deployed separately with the JourneyKit app at `https://journeykit.io/api/mcp`.

Before any submission: `node scripts/validate.mjs` and `claude plugin validate . --profile directory --strict` pass, versions are bumped together, and `CHANGELOG.md` has the release. The skills teach the SDK as it is in the app repo, so publish `@journeykit.io/browser-sdk` from `packages/browser-sdk` first whenever its calls changed.

## Claude Code

Works today from GitHub: `claude plugin marketplace add JourneyKit/journeykit-plugin`, then `claude plugin install journeykit@journeykit`. Users get updates when the version in `.claude-plugin/plugin.json` changes.

### Anthropic's directory

One listing reaches claude.ai, Cowork and Claude Code, where it loads as `journeykit@synced`. There is no separate Claude Marketplace submission, and `claude-plugins-official` doesn't take submissions through the portal. Make two submissions from [claude.ai/directory/manage](https://claude.ai/directory/manage), both from the organization that should own the listing long term: the first organization to submit a repository folder keeps it. Submitting needs a paid plan, and an Owner on Team or Enterprise.

**1. MCP connector** (Submit new → MCP connector), for `https://journeykit.io/api/mcp`:

- A **reviewer account**, as for OpenAI below: a fully populated workspace, with credentials entered only in the portal.
- Every tool run once from a custom connector in Claude or MCP Inspector. The portal asks you to confirm this.
- Universal URL, and sign-in through the server's own CIMD and dynamic registration, so no client goes in the portal.
- Documentation `https://docs.journeykit.io/docs/mcp`, privacy `https://journeykit.io/privacy`, and the logo from the `assets` folder as the icon. The slug is permanent once published.

**2. Plugin bundle** (Submit new → Plugin bundle), for `JourneyKit/journeykit-plugin` at the root, tracking `main`:

- Select **Validate**, fix anything marked Blocking, push, and select **Re-validate**. The portal runs rules the CLI doesn't, including name availability.
- Listing details come from `plugin.json` and the README, so change them there.
- Answer the data handling questions to match "Data and network access" in the README.
- Pair the bundle with the connector once both are in.

A person reviews a new listing. A version that passes still needs **Publish** on its page. After that, raise `version` and merge to `main`: each commit is scanned and published from the portal, with no new submission. Installs from this repository keep working alongside the listing.

The rules are in the [plugin checklist](https://claude.com/docs/plugins/pre-submission-checklist) and the [connector checklist](https://claude.com/docs/connectors/building/review-criteria). Keep images out of backticks and code blocks and show them with Markdown image syntax, or a version is held for a reviewer.

## ChatGPT and Codex

The public [submission portal](https://platform.openai.com/plugins) publishes one listing shared by ChatGPT and Codex. Repository installs remain available through `codex plugin marketplace add JourneyKit/journeykit-plugin`.

### Prepare the package

Run `node scripts/validate.mjs` and `claude plugin validate . --profile directory --strict`, then `node scripts/package-openai.mjs`. The package command writes `dist/journeykit-<version>-openai.zip`, with the root portable `plugin.json`, `mcp.json`, skills, assets and license. It excludes credentials, repository metadata and other marketplace manifests.

OpenAI reads listing metadata, onboarding and review cases from `plugin.json` under `extensions.com.openai`; the root extension takes precedence over the Codex compatibility manifest. MCP configuration comes from portable `mcp.json`, with OAuth and CIMD declared under the server's OpenAI extension. Never include credentials in either manifest or the ZIP.

### Connect and verify

1. Sign in to the portal, select the owning organization and project, and complete individual or business verification. Organization owners can submit; other members need Apps Management Write.
2. Upload the ZIP with its MCP included from the first submission. Adding MCP later to an existing skills-only listing is not supported.
3. For domain verification, copy the exact portal challenge into the web app's `OPENAI_APPS_CHALLENGE` environment variable and deploy it. Verify that the portal's exact challenge URL returns only that token as plain text. The app handles `/.well-known/openai-apps-challenge`; it returns 404 until configured.
4. Connect `https://journeykit.io/api/mcp` with OAuth, complete consent for the reviewer workspace, and resolve metadata, skills and tool-scan findings. The server must expose each operation as a separate tool with explicit boolean read-only, destructive and open-world annotations.

### Reviewer access and evaluation

Use a dedicated JourneyKit account and workspace with sample contacts, signup and activation events, contact fields, an email preset, a paused welcome workflow with report data, and sample newsletter data. Include an email branding postal address. Use only controlled sample recipients and keep sends disabled. The account must work without MFA approval, email codes or private-network access. Enter the login URL, workspace details, credentials and sign-in instructions only in the secure portal.

The authoritative **five positive and three negative cases** are in `plugin.json` → `extensions.com.openai.review.test_cases`. Run every case through the installed plugin in the supported ChatGPT and Codex surfaces using that reviewer account. The workflow case includes an explicit proposal-approval step; approve the draft, not activation. Do not describe metadata validation or direct API smoke checks as successful conversational evaluations.

Record an accessible video showing those cases and the plugin's behavior. Add its real URL as `extensions.com.openai.review.demo_recording_url` and rebuild the ZIP, or enter it in the portal if the field is editable. No recording URL is supplied until a real recording exists.

### Submit and publish

Upload the final package, resolve required findings and save reviewer access. Complete the policy attestations and submit for review. After approval, select Publish plugin. Metadata or skill changes need a new ZIP; hosted tool updates are scanned separately.

See the [submission guide](https://developers.openai.com/plugins/deploy/submission) and [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines).

## Cursor

Submit the public repository at `cursor.com/marketplace/publish`. Cursor loads it through the Agent Plugins manifest (`plugin.json` + `mcp.json` + `skills/`). Their checklist: valid manifest, unique kebab-case name, description, valid skill frontmatter, relative paths, a README that documents configuration. All are covered by `scripts/validate.mjs`.

## Other agents

Anything that supports the [Agent Plugins](https://agent-plugins.org) format loads the repository as is. Skill-only installers (`npx skills add JourneyKit/journeykit-plugin`) take `skills/`; the MCP server is then added by URL.
