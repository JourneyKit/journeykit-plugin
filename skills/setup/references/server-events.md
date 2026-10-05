# Server-side events

Send from the backend what the browser can't see: payments, renewals, cancellations, scheduled jobs, webhooks from billing providers. These requests use a **secret key** from the environment. You write the variable name; the user sets the value.

## HTTP contract

Base URL: `urls.ingest` from `check_setup` (`https://journeykit.io/api/ingest`). Header `Authorization: Bearer <secret key>`, `Content-Type: application/json`.

| Request | Body | Response |
| --- | --- | --- |
| `POST /track` | `{ "userId", "event", "properties"?, "timestamp"? }` or `{ "events": [ … up to 500 ] }` | `202 { "accepted": n }` |
| `POST /identify` | `{ "userId", "email"?, "name"?, "traits"? }` | `200` |

- `userId` is the same id the front end passes to `identify`.
- `event`: letters, digits, `_ . : -`, up to 120 characters.
- `timestamp` (ISO 8601) backfills history; only secret keys may set it.
- Users are created on first sight, so a server event for a user the browser never identified still works.
- Set the stage from the backend with `POST /identify` and `{ "traits": { "stage": "conversion" } }` when the backend is where the move happens (e.g. a subscription webhook).

## Helper (TypeScript / Node 18+)

Adapt the env access to the project (its env module, `process.env`, a config object).

```ts
// e.g. src/server/journeykit.ts
const INGEST = "https://journeykit.io/api/ingest";

async function send(path: "track" | "identify", body: unknown) {
  const key = process.env.JOURNEYKIT_SECRET_KEY;
  if (!key) return;
  try {
    const res = await fetch(`${INGEST}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`[journeykit] ${path} failed: ${res.status} ${await res.text()}`);
  } catch (error) {
    console.warn(`[journeykit] ${path} failed`, error);
  }
}

export const journeykit = {
  track: (userId: string, event: string, properties?: Record<string, unknown>) => send("track", { userId, event, properties }),
  identify: (userId: string, traits: Record<string, unknown>) => send("identify", { userId, traits }),
};
```

Never let it throw into the business logic that calls it. On serverless platforms, `await` the call (or use the platform's `waitUntil`) so the function isn't frozen before the request leaves.

Other languages: the same two POSTs with the language's standard HTTP client, a 5-second timeout, and errors logged, not raised.
