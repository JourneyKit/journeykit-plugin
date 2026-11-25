# Where the backend calls go, by framework

JourneyKit has no browser client. Identify and track are sent from the backend with a workspace API key (`jk_live_…`) through the helper in [server-events.md](server-events.md). The key is read from server-only configuration, never from a variable a browser bundle can see (`NEXT_PUBLIC_*`, `VITE_*`, `PUBLIC_*`).

Something that happens in the browser (a button click, a finished onboarding step) goes to the backend first, through the project's own API route, server action or form handler, and the backend sends the event after it has succeeded.

| Framework | Identify | Track |
| --- | --- | --- |
| **Next.js (App Router)** | In the sign-up and sign-in route handlers or server actions, or the auth library's callbacks (`events.signIn`, `databaseHooks`). | In the server action or route handler that does the work; billing events in the payment webhook route. |
| **Next.js (Pages Router)** | In `pages/api/*` handlers and the auth callbacks. | In the API route that does the work. |
| **Vite SPA, React, Vue, Svelte** | In the backend the SPA talks to, after sign-up, login and profile updates. | In that backend's handler for the action. |
| **TanStack Start / Router** | In server functions and the auth hooks. | In the server function that does the work. |
| **Remix / React Router 7** | In the `action` that signs up or in. | In the `action` or `loader` that does the work. |
| **SvelteKit** | In `+page.server.ts` actions and `hooks.server.ts`. | In the form action or `+server.ts` endpoint. |
| **Nuxt** | In `server/api/*` handlers and auth hooks. | In the Nitro handler that does the work. |
| **Astro** | In API endpoints (`src/pages/api/*`). | In the endpoint that does the work. |
| **Rails, Django, Laravel, Phoenix, Express** | After sign-up, login and profile changes in the controller, or the auth framework's signal or event. | In the controller, service or job where the action succeeds; billing events in the webhook handler. |

Pass the same stable user id as `contactId` everywhere, never the email. Do the call after the work has succeeded, and never let a failed call break the request around it.
