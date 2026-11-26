---
name: emails
description: Write and design JourneyKit emails from ready-made templates and blocks. Use whenever the user asks to write, design, create, change or reuse an email, in whatever words (email, template, preset, newsletter, campaign, blast, drip), and it has to be worked out what that is in JourneyKit, or when asked what email templates or blocks there are.
---

# Writing an email

An email in JourneyKit is a list of **blocks**: JSON objects with a `type` (`heading`, `text`, `button`, `image`, `panel`, `columns`, `steps`, `table`, …) that say what something is, never how it looks. Emails, broadcasts, list issues and lead magnet pages all take the same `blocks`, the dashboard editor edits exactly those blocks, and the workspace's branding draws them when the email is sent. There is a library of designed templates (whole emails) and ready-made blocks to start from. A few `text` blocks are right for a personal note; for everything else, start from the library.

Everything goes through the JourneyKit MCP server. Each operation is its own tool, and its input schema is the contract; this file only names them.

## Work out what "email" means

JourneyKit has no record called an email. What to create depends on **who gets it and when**:

| The user wants | It is | Make it with |
| --- | --- | --- |
| Everyone, or a group, to get it once ("announce", "send an email to", "blast", "campaign") | A **broadcast** | `broadcasts_create` |
| The people who signed up to a list to get it ("this week's newsletter", "tell the waitlist") | An **issue**: a broadcast with a `listId` | `broadcasts_create` |
| Each person to get it when they do something, or some time after ("welcome email", "when their trial ends", "drip", "follow-up") | An **email** sent by an **automation** | `presets_create`, then the `workflows` skill |
| An email to keep and reuse, with no sending yet ("make me a template", "save this design") | An **email** | `presets_create` |
| A design to start from ("what templates do you have") | A library **template**, read-only | `email_templates_list` |
| To change the confirmation or welcome email of a list, or a course lesson | The **email** in that list's or course's automation | `workflows_get` for its `presetId`, then `presets_update` |
| To change the email that delivers a lead magnet | Two plain-text fields, no `blocks` | `lead_magnets_update` (`deliverySubject`, `deliveryMessage`) |
| Content people read after claiming a lead magnet | A `page` **lead magnet** | `lead_magnets_set_page` |
| To see an email that already went out | A sent message | `email_history`, `email_message` |

- **"Template" is ambiguous.** Users mostly mean a saved email of their own: a preset. Check `presets_list` before the library when they say "our" or "my" template, or name one.
- **"Newsletter"** is the list, or one issue of it. "Start a newsletter" creates a list (`campaigns` skill); "write the newsletter" creates an issue, so check `lists_list`.
- **An email sends nothing by itself.** When the user expects people to receive it, say what will send it and offer to set that up. A broadcast doesn't use emails: to send one as a broadcast, copy the `blocks` from `presets_get`.
- **Changing something existing** comes first: look in `presets_list`, `broadcasts_list` (with the `listId` for issues) and the automations for an email the request could mean.
- If who gets it and when are still unclear, ask that one question in the user's words ("Is this going out once, or to each person when something happens?"), not "email or broadcast?". With no one to ask, make an email: it reaches nobody.

Say which one you chose when you propose the email.

## Pick a starting point

1. `email_templates_list`, with a `query` (one or two words: "trial", "newsletter", "sale") or a `category`. Read `description`: it says when each one is sent. Prefer a template when one matches the job, even loosely.
2. `email_templates_get` for the one that fits. It returns its `blocks`, and its `parameters` can go straight into a preset.
3. Nothing fits, or a section is missing: `email_blocks_list` without filters for the names, then with `ids` (or a `group`) for the `blocks` of the ones you need. Its `reference` lists every block type and its fields, for blocks written by hand.

Text fields take a string with a little Markdown (`**bold**`, `*italic*`, `[label](https://…)`, a newline for a line break) or spans. A minimal email:

```json
[
  { "type": "heading", "level": 1, "text": "Welcome, {{firstName}}" },
  { "type": "text", "text": "Here is how to start. Questions? [Read the guide](https://example.com/guide)." },
  { "type": "button", "label": "Open the app", "href": "{{app_url}}" }
]
```

If the user is choosing, offer two or three templates by name with one line each.

## Make it theirs

The template's structure and styles are the design; its words and pictures are samples.

- Rewrite every sample sentence, heading, table row, quote, price, code and name for the user's product. Ship no sample copy and invent no facts, numbers or customer quotes: take them from the user or the product, or cut that block.
- Keep the block types and options (`tone`, `style`, `level`, `variant`) of what you keep. Delete, repeat or reorder whole blocks freely.
- Replace `https://example.com` links and every `{{…_url}}` with a real link, or keep the placeholder and bind it.
- Images under `/api/assets/placeholder-…` are stand-ins. Use a public image URL from the user's product, or remove the image. If one stays for the user to replace in the editor, say so.
- Leave out the logo, footer, postal address, unsubscribe link and "Sent via" line. They are added to every email.
- Blocks have no colours or fonts; the branding supplies them. Don't put HTML in text: it is shown as written.

## Save it

Pass the result as `blocks`:

| For | Tool |
| --- | --- |
| An email (automation emails, course lessons) | `presets_create`, `presets_update` |
| A broadcast or a list issue | `broadcasts_create`, `broadcasts_update` |
| A `page` lead magnet | `lead_magnets_set_page` |

Each `{{key}}` needs a value when it's sent: an email's `parameters` (left out, they're read from the copy) bound in the automation's email step, a broadcast's `bindings` and `fallbacks`. Lead magnet pages take no placeholders.

`templateId` on the create tools uses a template untouched, sample copy included. Use it only when the user wants to edit the copy in the dashboard themselves, and say the sample copy is still in it.

## Change an existing email

`presets_get`, `broadcasts_get` or `lead_magnets_page` returns the email's `blocks`, including ones made in the dashboard. Change what was asked, keep the rest, and send the whole email back: updates replace it, so include the name, subject, preview text, parameters or bindings as they were. If `blocks` is null, the email can't be read; point the user at the dashboard editor instead of overwriting it.

A block that isn't right is refused with the block and the field (`blocks[2].items[0].title: …`); fix that one and send again.

## Check it

`presets_send_test` takes the `blocks` and emails them to the signed-in member with sample values. It sends a real email, so ask first.

Done when: the email is saved, reads as the user's own with no sample copy left, every `{{key}}` has a source, and you've told the user which template or blocks it uses and which images are still stand-ins.

**Variables fill themselves.** A `{{key}}` with no binding takes the contact field of that name (`firstName`, `first_name` and `first name` all mean the first name; `name`, `email`, or any custom property by its key), and in an automation the trigger event's property of that name first. Bind a key only to choose a different source, and add a fallback for contacts who have no value.
