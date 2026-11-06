---
name: workflows
description: Build and measure JourneyKit workflows, segments and email presets, and answer questions about contacts, engagement and results from workspace data. Use when asked to create a workflow, automation, nudge, onboarding or win-back flow, segment or email preset, or how a workflow or the audience is doing.
---

# Workflows, segments and reporting

A **workflow** is a trigger (an event, a contact property change, or a hand-over from another workflow), then ordered steps, then a measurement (goal event within a window, optional holdout). A **segment** is a saved set of conditions over contact properties, events, activity, engagement level and other segments.

Everything goes through the JourneyKit MCP server. Each operation is its own tool, and its input schema is the contract; this file only names them.

For broadcasts, newsletters, lead magnets and imports, use the `campaigns` skill.

## Read the workspace first

Ground every proposal in what the workspace has:

- `events_names` and `event_definitions_list`: event names that really arrive. A workflow on a never-sent event never fires.
- `contact_properties_list`: property keys, types and options.
- `segments_list`, `workflows_list`, `presets_list`: reuse before creating.

JourneyKit records some events itself, ready to use as triggers, goals and conditions: `email_opened`, `email_clicked`, `newsletter_subscribed`, `newsletter_unsubscribed`, `lead_magnet_claimed`, `lead_magnet_opened`, and `page_viewed` from the SDK.

When a request depends on an event nobody tracks yet, say so and offer to add tracking (the `onboard` skill) before building on it.

## Build

1. **Propose** in plain words: trigger, audience, steps with timings, copy, goal event and window, holdout, and how often one contact may enter (`reentry`: `once`, `sequential` or `parallel`). Default to a 10% holdout when the user wants to know whether it works, and a goal event that is the behaviour the workflow is for. The audience is a `check` as the first step, usually `in` a saved segment.
2. **Segment**, if the audience is reusable: `segments_preview` to show how many contacts match, then `segments_create`.
3. **Email preset**, for email steps: `presets_list` for one that fits, else `presets_create` with the copy as `body` (simple HTML, `{{key}}` placeholders, `<a … data-button>` for the call to action). The server applies the workspace's branding. Offer `presets_send_test`, which sends a real email to the signed-in member, so ask first. The ready-made gallery at `/email/templates` is dashboard-only; point the user there when they want a starting design.
4. **Workflow**: `workflows_create` with `status: "paused"`. Without it a workflow with steps goes **live** on creation.
5. **Check** it with `workflows_get` and walk the user through what will happen to whom.

Done when: the workflow exists **paused**, matches the approved proposal, and every event, property, preset and segment it references resolves.

### Step gotchas

- Waits are relative: `wait` takes a duration and `wait_until` a time of day. To reach "3 days before the trial ends", wait the trial length minus 3 days from `trial_started`.
- `wait_event` carries on when the event arrives, and on timeout it continues or exits per `onTimeout`. To email only contacts who didn't act, follow a `wait` with a `check` using `not_performed`.
- A run that reaches its goal stops, so a goal event ends the nudges on its own.
- A required preset parameter with no value fails the step. Bind each one to a contact field (`{ "kind": "contact", "path": "properties.firstName" }`), or give the parameter a `sample` and set `required: false`.

## Go live

These reach real people or can't be undone, so each needs the user's explicit word, naming the record, in the current conversation:

- `workflows_set_status` to `active`: matching contacts enter from that moment.
- `workflows_create` without `status: "paused"`.
- Any delete: workflows, segments, presets, contacts, definitions.

`paused` stops new entries; runs in progress finish on their own.

## Measure and answer questions

- Overall: `metrics_catalog` (what exists), `metrics_summary`, `metrics_series` (with the previous period, optionally for one segment), `insights_list`.
- A workflow: `workflows_analytics` (the full report: goal rate, lift, exit reasons, per-step breakdown, email delivery, opens, clicks and links), `workflows_funnel`, `workflows_timeseries`, `workflows_runs`, `workflows_run`, and `workflows_history` across all of them.
- A person: `contacts_list`, `contacts_get`, `workflows_nudges_for_contact`, `newsletters_for_contact`, `lead_magnets_for_contact`.
- Sent email: `email_history`, `email_message`.
- Engagement: the segment conditions `engagement` (`engaged`, `at_risk`, `inactive`, `new`) and `last_engaged`, with `segments_preview` for the count.

`workflows_analytics` follows runs started in the range, except its `email` part, which covers emails sent in the range.

Report numbers with their window and denominator ("312 of 1,040 new contacts in the last 30 days, 30%"). With a holdout, give nudged and control goal rates and the lift, and say when the sample is too small to call. Keep what the data shows apart from what you suggest doing about it.
