---
name: journeys
description: Build and measure JourneyKit journeys, segments and email templates, and answer lifecycle questions (activation, conversion, funnel, journey results) from workspace data. Use when asked to create a journey, nudge, onboarding or win-back flow, segment, or email, or how users or a journey are doing.
---

# Journeys, segments and lifecycle data

A **journey** is: a trigger (an event, a user property change, or a hand-over from another journey) → ordered steps (waits, conditions, branches, email / in-app message / webhook, property updates) → a measurement (goal event within a window, optional holdout). A **segment** is a saved set of conditions over user fields, stages and events. Everything is reached through the JourneyKit MCP server: `search_tools` to find operations, `describe_tools` to load their schema, `execute_tool` to run them. Describe an operation before its first execute; the schema is the contract.

## Read the workspace first

Before proposing anything, ground it in what the workspace actually has:

- `lifecycle.stages` — the stage names, in order.
- `events.names` / `eventDefinitions.list` — event names that really arrive (a journey on a never-sent event never fires).
- `userProperties.list` — trait keys and their types/options.
- `segments.list`, `journeys.list`, `templates.list` — reuse before creating.

If the events a request depends on aren't being tracked, say so and offer to add tracking (the `setup` skill) before building on them.

## Build

1. **Propose** in plain words: trigger, audience, steps with timings, message copy, goal event and window, holdout. Default to a 10% holdout when the user wants to know whether it works, and a goal event that is the behaviour the journey is for.
2. **Segment** (if the audience is reusable): `segments.preview` first to show how many users match, then `segments.create`.
3. **Email template** (for email steps): `templates.list` for one that fits, else `templates.create`. Offer `templates.sendTest` — it sends a real email to the signed-in user, so ask first.
4. **Journey**: `journeys.create`. It is created disabled (draft): nothing reaches users yet.
5. **Check** it with `journeys.get` and walk the user through what will happen to whom.

Done when: the journey exists as a draft that matches the approved proposal, with every event and property it references present in the workspace.

## Go live — always the user's call

`journeys.setStatus` to `active` starts sending real messages to real users; `paused` stops new entries. Deleting journeys, segments, templates, users or definitions cannot be undone. Run these only after the user explicitly says to, naming the journey or record, in the current conversation.

## Measure and answer questions

- Overall health: `funnel.overview`, `funnel.stages`, `metrics.summary`, `metrics.series`, `insights.list`.
- A journey: `journeys.funnel` (where runs drop out), `journeys.timeseries` (entries and goals per day), `journeys.runs` / `journeys.run` (individual runs, exits, errors), and the holdout comparison on `journeys.get`.
- A person: `users.list` / `users.get`, `journeys.nudgesForUser`.

Report numbers with their time window and denominator ("312 of 1,040 sign-ups in the last 30 days, 30%"). With a holdout, give nudged vs control goal rates and the lift, and say when the sample is too small to call. Separate what the data shows from what you suggest doing about it.
