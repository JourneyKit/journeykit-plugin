# Installing the browser SDK, by framework

## The client module (single-page apps and hybrid frameworks)

One module owns the SDK: it injects the script once, calls `init`, and queues calls until the script has loaded. App code imports `journeykit` and never touches `window.JourneyKit`. It is SSR-safe (does nothing on the server) and fails quiet (an ad blocker or offline user never breaks the app).

Adapt three things to the project: the file location, how the key is read (`KEY`), and TypeScript vs JavaScript. `HOST` is `urls.host` from `check_setup`.

```ts
// e.g. src/lib/journeykit.ts
type Traits = Record<string, unknown>;

type JourneyKitSdk = {
  init(options: { key: string; host?: string }): void;
  identify(userId: string, traits?: Traits): void;
  track(event: string, properties?: Traits): void;
  reset(): void;
};

declare global {
  interface Window {
    JourneyKit?: JourneyKitSdk;
  }
}

const HOST = "https://journeykit.io";
const KEY = import.meta.env.VITE_JOURNEYKIT_KEY as string | undefined;

let sdk: Promise<JourneyKitSdk | null> | undefined;

function load(): Promise<JourneyKitSdk | null> {
  if (typeof window === "undefined" || !KEY) return Promise.resolve(null);
  sdk ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `${HOST}/sdk.js`;
    script.async = true;
    script.onload = () => {
      const jk = window.JourneyKit ?? null;
      jk?.init({ key: KEY, host: HOST });
      resolve(jk);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return sdk;
}

export const journeykit = {
  identify(userId: string, traits?: Traits) {
    void load().then((jk) => jk?.identify(userId, traits));
  },
  track(event: string, properties?: Traits) {
    void load().then((jk) => jk?.track(event, properties));
  },
  reset() {
    void load().then((jk) => jk?.reset());
  },
};
```

Calls run in the order they're made, so an `identify` made before a `track` is applied first even while the script is loading.

Identify wherever the signed-in user becomes known on the client, keyed on the user id so it runs once per user, not on every render:

```tsx
useEffect(() => {
  if (user) journeykit.identify(user.id, { email: user.email, name: user.name, plan: user.plan });
}, [user?.id]);
```

## Placement

| Framework | Key from | Where identify/reset go |
| --- | --- | --- |
| **Next.js (App Router)** | `process.env.NEXT_PUBLIC_JOURNEYKIT_KEY` (literal access — Next inlines it at build) | A `"use client"` component rendered in the root layout that receives the user (or reads the session hook) and calls `identify` in an effect; `reset` in the sign-out handler. |
| **Next.js (Pages Router)** | `process.env.NEXT_PUBLIC_JOURNEYKIT_KEY` | `pages/_app` or the auth provider. |
| **Vite SPA** (React, Vue, Svelte, Solid) | `import.meta.env.VITE_JOURNEYKIT_KEY` | The auth provider / session store, or the root component. |
| **TanStack Start / Router** | `import.meta.env.VITE_JOURNEYKIT_KEY`, or the project's env module | An effect in the root route component or where the session is read. |
| **Remix / React Router 7** | Not exposed to the client by default — follow the project's pattern (`window.ENV` from the root loader), or inline the public key | Root route component effect. |
| **SvelteKit** | `import { PUBLIC_JOURNEYKIT_KEY } from "$env/static/public"` | Root `+layout.svelte`, in `onMount` / `$effect`, reading the user from layout data. |
| **Nuxt** | `useRuntimeConfig().public.journeykitKey` (`NUXT_PUBLIC_JOURNEYKIT_KEY`, declared in `runtimeConfig.public`) | A client plugin, `plugins/journeykit.client.ts`, watching the user state. |
| **Astro** | `import.meta.env.PUBLIC_JOURNEYKIT_KEY` | The island or client script that knows the user; for static pages, the server-rendered pattern below. |

## Server-rendered templates (Rails, Django, Laravel, Phoenix, Express views, plain HTML)

Put the tag and `init` in the base layout, and identify only when a user is signed in. Render values with the template engine's JSON escaping, never raw string interpolation.

```html
<script src="https://journeykit.io/sdk.js"></script>
<script>
  JourneyKit.init({ key: "jk_pub_…", host: "https://journeykit.io" });
</script>
<!-- only when signed in; Django: {{ user_traits|json_script:"jk-user" }}, Rails: <%= raw user.id.to_json %> -->
<script>
  JourneyKit.identify(USER_ID_JSON, { email: USER_EMAIL_JSON, name: USER_NAME_JSON });
</script>
```

Call `JourneyKit.reset()` from the logout link's handler (or on the page after logout), and `JourneyKit.track(...)` in page scripts where events happen; events that are only visible server-side go through [server-events.md](server-events.md).

## In-app messages

After `identify`, the SDK shows messages that journeys queue for the user as a banner or modal in a shadow root. Leave the default unless the project has its own toast/notification system and the user wants messages to use it; then pass `onMessage(message, { dismiss })` to `init` and render `message.title`, `message.body`, `message.ctaLabel`/`ctaUrl` with it, calling `dismiss()` when closed.
