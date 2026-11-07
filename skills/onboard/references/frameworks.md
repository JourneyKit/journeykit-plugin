# Installing the browser SDK, by framework

## The client module (projects with a JavaScript build)

Install the npm package with the project's package manager:

```bash
npm install @journeykit.io/browser-sdk   # or pnpm add / yarn add / bun add
```

One module owns the client; app code imports `journeykit` from it. It is SSR-safe (a no-op on the server) and fails quiet: the SDK catches network errors itself, so an ad blocker or offline user never breaks the app. Without a key (e.g. local dev without the env var) it does nothing.

Adapt the file location and TypeScript vs JavaScript to the project. Replace `<urls.host>` with the `urls.host` value from `check_setup`, and `<public key>` with how the project exposes public client config (the variable for each framework is in the table below), or the key itself, which is safe to commit.

```ts
// e.g. src/lib/journeykit.ts
import { createClient, type JourneyKitClient } from "@journeykit.io/browser-sdk";

const host = "<urls.host>";
const publicKey: string | undefined = <public key>;

const noop = {
  identify() {},
  track() {},
  page() {},
  reset() {},
  subscribe: async () => false,
  claim: async () => false,
} as JourneyKitClient;

export const journeykit: JourneyKitClient =
  typeof window !== "undefined" && publicKey ? createClient({ key: publicKey, host }) : noop;
```

`identify` is remembered across page loads (in `localStorage`), so a `track` on a later page still has its user. A `track` before any `identify` is dropped with a console warning.

Identify wherever the signed-in user becomes known on the client, keyed on the user id so it runs once per user, not on every render:

```tsx
useEffect(() => {
  if (user) journeykit.identify(user.id, { email: user.email, name: user.name, plan: user.plan });
}, [user?.id]);
```

Call `journeykit.page()` once per page: in a router's navigation hook in a single-page app, on load otherwise. Before `identify`, views wait in the browser (latest 20) along with where the visitor first came from, and go out when they identify; a visitor who never identifies sends nothing.

## Placement

| Framework | Public key variable | Where identify/reset go |
| --- | --- | --- |
| **Next.js (App Router)** | `NEXT_PUBLIC_JOURNEYKIT_KEY` (Next inlines it at build only when accessed by its full literal name) | A `"use client"` component rendered in the root layout that receives the user (or reads the session hook) and calls `identify` in an effect; `reset` in the sign-out handler. |
| **Next.js (Pages Router)** | `NEXT_PUBLIC_JOURNEYKIT_KEY` | `pages/_app` or the auth provider. |
| **Vite SPA** (React, Vue, Svelte, Solid) | `VITE_JOURNEYKIT_KEY` | The auth provider / session store, or the root component. |
| **TanStack Start / Router** | `VITE_JOURNEYKIT_KEY`, or the project's env module | An effect in the root route component or where the session is read. |
| **Remix / React Router 7** | Not exposed to the client by default. Follow the project's pattern (`window.ENV` from the root loader), or inline the public key | Root route component effect. |
| **SvelteKit** | `PUBLIC_JOURNEYKIT_KEY` from `$env/static/public` | Root `+layout.svelte`, in `onMount` / `$effect`, reading the user from layout data. |
| **Nuxt** | `NUXT_PUBLIC_JOURNEYKIT_KEY`, declared as `journeykitKey` in `runtimeConfig.public` | A client plugin, `plugins/journeykit.client.ts`, watching the user state. |
| **Astro** | `PUBLIC_JOURNEYKIT_KEY` | The island or client script that knows the user; for static pages, the server-rendered pattern below. |

## Server-rendered templates (Rails, Django, Laravel, Phoenix, Express views, plain HTML)

No JavaScript build, so no npm package: load the script instead (`<urls.sdk>` and `<urls.host>` are the values from `check_setup`). Put the tag and `init` in the base layout, and identify only when a user is signed in. Render values with the template engine's JSON escaping, never raw string interpolation.

```html
<script src="<urls.sdk>"></script>
<script>
  JourneyKit.init({ key: "jk_pub_…", host: "<urls.host>" });
  JourneyKit.page();
</script>
<!-- only when signed in; Django: {{ user_properties|json_script:"jk-user" }}, Rails: <%= raw user.id.to_json %> -->
<script>
  JourneyKit.identify(USER_ID_JSON, { email: USER_EMAIL_JSON, name: USER_NAME_JSON });
</script>
```

Call `JourneyKit.reset()` from the logout link's handler (or on the page after logout), and `JourneyKit.track(...)` in page scripts where events happen; events that are only visible server-side go through [server-events.md](server-events.md).
