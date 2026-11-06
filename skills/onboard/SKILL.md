---
name: onboard
description: Onboard a product to JourneyKit from its codebase. Defines contact fields and event types in the workspace, installs the SDK with identify, track and page calls, matches email branding to the product, sets up the sender, writes email presets and builds paused workflows. Use when the user runs /journeykit:onboard, asks to onboard, set up, install or integrate JourneyKit, or asks to track a new event with JourneyKit.
---

# Onboard a product to JourneyKit

You turn a codebase into a working JourneyKit workspace in one pass. You read the product, decide what to measure and what to send, make the workspace match (fields, events, branding, sender, presets, workflows), and wire the code. The user approves one plan; everything else is your job.

**Smaller requests.** When JourneyKit is already installed and the user only wants tracking added ("track when a user upgrades"), or only wants the SDK, do just the parts that apply: step 1, the relevant parts of step 2, a plan scoped to the request, the matching parts of steps 5–6, and step 9. Skip branding, sender, presets and workflows unless asked.

Everything in the workspace goes through the JourneyKit MCP server: `check_setup` and `create_public_key`, and `search_tools` → `describe_tools` → `execute_tool` for the rest of the API. Always `describe_tools` an operation before its first `execute_tool`: the schema is the contract, this file only names operations.

## Ground rules

- **One key, created by you.** Call `create_public_key` once. A public key (`jk_pub_…`) can only identify, track and sign people up, so it is safe in front-end code, in commits and in server env. The browser SDK and backend calls both use it. Never create, ask for or handle a secret key (`jk_live_…`); it is only needed to backfill history with timestamps, and the user creates that themselves.
- **Reuse before creating.** The workspace may not be empty. Match existing fields, event definitions, presets and workflows by key/name and update or skip them; never create duplicates. The same goes for the codebase: if it already has JourneyKit code, a key or env vars, show the user what's there and ask before replacing anything.
- **Nothing reaches contacts without the user.** A workflow with steps goes live on creation unless told otherwise, so every `workflows.create` passes `status: "paused"`. Activating a workflow (`workflows.setStatus`), sending a test email and deleting anything happen only when the user says so.
- **The project's conventions win.** Package manager, env-var naming, file layout, code style. If it already wraps another analytics tool (Segment, PostHog, Amplitude, a `track()` helper), add JourneyKit inside that wrapper instead of sprinkling new calls.
- **Personal data stays minimal.** Never send passwords, tokens, payment details or free-text content. `email` and `name` are built in; send other personal fields only when a workflow or segment needs them.

## Step 1: Connect and read the workspace

1. `check_setup`. If the tools are missing or unauthorized, ask the user to connect (Claude Code: `/mcp` → `journeykit` → authenticate; Codex: `codex mcp login journeykit`; Cursor: Settings → MCP → JourneyKit → Connect) and retry. Tell the user which workspace you're connected to; if it's the wrong one, they reconnect and pick another on the consent screen.
   If they can't connect, continue in *manual mode* with just the code: the user creates a public key under Settings → API keys and pastes it to you (a public key is fine to paste), the host is `https://journeykit.io`, workspace changes (fields, events, branding, sender, presets, workflows) are listed in the report for the user to make, and verification becomes "check Contacts in the dashboard".
2. Read what exists: `contactProperties.list`, `eventDefinitions.list`, `email.branding.get`, `email.branding.presets`, `presets.list`, `workflows.list`, `email.domain.get`, `email.postalAddress.get`.

Done when: you know the workspace, its key prefixes, its sender, and what's already defined.

## Step 2: Understand the product

Read, don't guess. In roughly this order:

1. **What it is.** README, landing/marketing pages, `package.json`/`pyproject`/`Gemfile` metadata, page titles and meta descriptions. Write yourself a two-sentence summary: who uses it and the outcome they come for.
2. **The contact model.** The users table/model/schema (Prisma, Drizzle, ActiveRecord, Django models, SQL migrations…) and the tables hanging off it (accounts, workspaces, subscriptions). Note each column, its type and enum values.
3. **Auth.** Where sign-up completes, where the signed-in user becomes known on the client, where logout happens. The contact id is the product's stable user id, never the email.
4. **What users do.** Routes, API handlers, server actions, mutations, form submits, background jobs and billing webhooks. List the actions that create or change something meaningful, with file and line.
5. **Brand.** The website URL (README, `homepage`, `metadataBase`, `og:url`, env such as `APP_URL`), the logo (`public/`, `assets/`, favicon/apple-touch-icon, an `<svg>` logo component), theme colours (Tailwind theme, CSS variables like `--primary`, design tokens), fonts and corner radius. If you can fetch the live site, use it too.
6. **Audience touchpoints.** Marketing pages to call `page()` on, and any newsletter, waitlist or "get the guide" forms that could use `subscribe()` or `claim()`.
7. **Stack.** Front-end framework and entry point, back-end language, package manager, env-var convention for public client config (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, …) and where examples live (`.env.example`), type-check/build/lint scripts, Content-Security-Policy (headers config, middleware, `<meta http-equiv>`).
8. **Existing JourneyKit code and analytics.** Search for `journeykit`, `JourneyKit`, `jk_pub_`, `jk_live_`, `sdk.js`, and for an existing analytics wrapper.

Done when: you can name the product's core action, the activation moment, how users pay (if they do), and the files where each happens.

## Step 3: Design the setup

Work it all out before touching anything.

**Contact fields.** A workspace starts with only `id`, `name` and `email`. From the user model, pick the fields a segment or workflow would use: first name, plan, role, company, signup source, trial end, locale, counts of core objects, onboarding flags, under conventional keys (`firstName`, `plan`, `company`, `source`, `trialEndsAt`, `locale`). Types: `string`, `number`, `boolean`, `date` (ISO 8601), `enum` (with its `options`, copied exactly from the code's enum values), `object`, `array`. Keys in camelCase.

**Event types.** From the actions in step 2.4, pick 5–15 that describe progress through the product: sign-up, onboarding steps, the core action, collaboration (invites), billing (trial started, subscription started/cancelled), and drop-off signals. Use the standard names where they fit (`eventDefinitions.addTemplates` lists them in its schema); otherwise `object_verb` in snake_case, past tense (`report_exported`). For each: description, its properties with types, and the file and line where it happens, after success, not on click.

**Email branding.** Logo URL (absolute, publicly reachable: a file under the site's public folder on its production URL), `primaryColor` from the brand colour, background/container/text colours, `fontFamily` (the closest of `system`, `serif` or `mono`), radii from the product's UI, `footerText` with the company name and a line on why the recipient gets the email. If `email.branding.presets` says `customLooks: false`, choose the preset whose look is closest and send it unchanged; logo and footer are always yours to set.

**Sender.** The postal address that goes in every footer; marketing email legally needs one and broadcasts refuse to send without it. Look for it in the site's footer, imprint or terms, and ask if it isn't there. If the workspace is on a paid plan and has no verified domain, propose the product's domain as the sending domain.

**Workflows and emails.** 3–5 workflows that react to the events and fields you just designed, each with a goal event. Fit them to the product; the usual starting set:

| Workflow | Trigger | Shape | Goal |
| --- | --- | --- | --- |
| Welcome | `account_created` (or the sign-up event) | email → wait 2d → `check` core action not performed → tip email | the core action |
| Activation nudge | `account_created` | wait 3d → `check` core action not performed → email → wait 4d → `check` → second email | the core action |
| Trial ending | `trial_started` | wait trial length minus 3d → `check` no `subscription_started` → email | `subscription_started` |
| Win-back | `subscription_cancelled` | wait 7d → email | `subscription_started` |
| Milestone | a property such as `projectCount` becoming `5` | celebrate + next step | a deeper action |

Each email is a preset: name, subject, preview text, a short body in the product's voice (read the marketing copy), one clear call to action as a button linking to the right page of the app, and `{{key}}` parameters (usually `firstName`, bound to the contact field, with a sample). Keep emails under ~120 words.

## Step 4: Propose the plan, once

Show the user one compact plan and ask for a single go-ahead:

- the contact fields (key, type);
- the event types, each with where it fires;
- files you'll create or change, and the package you'll install;
- branding (colours, logo URL, preset if on free plan);
- the postal address and sending domain;
- each workflow in one line (trigger → steps → goal) and its emails' subjects.

Ask only what you can't decide, typically which action is the core action, if the code doesn't make it obvious. Propose a default for everything so "yes" is enough. Apply their edits, then do steps 5–7 and 9 without further questions; step 8 asks once more, because it reaches real contacts.

## Step 5: Define the workspace

1. **Fields:** `contactProperties.create` for each new field; `contactProperties.update` where a key exists with the wrong type or options.
2. **Events:** `eventDefinitions.addTemplates` for standard names, `eventDefinitions.create` for the rest, with description and properties; `eventDefinitions.update` for existing ones you've refined.
3. **Branding:** `email.branding.update` with the full object (it replaces).
4. **Sender:** `email.postalAddress.set`. For a sending domain, `email.domain.set`, give the user the DNS records it returns, and call `email.domain.verify` once they've added them. DNS can take a while, so it needn't finish here: name it in the report if it's pending.

Done when: every field and event in the plan exists in the workspace with the agreed type.

## Step 6: Instrument the code

1. **Key.** Reuse the project's existing public key if `check_setup` lists its prefix; otherwise `create_public_key` with `<project name>`. Write it where the project keeps public config (e.g. `VITE_JOURNEYKIT_KEY`, `NEXT_PUBLIC_JOURNEYKIT_KEY`), plus a placeholder line in `.env.example`, and make sure it reaches production builds (committed public config, or name it in the report as something to set in the deployment).
2. **JavaScript or TypeScript front end:** install the npm package `@journeykit.io/browser-sdk` with the project's package manager and create one client with `createClient({ key, host })` (`host` = `urls.host`); it has `identify`, `track`, `page`, `reset`, `subscribe` and `claim`. Follow [references/frameworks.md](references/frameworks.md) for the client module and where identify/reset go. A front end with no JS build (plain HTML, server templates) can instead load the script from `urls.sdk`, which exposes the same calls on `window.JourneyKit` after `init({ key, host })`.
3. **Anything else** (Python, Ruby, PHP, Go, Java, Elixir, …, or events only the backend sees): call the ingest REST API from the backend: `POST /api/ingest/identify` and `POST /api/ingest/track` with `Authorization: Bearer <public key>`, through one small helper in the project's language. Contract and helper: [references/server-events.md](references/server-events.md). For a server-rendered app with no JS build, identify on sign-up, login and profile change from the backend.
4. **Identify** with the fields from step 5 wherever the user's data is known or changes: after sign-up and login, and after updates to plan, profile or the fields you defined. Identify runs before any track: track calls without an identified user are dropped.
5. **Track** each event at the line where it succeeds, with its defined properties. Billing events go in the payment-provider webhook handler.
6. **Page views.** Call `page()` on each page load or route change, marketing pages included. Before `identify()` it only queues in the browser, so anonymous visitors create no contacts and don't count against the plan.
7. **Signups.** Existing newsletter or waitlist forms, if the user approved moving them, call `subscribe()` or `claim()` (see the `campaigns` skill).
8. **Reset** on logout (browser SDK).
9. **CSP:** if the project sets a Content-Security-Policy, add the JourneyKit host to `script-src` and `connect-src`.
10. Run the project's type-check / lint / build and fix what you broke. Sending must never break the request around it: errors are caught and logged.

Done when: every event in the plan has exactly one call site, identify covers every field you defined, and the project builds.

## Step 7: Presets and workflows

1. **Presets:** `presets.create` per email with `name`, `subject`, `previewText`, `parameters` and `body`: simple HTML (`<h1>`, `<p>`, `<ul>`, `<a href="…" data-button>Call to action</a>`) with `{{key}}` placeholders. Pass `body` instead of `html`/`text`/`document`: the server applies the workspace branding and makes it editable in the dashboard. Reuse an existing preset with the same purpose instead (`presets.update` if its copy should change).
2. **Workflows:** `workflows.create` per workflow with `status: "paused"`: trigger, steps, goal, 10% holdout. Email steps use `presetId` to reference the presets from 1 and bind every required parameter (`firstName` → `{ "kind": "contact", "path": "properties.firstName" }`). Every event and property a workflow references must exist from step 5.
3. `workflows.get` each one and check that it matches the plan and its status is `paused`.

Done when: every planned workflow exists paused, with its presets and references all resolved.

## Step 8: Turn the workflows on (ask first)

Activating a workflow takes effect immediately: it starts taking in contacts who match its trigger from that moment and sends them real emails. So never activate on the plan's go-ahead alone; ask now, separately.

1. List the paused workflows, one line each (trigger → steps → goal), and say plainly what turning them on means: matching contacts enter right away and get the emails.
2. Ask which ones to turn on: all, some (by name), or none for now. Offer to send each preset as a test to the user's inbox first (`presets.sendTest`) so they can read the emails before anyone else does.
3. For each workflow the user names, `workflows.setStatus` to `active`, then `workflows.get` to confirm the status. Leave the rest paused.

If the user is unsure, leave everything paused and give them the link to review and switch them on themselves: `urls.host` + `/workflows`.

Done when: every workflow is either active because the user said so by name or "all", or paused.

## Step 9: Verify and report

1. Note the time as `since`. If you can run the app, sign up or sign in and perform the core action; otherwise ask the user to, naming the exact action.
2. `check_setup` with `since` (and `contactId` if known): expect `recent.events > 0`, your event names in `recent.eventNames`, and the `identify` and `track` checks `ok`. If not, use the `troubleshooting` skill, fix and repeat.
   Sending a synthetic identify/track with `curl` and the public key proves the key and network path but creates a real contact in the workspace: do it only with the user's OK, with a `contactId` like `journeykit-setup-check`.
3. Report, briefly:
   - fields, events, branding and sender now defined in the workspace;
   - code changes, file by file, and the package installed;
   - the workflows (one line each) with their emails, which are active and which are paused, and the link to review them: `urls.host` + `/workflows`;
   - what's left for the user: deploy, set the public key in production if it isn't committed, CSP in production, DNS for the sending domain, turn on any workflows still paused;
   - what they could do next with the `campaigns` skill: a first broadcast, a newsletter, a lead magnet.

No key beyond a public key's prefix in the report.
