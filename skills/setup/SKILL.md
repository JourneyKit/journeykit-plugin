---
name: setup
description: Install JourneyKit in the user's codebase and verify it works — browser SDK, identify, track, lifecycle stages, server-side events. Use when asked to set up, install, integrate or add JourneyKit, or to add JourneyKit tracking for new events.
---

# Set up JourneyKit

JourneyKit tracks a product's end users (`identify` + `track`), moves them through lifecycle stages, and runs journeys on that data. Setup means: the product's front end loads the JourneyKit browser SDK with a public key, identifies the signed-in user, and tracks the moments that matter; optionally its backend sends events the browser can't see.

You do the work; the user makes the calls only they can make. Treat the steps below as a checklist: finish each one before moving on.

## Ground rules

- **Public key vs secret key.** A public key (`jk_pub_…`) is safe in front-end code and in commits. A secret key (`jk_live_…`) is a credential: it lives only in the backend's environment, set by the user. You never create, print, read back or commit a secret key — you write the env var *name* and placeholders, and tell the user where to get the value.
- **Existing configuration wins.** If the project already has JourneyKit code, a key, or env vars, show the user what's there and ask before replacing anything.
- **The project's conventions win.** Use its package manager, file layout, env-var naming, analytics wrapper, and code style. If it already wraps another analytics tool (Segment, PostHog, Amplitude, a `track()` helper), add JourneyKit inside that wrapper instead of sprinkling new calls.

## Step 1 — Connect to JourneyKit

Call the `check_setup` tool (JourneyKit MCP server). It returns the workspace name, the SDK and ingest URLs, live keys (prefixes only), what has arrived so far, the workspace's lifecycle stages, and a checklist.

- **Tools missing or unauthorized:** the server signs in with OAuth on first use. Ask the user to connect it — Claude Code: run `/mcp` and authenticate `journeykit`; Codex: `codex mcp login journeykit`; Cursor: Settings → MCP → JourneyKit → Connect. Then retry. If they can't connect, continue in *manual mode*: the user creates a public key under Settings → API keys and pastes it to you (a public key is fine to paste), the host is `https://journeykit.io`, and verification in step 7 becomes "check Users in the dashboard".
- Tell the user which workspace you're connected to. If it's the wrong one, they reconnect and pick another on the consent screen.

Done when: you know the workspace, `urls.sdk`, `urls.host`, `urls.ingest`, the stages, and which checks are already `ok`.

## Step 2 — Inspect the project

Find, by reading files rather than guessing:

1. **Front-end framework and entry point** — where a global `<script>` goes (root layout, `index.html`, document template) and how client-only code runs.
2. **Package manager and scripts** — lockfile, `typecheck`/`build`/`lint` scripts you'll run in step 7.
3. **Env-var convention** for public client config (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_`, a config module…), and where examples live (`.env.example`).
4. **Auth** — where the signed-in user becomes known on the client (session hook, auth provider, `/me` fetch) and where logout happens. Identify uses the product's stable user id, never the email.
5. **Existing JourneyKit code** — search for `journeykit`, `JourneyKit`, `jk_pub_`, `jk_live_`, `sdk.js`.
6. **Existing analytics wrapper** and a **Content-Security-Policy** (headers config, middleware, `<meta http-equiv>`).
7. **Key moments** — sign-up completion, onboarding completion, the product's core action, and billing (checkout, subscription webhooks).

If there's no browser front end (API-only product, mobile app), skip to step 6 and send everything server-side.

Done when: you can name the file for the script, the file for identify/reset, the env var for the key, and a list of candidate events with the file and line where each happens.

## Step 3 — Propose the plan

Show the user a short plan before editing:

- the files you'll create or change;
- the public key you'll use (an existing one, or a new one you'll create);
- the events you'll track, named from the standard catalog where they fit (`account_created`, `onboarding_completed`, `project_created`, `subscription_started`, … — the full list is `eventDefinitions.list` via `search_tools`), and where each fires;
- the stage mapping: which product moment moves a user into which of the workspace's stages (from `check_setup`);
- whether you'll add server-side events (needs a secret key from the user).

Ask only what you can't determine yourself — typically which action is the product's core action, and whether to include server-side events. Propose a default for each so the user can just say yes.

Done when: the user has approved the plan or adjusted it.

## Step 4 — Get a public key

Reuse a key the project already has (its prefix should appear in `check_setup`'s `keys.public`). Otherwise call `create_public_key` with a name like `<project> (browser)`. Write it where the project keeps public client config — e.g. `VITE_JOURNEYKIT_KEY=jk_pub_…` in the env file the framework loads, plus the variable name with a placeholder in `.env.example`. A public key may also be inlined if the project has no env convention for client config.

The key must also reach production builds: a key only in a git-ignored `.env` leaves the deployed SDK switched off. Since it's public, either put it where the project keeps committed public config, or list "set `VITE_JOURNEYKIT_KEY` in the deployment's environment" in the report.

Done when: the key is in the project, every env file you touched is one the project already uses, and you know how the key reaches production.

## Step 5 — Install the browser SDK

The SDK is a script served from `urls.sdk` (no npm package). It exposes `window.JourneyKit` with `init({ key, host })`, `identify(userId, traits)`, `track(event, properties)`, `reset()`, `flush()`. Always pass `host` (= `urls.host`) to `init`.

Add a small client module that loads the script once and queues calls until it's ready, then call it from the app. Read [references/frameworks.md](references/frameworks.md) for the module and the placement for the detected framework.

1. **Identify** where the signed-in user becomes known: `identify(user.id, { email, name, firstName, plan, … })`. `email` and `name` are stored on the user; other traits become user properties (prefer the standard keys: `firstName`, `lastName`, `plan`, `company`, `companySize`, `source`, `trialEndsAt`, `locale`). Identify runs before any `track` — track calls without an identified user are dropped.
2. **Reset** on logout: `reset()`.
3. **Track** each approved event at the line where it happens (after success, not on click-before-request).
4. **Stage**: send the `stage` trait with identify when the user moves stage — `identify(user.id, { stage: "activation" })` — using only the workspace's stage names. Derive it from product state you already have (onboarding flag, subscription status) rather than inventing new state.
5. **CSP**: if the project sets a Content-Security-Policy, add the JourneyKit host to `script-src` and `connect-src`.

Done when: every approved event has exactly one call site, identify and reset are wired, and the code type-checks.

## Step 6 — Server-side events (if approved)

Payments, renewals, cancellations and anything that happens without the user in the browser are sent from the backend with the secret key. Read [references/server-events.md](references/server-events.md) for the HTTP contract and a helper. Use the env var `JOURNEYKIT_SECRET_KEY` (or the project's naming convention); add it to `.env.example` with an empty value and tell the user to create a secret key under Settings → API keys (`urls.apiKeys`) and set it locally and in their deployment.

Done when: the helper exists, each server event is wired, and sending can never break the request that triggers it (errors are caught and logged).

## Step 7 — Verify

1. Run the project's type-check / lint / build scripts. Fix what you broke.
2. Note the current time (ISO 8601) as `since`.
3. Generate traffic: if you can run the app and sign in, do so and perform one tracked action. Otherwise ask the user to open the app, sign in, and do one tracked action — tell them exactly which.
4. Call `check_setup` with `since` (and `userId` if you know the test user's id). Expect `recent.events > 0`, the event names you wired in `recent.eventNames`, and the `identify`, `track` and `sdk_traffic` checks `ok`.
5. If anything is missing, follow the `troubleshooting` skill, fix, and repeat from 2.

Sending a synthetic identify/track with `curl` and the public key proves the key and network path but creates a real user in the workspace: do it only with the user's OK, with a userId like `journeykit-setup-check`.

Done when: `check_setup` shows the expected events after `since`, or the user has been told precisely what's left for them to do (e.g. set the secret key in production).

## Step 8 — Report

Tell the user, briefly:

- what changed, file by file;
- which events, traits and stages are now sent, and from where;
- what they still need to do (secret key in the deployment's env, deploy, CSP in production);
- what they can do next: build a journey (the `journeys` skill), or view users and events in the dashboard.

No keys in the summary beyond a public key's prefix.
