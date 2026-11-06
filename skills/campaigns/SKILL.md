---
name: campaigns
description: Run JourneyKit email campaigns from the conversation. Use when asked to send a broadcast or announcement, start or send a newsletter, grow subscribers with a signup form or lead magnet, or import a contact list.
---

# Broadcasts, newsletters, lead magnets and imports

Everything goes through the JourneyKit MCP server: `search_tools` finds operations, `describe_tools` loads their schema, `execute_tool` runs them. Describe an operation before its first execute; the schema is the contract.

- A **broadcast** is one email, sent once to a segment or to every contact with an address.
- A **newsletter** is a publication people subscribe to. Being a contact doesn't make someone a subscriber. An **issue** is a broadcast with a `newsletterId`.
- A **lead magnet** is something given away for an email address.

Automated sequences belong to the `workflows` skill.

## Read the workspace first

`email.postalAddress.get`, `email.domain.get`, `email.branding.get`, `contacts.count`, `segments.list`, `newsletters.list`, `leadMagnets.list`.

Sending needs a postal address in the footer, so collect a missing one from the user and save it with `email.postalAddress.set`. `broadcasts.send` refuses without it. Without a verified sending domain, email goes out from a shared address; mention that when it matters to the user, and use the `onboard` skill's sending step to set one up.

## Broadcasts

1. Propose the audience, subject, preview text and copy.
2. `broadcasts.create` saves a draft. Write the copy as `body` (simple HTML with `{{key}}` placeholders, `<a … data-button>` for a button); the server applies the branding.
3. Give each `{{key}}` a source in `bindings` and a value in `fallbacks`, such as `there` for `Hi {{firstName}}`. A contact with neither isn't sent the email.
4. `broadcasts.audience` for the count. Offer `presets.sendTest` so the user can read it first; it emails the signed-in member.
5. `broadcasts.send`, now or with `at`, only after the user approves that audience count in this conversation. `broadcasts.cancel` stops one that is scheduled or sending.

Report with `broadcasts.get`, `broadcasts.messages` and `broadcasts.links`.

Done when: the broadcast is a draft the user has reviewed, or it is sent or scheduled on their word, and you've stated the audience count.

## Newsletters

1. `newsletters.create` needs a `name` and `replyTo`. `welcomeEmail: true` also creates a **live** workflow that emails each new subscriber, so say so before passing it.
2. Add subscribers: `newsletters.addSegment` for a segment, `newsletters.addSubscribers` by contact id, or `contacts.import` with `newsletterId` for a list. Only `addSubscribers` starts workflows such as the welcome email; the bulk routes start none.
3. Collect signups: `newsletters.setPublic` turns on the page at `publicUrl`, `embedUrl` is an iframe form that works either way, and the SDK's `subscribe(email, { newsletter: slug, name })` serves the product's own form. The form must say what people are signing up for, because the call records their consent.
4. Send an issue: `broadcasts.create` with `newsletterId` (`segmentId` narrows it to part of the subscribers, `subscribersOnly` keeps it off the public page), then the broadcast steps above. `broadcasts.setSubscribersOnly` changes that after sending.

Report with `newsletters.report`, `newsletters.subscribers` and the broadcast reports for each issue.

Opt-outs are permanent from our side: nobody who unsubscribed can be added back by a member, an import or a workflow; only they can return. `newsletters.removeSubscriber` is a member's removal, not an opt-out. `newsletters.archive` can't be undone and stops signups and sends, so it needs the user's word.

## Lead magnets

The `type` is fixed at creation:

| Type | Needs before it takes claims |
| --- | --- |
| `link` | `linkUrl` at creation |
| `page` | `leadMagnets.setPage` with HTML |
| `file` | An upload by the user on the lead magnet's Overview tab, which is dashboard-only |
| `course` | Nothing. Creating it also creates a **live** workflow with three lesson emails, one a day, to edit with `workflows.update` |

Attach `newsletterIds` with `newsletterConsent`: `included` says it plainly on the form, `checkbox` is an unticked box and the choice for EU audiences. Collect claims through `leadMagnets.setPublic` (`publicUrl`), `embedUrl`, or the SDK's `claim(email, { leadMagnet: slug, name, newsletters })`, passing `newsletters: true` only when the box was ticked. Preview the delivery email with `leadMagnets.deliveryPreview`, and report with `leadMagnets.get` and `leadMagnets.claims`.

`leadMagnets.archive` can't be undone, and it needs the user's word. To follow up, trigger a workflow on `lead_magnet_claimed` or `lead_magnet_opened`, switching on `leadMagnetId`.

## Importing contacts

Only import people who agreed to hear from the user; ask where a list came from, and decline purchased or scraped ones. `contacts.import` takes up to 500 rows per call and is safe to repeat. For a large file, send the user to `/contacts/import`, which parses it in the browser. Import starts no workflows and doesn't move `lastSeenAt`. Mark opt-outs from the old tool with `unsubscribed: true`, so they stay off the list. Report the `failed` rows.
