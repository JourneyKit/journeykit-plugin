# Server-side events

Send from the backend what the browser can't see: payments, renewals, cancellations, scheduled jobs, webhooks from billing providers, and in products without a JavaScript front end, identify and track altogether. These requests use the workspace's **public key** (`jk_pub_…`), the same one the browser uses, from the backend's env as `JOURNEYKIT_KEY`. Only backfilling history (setting `timestamp`) needs a secret key, which the user creates and sets themselves.

## HTTP contract

Base URL: `urls.ingest` from `check_setup` (`https://journeykit.io/api/ingest`). Header `Authorization: Bearer <public key>`, `Content-Type: application/json`.

| Request | Body | Response |
| --- | --- | --- |
| `POST /track` | `{ "contactId", "event", "properties"?, "timestamp"? }` or `{ "events": [ … up to 500 ] }` | `202 { "accepted": n }` |
| `POST /identify` | `{ "contactId", "email"?, "name"?, "properties"? }` | `200` |

- `contactId` is the same id the front end passes to `identify`.
- `event`: letters, digits, `_ . : -`, up to 120 characters.
- `timestamp` (ISO 8601) backfills history; only secret keys may set it (a public key with `timestamp` answers 403). Leave it out for live events.
- Contacts are created on first sight, so a server event for someone the browser never identified still works.
- Properties merge key by key; keys you leave out stay as they are.
- Signups from a server form go to `POST https://journeykit.io/api/subscribe` with the same header: `{ "newsletter": slug, "email", "name"? }`, or `{ "leadMagnet": slug, "email", "name"?, "newsletters"? }`. It answers `200` for every outcome, so a form never reveals whether an address is known.

## Helper (TypeScript / Node 18+)

Adapt the env access to the project (its env module, `process.env`, a config object).

```ts
// e.g. src/server/journeykit.ts
const INGEST = "https://journeykit.io/api/ingest";

async function send(path: "track" | "identify", body: unknown) {
  const key = process.env.JOURNEYKIT_KEY;
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
  track: (contactId: string, event: string, properties?: Record<string, unknown>) => send("track", { contactId, event, properties }),
  identify: (contactId: string, properties: Record<string, unknown>) => send("identify", { contactId, properties }),
};
```

Never let it throw into the business logic that calls it. On serverless platforms, `await` the call (or use the platform's `waitUntil`) so the function isn't frozen before the request leaves.

Other languages: the same two POSTs with the language's standard HTTP client, a 5-second timeout, and errors logged, not raised.
