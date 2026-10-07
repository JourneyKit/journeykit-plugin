---
name: onboard
description: Onboard a product to JourneyKit end to end, from its codebase — define user fields and event types in the workspace, add identify/track calls to the code, match email branding to the product, write email templates and draft journeys. Use when the user runs /journeykit:onboard, asks to onboard a project to JourneyKit, or asks for a complete first-time JourneyKit setup.
---

# Onboard a product to JourneyKit

You turn a codebase into a working JourneyKit workspace in one pass. You read the product, decide what to measure and what to send, make the workspace match (fields, events, branding, templates, journeys), and wire the code. The user approves one plan; everything else is your job.

Everything in the workspace goes through the JourneyKit MCP server: `check_setup` and `create_public_key`, and `search_tools` → `describe_tools` → `execute_tool` for the rest of the API. Always `describe_tools` an operation before its first `execute_tool` — the schema is the contract, this file only names operations.

## Ground rules

- **One key, created by you.** Call `create_public_key` once. A public key (`jk_pub_…`) can only identify and track, so it is safe in front-end code, in commits and in server env. The browser SDK and backend calls both use it. Never create, ask for or handle a secret key (`jk_live_…`); it is only needed to backfill history with timestamps, and the user creates that themselves.
- **Reuse before creating.** The workspace may not be empty. Match existing fields, event definitions, templates and journeys by key/name and update or skip them; never create duplicates.
- **Nothing reaches end users without the user.** Journeys are created as drafts. Activating a journey (`journeys.setStatus`), sending a test email and deleting anything happen only when the user says so.
- **The project's conventions win.** Package manager, env-var naming, file layout, existing analytics wrapper (add JourneyKit inside it), code style.
- **Personal data stays minimal.** Never send passwords, tokens, payment details or free-text content. `email` and `name` are built in; send other personal fields only when a journey or segment needs them.

## Step 1 — Connect and read the workspace

1. `check_setup`. If the tools are missing or unauthorized, ask the user to connect (Claude Code: `/mcp` → `journeykit` → authenticate; Codex: `codex mcp login journeykit`; Cursor: Settings → MCP → JourneyKit → Connect) and retry. Tell the user which workspace you're connected to.
2. Read what exists: `userProperties.list` (the `stage` field's `options` are the lifecycle stages, in order), `eventDefinitions.list`, `email.branding.get`, `email.branding.presets`, `templates.list`, `journeys.list`, `templates.sender`.

Done when: you know the workspace, its stages, its key prefixes, and what's already defined.

## Step 2 — Understand the product

Read, don't guess. In roughly this order:

1. **What it is.** README, landing/marketing pages, `package.json`/`pyproject`/`Gemfile` metadata, page titles and meta descriptions. Write yourself a two-sentence summary: who uses it and the outcome they come for.
2. **The user model.** The users table/model/schema (Prisma, Drizzle, ActiveRecord, Django models, SQL migrations…) and the tables hanging off it (accounts, workspaces, subscriptions). Note each column, its type and enum values.
3. **Auth.** Where sign-up completes, where the signed-in user becomes known on the client, where logout happens. The user id is the product's stable id, never the email.
4. **What users do.** Routes, API handlers, server actions, mutations, form submits, background jobs and billing webhooks. List the actions that create or change something meaningful, with file and line.
5. **Brand.** The website URL (README, `homepage`, `metadataBase`, `og:url`, env such as `APP_URL`), the logo (`public/`, `assets/`, favicon/apple-touch-icon, an `<svg>` logo component), theme colours (Tailwind theme, CSS variables like `--primary`, design tokens), fonts and corner radius. If you can fetch the live site, use it too.
6. **Stack.** Front-end framework and entry point, back-end language, package manager, env files, type-check/build scripts, Content-Security-Policy.

Done when: you can name the product's core action, the activation moment, how users pay (if they do), and the files where each happens.

## Step 3 — Design the setup

Work it all out before touching anything.

**User fields.** From the user model, pick the fields a segment or journey would use: plan, role, company, signup source, trial end, locale, counts of core objects, onboarding flags. Prefer the standard keys already in the workspace (`firstName`, `plan`, `company`, `companySize`, `source`, `trialEndsAt`, `locale`, …). Types: `string`, `number`, `boolean`, `date` (ISO 8601), `enum` (with its `options` — copy the code's enum values exactly), `object`, `array`. Keys in camelCase.

**Lifecycle stages.** Map the workspace's stages onto product moments (e.g. `activation` = first core action, `conversion` = first payment). If the product's lifecycle clearly doesn't fit the stages, propose new stage options; changing them is part of the plan the user approves.

**Event types.** From the actions in step 2.4, pick 5–15 that describe progress through the product: sign-up, onboarding steps, the core action, collaboration (invites), billing (trial started, subscription started/cancelled), and drop-off signals. Use the standard names from `eventDefinitions.list` where they fit; otherwise `object_verb` in snake_case, past tense (`report_exported`). For each: description, the stage it signals, its properties with types, and the file and line where it happens — after success, not on click.

**Email branding.** Logo URL (absolute, publicly reachable — a file under the site's public folder on its production URL), `primaryColor` from the brand colour, background/container/text colours, `fontFamily` (`system`, `serif` or `mono` — the closest), radii from the product's UI, `footerText` with the company name and a line on why the recipient gets the email. If `email.branding.presets` says `customLooks: false`, choose the preset whose look is closest and send it unchanged; logo and footer are always yours to set.

**Journeys and emails.** 3–5 journeys that react to the events and fields you just designed, each with a goal event. Fit them to the product; the usual starting set:

| Journey | Trigger | Shape | Goal |
| --- | --- | --- | --- |
| Welcome | `account_created` (or the sign-up event) | email now → wait 2d → check not activated → tip email | the core action |
| Activation nudge | `account_created` | `wait_event` core action for 3d; on timeout email → wait 4d → check → second email | the core action |
| Trial ending | `trialEndsAt` set / `trial_started` | wait until 3d before end → email | `subscription_started` |
| Win-back | `subscription_cancelled` | wait 7d → email | `subscription_started` |
| Milestone | Nth core action (`increment` + property trigger) | celebrate + next step | a deeper action |

Each email is a template: name, subject, preview text, a short body in the product's voice (read the marketing copy), one clear call to action as a button linking to the right page of the app, and `{{key}}` parameters (usually `firstName`, bound to the user field, with a sample). Keep emails under ~120 words.

## Step 4 — Propose the plan, once

Show the user one compact plan and ask for a single go-ahead:

- the user fields (key, type) and stage mapping;
- the event types, each with where it fires;
- files you'll create or change, and the package you'll install;
- branding (colours, logo URL, preset if on free plan);
- each journey in one line (trigger → steps → goal) and its emails' subjects.

Ask only what you can't decide — typically which action is the core action, if the code doesn't make it obvious. Propose a default for everything so "yes" is enough. Apply their edits, then do steps 5–8 without further questions.

## Step 5 — Define the workspace

1. **Fields:** `userProperties.create` for each new field; `userProperties.update` where a key exists with the wrong type or options. Stage options change via `userProperties.update` on `stage`.
2. **Events:** `eventDefinitions.create` for each new event type, with description, stage and properties; `eventDefinitions.update` for existing ones you've refined.
3. **Branding:** `email.branding.update` with the full object (it replaces).

Done when: every field and event in the plan exists in the workspace with the agreed type.

## Step 6 — Instrument the code

1. **Key.** Reuse the project's existing public key if `check_setup` lists its prefix; otherwise `create_public_key` with `<project name>`. Write it where the project keeps public config (e.g. `VITE_JOURNEYKIT_KEY`, `NEXT_PUBLIC_JOURNEYKIT_KEY`), plus a placeholder line in `.env.example`, and make sure it reaches production builds (committed public config, or name it in the report as something to set in the deployment).
2. **JavaScript or TypeScript front end:** install the npm package `@journeykit.io/browser-sdk` with the project's package manager and follow [../setup/references/frameworks.md](../setup/references/frameworks.md) for the client module and where identify/reset go.
3. **Anything else** (Python, Ruby, PHP, Go, Java, Elixir, …, or events only the backend sees): call the ingest REST API from the backend — `POST /api/ingest/identify` and `POST /api/ingest/track` with `Authorization: Bearer <public key>` — through one small helper in the project's language. Contract and helper: [../setup/references/server-events.md](../setup/references/server-events.md). For a server-rendered app with no JS build, identify on sign-up, login and profile change from the backend.
4. **Identify** with the fields from step 5 wherever the user's data is known or changes: after sign-up and login, and after updates to plan, profile or the fields you defined. Include `stage` when the user moves stage, derived from state the product already has.
5. **Track** each event at the line where it succeeds, with its defined properties. Billing events go in the payment-provider webhook handler.
6. **Reset** on logout (browser SDK).
7. Run the project's type-check / lint / build and fix what you broke. Sending must never break the request around it: errors are caught and logged.

Done when: every event in the plan has exactly one call site, identify covers every field you defined, and the project builds.

## Step 7 — Templates and journeys

1. **Templates:** `templates.create` per email with `name`, `subject`, `previewText`, `parameters` and `body` — simple HTML (`<h1>`, `<p>`, `<ul>`, `<a href="…" data-button>Call to action</a>`) with `{{key}}` placeholders. Pass `body` instead of `html`/`text`/`document`: the server applies the workspace branding and makes it editable in the dashboard. Reuse an existing template with the same purpose instead (`templates.update` if its copy should change).
2. **Journeys:** `journeys.create` per journey — trigger, steps, goal, 10% holdout. Email steps reference the template ids from 1 and bind every required parameter (`firstName` → user field `properties.firstName`). Every event and property a journey references must exist from step 5. They are created disabled.
3. `journeys.get` each one and check it matches the plan.

Done when: every planned journey exists as a draft whose templates and references all resolve.

## Step 8 — Verify and report

1. Note the time as `since`. If you can run the app, sign up or sign in and perform the core action; otherwise ask the user to, naming the exact action.
2. `check_setup` with `since` (and `userId` if known): expect `recent.events > 0`, your event names in `recent.eventNames`, and the `identify` and `track` checks `ok`. If not, use the `troubleshooting` skill, fix and repeat.
3. Report, briefly:
   - fields, events and branding now defined in the workspace;
   - code changes, file by file, and the package installed;
   - the journeys drafted (one line each) with their emails, and the link to review them: `urls.host` + `/journeys`;
   - what's left for the user: deploy, set the public key in production if it isn't committed, turn on the journeys they like (offer to do it, or to send test emails to their inbox first).

No key beyond a public key's prefix in the report.
