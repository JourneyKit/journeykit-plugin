---
name: campaigns
description: Run JourneyKit email campaigns from the conversation. Use when asked to send a broadcast or announcement, start or send a newsletter, start a waitlist or mailing list, grow subscribers with a signup form or lead magnet, or import a contact list.
---

# Broadcasts, lists, lead magnets and imports

Everything goes through the JourneyKit MCP server. Each operation is its own tool, and its input schema is the contract; this file only names them.

- A **broadcast** is one email, sent once to a segment or to every contact with an address.
- A **list** is people who agreed to hear from the user: a newsletter, a waitlist, product updates. They're all the same thing; `preset` (`newsletter`, `waitlist`, `blank`) only prefills the wording of the emails made for it. Being a contact doesn't make someone a member. An **issue** is a broadcast with a `listId`.
- A **lead magnet** is something given away for an email address.

Automated sequences belong to the `workflows` skill, and writing the email itself to the `emails` skill.

## Read the workspace first

`email_postal_address_get`, `email_domain_get`, `email_branding_get`, `contacts_count`, `segments_list`, `lists_list`, `lead_magnets_list`.

Sending needs a postal address in the footer, so collect a missing one from the user and save it with `email_postal_address_set`. `broadcasts_send` refuses without it. Without a verified sending domain, email goes out from a shared address; mention that when it matters to the user, and use the `onboard` skill's sending step to set one up.

## Broadcasts

1. Propose the audience, subject, preview text, copy, and the template or blocks to build it from (`email_templates_list`, `email_blocks_list`).
2. `broadcasts_create` saves a draft. Write the email as `body` with the `emails` skill: a template or blocks with the copy rewritten and `{{key}}` placeholders; the server applies the branding.
3. Give each `{{key}}` a source in `bindings` and a value in `fallbacks`, such as `there` for `Hi {{firstName}}`. A contact with neither isn't sent the email.
4. `broadcasts_audience` for the count. Offer `presets_send_test` with the `body` so the user can read it first; it emails the signed-in member.
5. `broadcasts_send`, now or with `at`, only after the user approves that audience count in this conversation. `broadcasts_cancel` stops one that is scheduled or sending.

Report with `broadcasts_get`, `broadcasts_messages` and `broadcasts_links`.

Done when: the broadcast is a draft the user has reviewed, or it is sent or scheduled on their word, and you've stated the audience count.

## Lists

1. `lists_create` needs only a `name`; `preset` is optional, and `replyTo` is optional (empty means replies go to the sender address, so ask for one when the workspace sends from the shared address). It always creates a **live** confirmation automation (the email with the confirm link, editable with `workflows_update`). `welcomeEmail: true` adds a second **live** automation that greets people once they confirm, so say so before passing it. `requireConfirmation: true` holds signups back until they click; leave it off for single opt-in, where they join at once and show as not confirmed until they click.
2. Add members: `lists_add_segment` for a segment, `lists_add_subscribers` by contact id, or `contacts_import` with `listId` for a file. These count as confirmed already and send no confirmation email. Only `addSubscribers` starts automations; the bulk routes start none.
3. Collect signups: `lists_set_public` turns on the page at `publicUrl`, and `embedUrl` is an iframe form that works either way. The product's own form can instead post to `POST /api/subscribe` from its backend with an API key (`{ "list": slug, "email", "name"? }`); there is no browser client. The form must say what people are signing up for, because the call records their consent. A form signup always creates the contact and sends the confirmation email; with `requireConfirmation` on, the person is `pending` and gets nothing until they click the link. A backend call with a key counts as the product vouching for the address, so the person joins at once with no confirmation email.
4. Send an issue: `broadcasts_create` with `listId` (`segmentId` narrows it to part of the members, `subscribersOnly` keeps it off the public page, `confirmedOnly` skips people who never clicked), then the broadcast steps above. `broadcasts_set_subscribers_only` changes that after sending. A waitlist's launch announcement is an issue sent to the list.

`requireConfirmation` can only be turned on while the confirmation automation is running: `lists_get` reports `confirmationReady`, and if it's false, activate the automation named in `confirmationWorkflowId` first. To confirm someone yourself, for example when the product verifies their email, use the automation step `confirm_subscription` (`listId`); it never undoes an opt-out. `lists_remove_unconfirmed` clears out signups who never confirmed and deletes a contact only when the signup was all there was to it; ask the user first.

Report with `lists_report`, `lists_subscribers` (`status: "pending"` for people waiting, `unconfirmed: true` for members who never clicked) and the broadcast reports for each issue.

Opt-outs are permanent from our side: nobody who unsubscribed can be added back by a member, an import or an automation; only they can return. `lists_remove_subscriber` is a member's removal, not an opt-out. `lists_archive` can't be undone and stops signups and sends, so it needs the user's word.

## Lead magnets

The `type` is fixed at creation:

| Type | Needs before it takes claims |
| --- | --- |
| `link` | `linkUrl` at creation |
| `page` | `lead_magnets_set_page` with a `body`, written like an email (`emails` skill) |
| `file` | An upload by the user on the lead magnet's Overview tab, which is dashboard-only |
| `course` | Nothing. Creating it also creates a **live** automation with three lesson emails, one a day, to edit with `workflows_update`; write the lessons with `presets_update` (`emails` skill) |

Attach `listIds` (a claim that joins a list follows that list's confirmation rule) with `listConsent`: `included` says it plainly on the form, `checkbox` is an unticked box and the choice for EU audiences. Collect claims through `lead_magnets_set_public` (`publicUrl`), `embedUrl`, or the backend posting `{ "leadMagnet": slug, "email", "name"?, "lists"? }` to `POST /api/subscribe` with an API key, passing `lists: true` only when the box was ticked. Preview the delivery email with `lead_magnets_delivery_preview`, and report with `lead_magnets_get` and `lead_magnets_claims`.

`lead_magnets_archive` can't be undone, and it needs the user's word. To follow up, trigger an automation on `lead_magnet_claimed` or `lead_magnet_opened`, switching on `leadMagnetId`.

## Importing contacts

Only import people who agreed to hear from the user; ask where a list came from, and decline purchased or scraped ones. `contacts_import` takes up to 500 rows per call and is safe to repeat. For a large file, send the user to `/contacts/import`, which parses it in the browser. Import starts no automations and doesn't move `lastSeenAt`. Mark opt-outs from the old tool with `unsubscribed: true`, so they stay off the list. Report the `failed` rows.
