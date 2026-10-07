---
name: onboard
description: Onboard a product to JourneyKit end to end — define user fields and event types from the codebase, install the SDK and verify data arrives, brand emails to match the product, write email templates and draft first journeys. Use when asked to onboard a project to JourneyKit, or when started from the dashboard's Get started page (`/journeykit:onboard`).
---

# Onboard a project to JourneyKit

Onboarding takes a workspace from empty to "data arrives and the first journeys are drafted". The user watches it happen in the dashboard: the sidebar checklist ticks off each step below as the workspace changes, in this order. Do the steps in order and finish each before moving on.

| Checklist item | Done in JourneyKit when |
| --- | --- |
| Define user fields | a custom user property exists |
| Define event types | a custom event definition exists |
| Identify users | `check_setup` reports `identify` `ok` |
| Track events | `check_setup` reports `track` `ok` |
| Brand your emails | email branding has a logo |
| Write email templates | at least one template exists |
| Draft journeys | at least one journey exists |

Everything goes through the JourneyKit MCP server: `check_setup` and `create_public_key` for the install, and `search_tools` → `describe_tools` → `execute_tool` for the rest. Describe an operation before its first execute; the schema is the contract.

## Ground rules

- The ground rules of the `setup` skill apply throughout: public keys only, existing configuration wins, the project's conventions win.
- **Reuse before creating.** List what the workspace already has (`userProperties.list`, `eventDefinitions.list`, `email.branding.get`, `templates.list`, `journeys.list`) and build on it. Never delete or overwrite something the user made without asking.
- **Journeys stay drafts.** Never turn a journey on (`journeys.setStatus`) and never send email (`templates.sendTest`) without the user's explicit OK.
- **One plan, one approval.** Read the whole codebase first, then propose everything at once (step 2), so the user approves once instead of at every step.

## Step 1 — Connect and read

1. Call `check_setup`. If the tools are missing or unauthorized, ask the user to connect: in Claude Code, run `/mcp` and authenticate `journeykit` (a browser window opens; they sign in and pick the workspace). Then retry. Tell the user which workspace you're connected to.
2. Read the workspace: its lifecycle stages (from `check_setup`), and the existing user properties, event definitions, branding, templates and journeys.
3. Read the codebase as in the `setup` skill's step 2 — framework, entry point, auth, env conventions, analytics wrapper, key moments — plus:
   - the **user model** (schema, ORM model, type): fields that describe a user and are worth segmenting on (plan, role, company, trial end, locale, signup source);
   - the **product's brand**: logo file or URL (public URL preferred — `public/`, the deployed site, the favicon as a fallback), primary colour (Tailwind config, CSS variables, theme file), font, product name and tone of voice from landing-page copy;
   - the **product's own emails**, if any (transactional templates), for voice and layout.

Done when: you know the workspace and what it already has, and can list candidate user fields, events with their call sites, the brand, and the moments a journey should react to.

## Step 2 — Propose the plan

Show one short plan covering:

- **User fields** to define: key, type, and where the value comes from. Prefer the standard keys (`firstName`, `lastName`, `plan`, `company`, `companySize`, `source`, `trialEndsAt`, `locale`).
- **Event types** to define: name, one-line meaning, and the file where each fires. Use the standard catalog names where they fit (`account_created`, `onboarding_completed`, `project_created`, `subscription_started`, …).
- **Install**: the files the SDK work will touch, the public key, the stage mapping, and whether server-side events are included (the `setup` skill's step 3).
- **Branding**: the logo, colours and font you found.
- **Emails and journeys**: two or three journeys that fit the product — typically a welcome on `account_created`, an activation nudge for users who haven't done the core action after a few days, and a trial-ending or win-back flow if the product has billing. For each: trigger, timing, email subject and one-line gist, goal event.

Propose a default for every open question so the user can just say yes.

Done when: the user has approved or adjusted the plan.

## Step 3 — Define user fields

Create each approved field with `userProperties.create` (skip keys that already exist). Use the type that matches the source (string, number, boolean, date, or an option list for enums like `plan`).

Done when: every approved field exists in the workspace.

## Step 4 — Define event types

Create each approved event with `eventDefinitions.create`, with a description saying what the user did (skip names that already exist). Defining them first means journeys and segments can reference them before the first one arrives.

Done when: every approved event exists in the workspace.

## Step 5 — Install and verify

Follow the `setup` skill from step 4 (public key) through step 7 (verify), with the plan already approved: SDK, identify with the fields from step 3, track the events from step 4 at their call sites, stages, optional server-side events, then verify with `check_setup` and `since`.

Done when: `check_setup` reports `identify` and `track` `ok` with your events in `recent.eventNames`, or the user knows exactly which action of theirs is left (e.g. "sign in once and create a project").

## Step 6 — Brand your emails

1. `email.branding.presets` lists the presets and whether colours, font and shapes may be set freely on this plan. If they can't, pick the preset closest to the product's look.
2. `email.branding.update` with the logo URL, colours and font. The logo must be a URL the email client can load: a public `https://` image, not a path inside the repo. If the product has none, ask the user for one rather than skipping it.

Done when: `email.branding.get` returns the logo and the product's look.

## Step 7 — Write email templates

For each email in the approved journeys, `templates.create` with a subject, preheader and body in the product's voice, using the user's fields (e.g. `firstName`) where they help. Keep each email to one message and one call to action that leads to the journey's goal. `templates.sender` shows the sender; mention it in the report if it's still the default.

Offer to send one test with `templates.sendTest` — it emails the signed-in user, so only with their OK.

Done when: every email the journeys need exists as a template.

## Step 8 — Draft journeys

Build each approved journey as the `journeys` skill describes: trigger, steps with waits and the templates from step 7, goal event and window, and a 10% holdout by default. `journeys.create` creates it disabled. Check each with `journeys.get`.

Done when: every approved journey exists as a draft that references only events, fields and templates that exist.

## Step 9 — Report

Tell the user, briefly:

- what changed in the codebase, file by file;
- what now exists in JourneyKit: fields, event types, branding, templates, journeys (as drafts);
- what's left for them: deploy, set any production env vars, review and switch on the journeys under **Journeys**;
- that the dashboard's checklist should now be complete, and which item isn't if one isn't.

No keys in the summary beyond a public key's prefix.
