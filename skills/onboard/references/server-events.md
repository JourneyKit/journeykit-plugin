# Server-side events

Everything JourneyKit learns about contacts comes from the backend: sign-ups, logins, profile changes, payments, renewals, cancellations, scheduled jobs and webhooks from billing providers. There is no browser SDK and no public key. Requests carry a workspace API key (`jk_live_…`), which can do everything, so it lives in the backend's environment or secret store only. The user creates it under Settings → API keys (`urls.apiKeys` from `check_setup`).

## HTTP contract

Base URL: `urls.ingest` from `check_setup`. Header `Authorization: Bearer <key>`, `Content-Type: application/json`.

| Request | Body | Response |
| --- | --- | --- |
| `POST /track` | `{ "contactId", "event", "properties"?, "timestamp"? }` or `{ "events": [ … up to 500 ] }` | `202 { "accepted": n }` |
| `POST /identify` | `{ "contactId", "email"?, "name"?, "properties"? }` | `200` |

- `contactId` is the product's stable user id, the same everywhere, never the email.
- `event`: letters, digits, `_ . : -`, up to 120 characters.
- `timestamp` (ISO 8601) backfills history. Leave it out for live events.
- Contacts are created on first sight, so a track for someone you haven't identified yet still works, but identify first to set their email and fields.
- Properties merge key by key; keys you leave out stay as they are.
- Signups from a server form go to `POST /api/subscribe` on `urls.host` with the same header: `{ "list": slug, "email", "name"? }`, or `{ "leadMagnet": slug, "email", "name"?, "lists"? }`. It answers `200` for every outcome, so a form never reveals whether an address is known, and a signup sends the list's confirmation email. A call with the key is treated as the product's own server vouching for the address: the person joins at once and gets no confirmation email.

## Helper (TypeScript / Node 18+)

Replace `<urls.ingest>` with the value from `check_setup`, and `<key>` with how the project's backend reads secrets: its config module or `env` object. Never write the key itself into the code.

```ts
// e.g. src/server/journeykit.ts
const ingestUrl = "<urls.ingest>";
const apiKey: string | undefined = <key>;

async function send(path: "track" | "identify", body: unknown) {
  if (!apiKey) return;
  try {
    const res = await fetch(ingestUrl + "/" + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
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
