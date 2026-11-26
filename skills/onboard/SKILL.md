---
name: onboard
description: Onboard a product to JourneyKit from its codebase. Defines contact fields and event types in the workspace, adds identify and track calls to the backend, matches email branding to the product, sets up the sender, writes emails and builds paused workflows. Use when the user runs /journeykit:onboard, asks to onboard, set up, install or integrate JourneyKit, or asks to track a new event with JourneyKit.
---

# Onboard a product to JourneyKit

You turn a codebase into a working JourneyKit workspace in one pass. You read the product, decide what to measure and what to send, make the workspace match (fields, events, branding, sender, emails, automations), and wire the code. The user approves one plan; everything else is your job.

**Smaller requests.** When JourneyKit is already installed and the user only wants tracking added ("track when a user upgrades"), or only wants the backend calls, do just the parts that apply: step 1, the relevant parts of step 2, a plan scoped to the request, the matching parts of steps 5–6, and step 9. Skip branding, sender, emails and automations unless asked.

Everything in the workspace goes through the JourneyKit MCP server, where each operation is its own tool. Check the input schema of a tool you are calling; it is the contract, and this file only names tools.

## Ground rules

- **Backend only, one secret key, created by the user.** JourneyKit has no browser SDK and no public keys: identify and track are sent from the backend with a workspace API key (`jk_live_…`), which can do everything and so must never reach front-end code, a commit or a log. You can't create keys; the user does under Settings → API keys (`urls.apiKeys` from `check_setup`). Read the key from the backend's environment or secret store in code, put a placeholder line in `.env.example`, and tell the user to set the real value in each deployment. Don't ask them to paste it into the chat, and never write it to a file that is committed.
- **Reuse before creating.** The workspace may not be empty. Match existing fields, event definitions, emails and automations by key/name and update or skip them; never create duplicates. The same goes for the codebase: if it already has JourneyKit code, a key or env vars, show the user what's there and ask before replacing anything.
- **Nothing reaches contacts without the user.** An automation with steps goes live on creation unless told otherwise, so every `workflows_create` passes `status: "paused"`. Activating an automation (`workflows_set_status`), sending a test email and deleting anything happen only when the user says so.
- **The project's conventions win.** Package manager, env-var naming, file layout, code style. If it already wraps another analytics tool (Segment, PostHog, Amplitude, a `track()` helper), add JourneyKit inside that wrapper instead of sprinkling new calls.
- **Personal data stays minimal.** Never send passwords, tokens, payment details or free-text content. `email` and `name` are built in; send other personal fields only when an automation or segment needs them.

## Step 1: Connect and read the workspace

1. `check_setup`. If the tools are missing or unauthorized, ask the user to connect (Claude Code: `/mcp` → `journeykit` → authenticate; Codex: `codex mcp login journeykit`; Cursor: Settings → MCP → JourneyKit → Connect) and retry. Tell the user which workspace you're connected to; if it's the wrong one, they reconnect and pick another on the consent screen.
   If they can't connect, continue in *manual mode* with just the code: the user creates a key under Settings → API keys and sets it in the backend's environment themselves, the host is `https://journeykit.io`, workspace changes (fields, events, branding, sender, emails, automations) are listed in the report for the user to make, and verification becomes "check Contacts in the dashboard".
2. Read what exists: `contact_properties_list`, `event_definitions_list`, `email_branding_get`, `email_branding_presets`, `presets_list`, `workflows_list`, `email_domain_get`, `email_postal_address_get`.

Done when: you know the workspace, whether it has an API key (prefixes only), its sender, and what's already defined.

## Step 2: Understand the product

Read, don't guess. In roughly this order:

1. **What it is.** README, landing/marketing pages, `package.json`/`pyproject`/`Gemfile` metadata, page titles and meta descriptions. Write yourself a two-sentence summary: who uses it and the outcome they come for.
2. **The contact model.** The users table/model/schema (Prisma, Drizzle, ActiveRecord, Django models, SQL migrations…) and the tables hanging off it (accounts, workspaces, subscriptions). Note each column, its type and enum values.
3. **Auth.** Where sign-up completes, where the signed-in user becomes known on the client, where logout happens. The contact id is the product's stable user id, never the email. Everything is sent from the backend, so note where on the server each of these happens.
4. **What users do.** Routes, API handlers, server actions, mutations, form submits, background jobs and billing webhooks. List the actions that create or change something meaningful, with file and line.
5. **Brand.** The website URL (README, `homepage`, `metadataBase`, `og:url`, env such as `APP_URL`), the logo (`public/`, `assets/`, favicon/apple-touch-icon, an `<svg>` logo component), theme colours (Tailwind theme, CSS variables like `--primary`, design tokens), fonts and corner radius. If you can fetch the live site, use it too.
6. **Audience touchpoints.** Any newsletter, waitlist or "get the guide" forms (a waitlist is a list; see the `campaigns` skill) that could move to JourneyKit's hosted page or embed, or post to `POST /api/subscribe` from the backend.
7. **Stack.** Front-end framework and entry point, back-end language, package manager, how the backend reads secrets (env vars, a secret manager) and where examples live (`.env.example`), type-check/build/lint scripts.
8. **Existing JourneyKit code and analytics.** A project set up earlier may still call the removed browser SDK (`@journeykit.io/browser-sdk`, `sdk.js`) with a `jk_pub_` key. Those calls no longer work: show the user, and move the events to the backend. Search for `journeykit`, `JourneyKit`, `jk_pub_`, `jk_live_`, `browser-sdk`, `sdk.js`, and for an existing analytics wrapper.

Done when: you can name the product's core action, the activation moment, how users pay (if they do), and the files where each happens.

## Step 3: Design the setup

Work it all out before touching anything.

**Contact fields.** A workspace starts with only `id`, `name` and `email`. From the user model, pick the fields a segment or automation would use: first name, plan, role, company, signup source, trial end, locale, counts of core objects, onboarding flags, under conventional keys (`firstName`, `plan`, `company`, `source`, `trialEndsAt`, `locale`). Types: `string`, `number`, `boolean`, `date` (ISO 8601), `enum` (with its `options`, copied exactly from the code's enum values), `object`, `array`. Keys in camelCase.

**Event types.** From the actions in step 2.4, pick 5–15 that describe progress through the product: sign-up, onboarding steps, the core action, collaboration (invites), billing (trial started, subscription started/cancelled), and drop-off signals. Use the standard names where they fit (`event_definitions_add_templates` lists them in its schema). Built-in events JourneyKit records itself (`list_subscribed`, `email_opened`, `email_clicked` and the like) are already defined in every workspace and can't be changed, so never create them, and events have no category; otherwise `object_verb` in snake_case, past tense (`report_exported`). For each: description, its properties with types, and the file and line where it happens, after success, not on click.

**Email branding.** Logo URL (absolute, publicly reachable: a file under the site's public folder on its production URL), `primaryColor` from the brand colour, background/container/text colours, `fontFamily` (the closest of `system`, `serif` or `mono`), radii from the product's UI, `footerText` with the company name and a line on why the recipient gets the email. If `email_branding_presets` says `customLooks: false` (free plan), the workspace has one fixed look (Minimal in JourneyKit blue): send its current colours, font and shapes from `email_branding_get` unchanged and send `logoUrl: null`: a logo needs a paid plan (setting one answers 403), and the footer is always yours to set. Tell the user their logo shows once they upgrade.

**Sender.** The postal address that goes in every footer; marketing email legally needs one and broadcasts refuse to send without it. Look for it in the site's footer, imprint or terms, and ask if it isn't there. If the workspace has no verified domain, propose the product's domain as the sending domain.

**Automations and emails.** 3–5 automations that react to the events and fields you just designed, each with a goal event. Fit them to the product; the usual starting set:

| Automation | Trigger | Shape | Goal |
| --- | --- | --- | --- |
| Welcome | `account_created` (or the sign-up event) | email → wait 2d → `check` core action not performed → tip email | the core action |
| Activation nudge | `account_created` | wait 3d → `check` core action not performed → email → wait 4d → `check` → second email | the core action |
| Trial ending | `trial_started` | wait trial length minus 3d → `check` no `subscription_started` → email | `subscription_started` |
| Win-back | `subscription_cancelled` | wait 7d → email | `subscription_started` |
| Milestone | a property such as `projectCount` becoming `5` | celebrate + next step | a deeper action |

Each email has name, subject, preview text, a short body in the product's voice (read the marketing copy), one clear call to action as a button linking to the right page of the app, and `{{key}}` parameters (usually `firstName`, bound to the contact field, with a sample). Keep emails under ~120 words.

## Step 4: Propose the plan, once

Show the user one compact plan and ask for a single go-ahead:

- the contact fields (key, type);
- the event types, each with where it fires;
- files you'll create or change, and the key the user needs to create and set;
- branding (colours and logo URL, or the email and no logo on the free plan);
- the postal address and sending domain;
- each automation in one line (trigger → steps → goal) and its emails' subjects, each with the template it starts from.

Ask only what you can't decide, typically which action is the core action, if the code doesn't make it obvious. Propose a default for everything so "yes" is enough. Apply their edits, then do steps 5–7 and 9 without further questions; step 8 asks once more, because it reaches real contacts.

## Step 5: Define the workspace

1. **Fields:** `contact_properties_create` for each new field; `contact_properties_update` where a key exists with the wrong type or options.
2. **Events:** `event_definitions_add_templates` for standard names, `event_definitions_create` for the rest, with description and properties; `event_definitions_update` for existing ones you've refined.
3. **Branding:** `email_branding_update` with the full object (it replaces).
4. **Sender:** `email_postal_address_set`. For a sending domain, `email_domain_set`, give the user the DNS records it returns, and call `email_domain_verify` once they've added them. DNS can take a while, so it needn't finish here: name it in the report if it's pending.

Done when: every field and event in the plan exists in the workspace with the agreed type.

## Step 6: Instrument the code

1. **Key.** If `check_setup` lists no key, give the user the link (`urls.apiKeys`) and ask them to create one and set it in the backend's environment, then carry on with the code. Read it in a single server-side module, from the variable the project's convention suggests, never from anything a browser can see (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_` variables are all wrong). Add a placeholder line to `.env.example`.
2. **A small backend helper** in the project's language: `POST /api/ingest/identify` and `POST /api/ingest/track` with `Authorization: Bearer <key>`. Contract and helper: [references/server-events.md](references/server-events.md); framework placement is in [references/frameworks.md](references/frameworks.md). If the product wraps another analytics tool, add JourneyKit inside that wrapper.
3. **Client-side moments** (a sign-up form submit, a button click) reach the backend through the project's own API route or server action, which then sends the event. There is nothing to load in the browser.
4. **Identify** with the fields from step 5 wherever the backend learns who the user is or their data changes: after sign-up and login, and after updates to plan, profile or the fields you defined. Identify before the first track for a contact.
5. **Track** each event at the line where it succeeds, with its defined properties. Billing events go in the payment-provider webhook handler.
6. **Signups.** Existing newsletter or waitlist forms, if the user approved moving them, use the hosted page or embed, or the backend posts to `POST /api/subscribe` (see the `campaigns` skill).
7. Run the project's type-check / lint / build and fix what you broke. Sending must never break the request around it: errors are caught and logged.

Done when: every event in the plan has exactly one call site, identify covers every field you defined, and the project builds.

## Step 7: Emails and automations

1. **Emails:** `presets_create` per email with `name`, `subject`, `previewText`, `parameters` and `blocks`, written with the `emails` skill: the template that matches the email's job (`email_templates_list`, such as `welcome`, `setup-checklist`, `trial-ending`, `win-back`) or blocks (`email_blocks_list`), with all its sample copy and links replaced by the product's. The blocks are what the dashboard editor edits; the server applies the workspace branding. Every email is built in the workspace's branding as it is when it is sent, so a later branding change reaches existing emails; there is no need to recreate them. Reuse an existing email with the same purpose instead (`presets_update` if its copy should change).
2. **Automations:** `workflows_create` per automation with `status: "paused"`: trigger, steps, goal, 10% holdout. Email steps use `presetId` to reference the emails from 1 and bind every required parameter (`firstName` → `{ "kind": "contact", "path": "properties.firstName" }`). Every event and property an automation references must exist from step 5.
3. `workflows_get` each one and check that it matches the plan and its status is `paused`.

Done when: every planned automation exists paused, with its emails and references all resolved.

## Step 8: Turn the automations on (ask first)

Activating an automation takes effect immediately: it starts taking in contacts who match its trigger from that moment and sends them real emails. So never activate on the plan's go-ahead alone; ask now, separately.

1. List the paused automations, one line each (trigger → steps → goal), and say plainly what turning them on means: matching contacts enter right away and get the emails.
2. Ask which ones to turn on: all, some (by name), or none for now. Offer to send each email as a test to the user's inbox first (`presets_send_test`) so they can read the emails before anyone else does.
3. For each automation the user names, `workflows_set_status` to `active`, then `workflows_get` to confirm the status. Leave the rest paused.

If the user is unsure, leave everything paused and give them the link to review and switch them on themselves: `urls.host` + `/workflows`.

Done when: every automation is either active because the user said so by name or "all", or paused.

## Step 9: Verify and report

1. Note the time as `since`. If you can run the app, sign up or sign in and perform the core action; otherwise ask the user to, naming the exact action.
2. `check_setup` with `since` (and `contactId` if known): expect `recent.events > 0`, your event names in `recent.eventNames`, and the `identify` and `track` checks `ok`. If not, use the `troubleshooting` skill, fix and repeat.
3. Report, briefly:
   - fields, events, branding and sender now defined in the workspace;
   - code changes, file by file;
   - the automations (one line each) with their emails, which are active and which are paused, and the link to review them: `urls.host` + `/workflows`;
   - what's left for the user: deploy, create the API key if there is none and set it in every deployment's backend environment, DNS for the sending domain, turn on any automations still paused;
   - what they could do next with the `campaigns` skill: a first broadcast, a newsletter, a lead magnet.

No key value, and no prefix beyond what `check_setup` shows, in the report.
