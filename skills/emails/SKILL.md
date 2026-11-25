---
name: emails
description: Write and design JourneyKit emails from ready-made templates and blocks. Use whenever the user asks to write, design, create, change or reuse an email, in whatever words (email, template, preset, newsletter, campaign, blast, drip), and it has to be worked out what that is in JourneyKit, or when asked what email templates or blocks there are.
---

# Writing an email

JourneyKit has a library of designed templates (whole emails) and blocks (parts of one). Presets, broadcasts, list issues and lead magnet pages all take the same HTML `body`, and anything made from the library opens in the dashboard editor block by block. A paragraph-only `body` is right for a personal note; for everything else, start from the library.

Everything goes through the JourneyKit MCP server. Each operation is its own tool, and its input schema is the contract; this file only names them.

## Work out what "email" means

JourneyKit has no record called an email. What to create depends on **who gets it and when**:

| The user wants | It is | Make it with |
| --- | --- | --- |
| Everyone, or a group, to get it once ("announce", "send an email to", "blast", "campaign") | A **broadcast** | `broadcasts_create` |
| The people who signed up to a list to get it ("this week's newsletter", "tell the waitlist") | An **issue**: a broadcast with a `listId` | `broadcasts_create` |
| Each person to get it when they do something, or some time after ("welcome email", "when their trial ends", "drip", "follow-up") | A **preset** sent by a **workflow** | `presets_create`, then the `workflows` skill |
| An email to keep and reuse, with no sending yet ("make me a template", "save this design") | A **preset** | `presets_create` |
| A design to start from ("what templates do you have") | A library **template**, read-only | `email_templates_list` |
| To change the confirmation or welcome email of a list, or a course lesson | The **preset** in that list's or course's workflow | `workflows_get` for its `presetId`, then `presets_update` |
| To change the email that delivers a lead magnet | Two plain-text fields, no `body` | `lead_magnets_update` (`deliverySubject`, `deliveryMessage`) |
| Content people read after claiming a lead magnet | A `page` **lead magnet** | `lead_magnets_set_page` |
| To see an email that already went out | A sent message | `email_history`, `email_message` |

- **"Template" is ambiguous.** Users mostly mean a saved email of their own: a preset. Check `presets_list` before the library when they say "our" or "my" template, or name one.
- **"Newsletter"** is the list, or one issue of it. "Start a newsletter" creates a list (`campaigns` skill); "write the newsletter" creates an issue, so check `lists_list`.
- **A preset sends nothing by itself.** When the user expects people to receive it, say what will send it and offer to set that up. A broadcast doesn't use presets: to send one as a broadcast, copy the `body` from `presets_get`.
- **Changing something existing** comes first: look in `presets_list`, `broadcasts_list` (with the `listId` for issues) and the workflows for an email the request could mean.
- If who gets it and when are still unclear, ask that one question in the user's words ("Is this going out once, or to each person when something happens?"), not "preset or broadcast?". With no one to ask, make a preset: it reaches nobody.

Say which one you chose when you propose the email.

## Pick a starting point

1. `email_templates_list`, with a `query` (one or two words: "trial", "newsletter", "sale") or a `category`. Read `description`: it says when each one is sent. Prefer a template when one matches the job, even loosely.
2. `email_templates_get` for the one that fits. Its `body` is HTML in the workspace's branding, and its `parameters` can go straight into a preset.
3. Nothing fits, or a section is missing: `email_blocks_list` without filters for the names, then with `ids` (or a `group`) for the HTML of the ones you need. Its `syntax` text covers blocks written by hand.

If the user is choosing, offer two or three templates by name with one line each.

## Make it theirs

The template's structure and styles are the design; its words and pictures are samples.

- Rewrite every sample sentence, heading, table row, quote, price, code and name for the user's product. Ship no sample copy and invent no facts, numbers or customer quotes: take them from the user or the product, or cut that block.
- Keep the tags, `data-*` attributes and inline styles of what you keep. Delete, repeat or reorder whole blocks freely.
- Replace `https://example.com` links and every `{{…_url}}` with a real link, or keep the placeholder and bind it.
- Images under `/api/assets/placeholder-…` are stand-ins. Use a public image URL from the user's product, or remove the image. If one stays for the user to replace in the editor, say so.
- Leave out the logo, footer, postal address, unsubscribe link and "Sent via" line. They are added to every email.
- Add no colours of your own; the branding supplies them.

## Save it

Pass the result as `body`:

| For | Tool |
| --- | --- |
| A preset (workflow emails, course lessons) | `presets_create`, `presets_update` |
| A broadcast or a list issue | `broadcasts_create`, `broadcasts_update` |
| A `page` lead magnet | `lead_magnets_set_page` |

Each `{{key}}` needs a value when it's sent: a preset's `parameters` (left out, they're read from the copy) bound in the workflow's email step, a broadcast's `bindings` and `fallbacks`. Lead magnet pages take no placeholders.

`templateId` on the create tools uses a template untouched, sample copy included. Use it only when the user wants to edit the copy in the dashboard themselves, and say the sample copy is still in it.

## Change an existing email

`presets_get`, `broadcasts_get` or `lead_magnets_page` returns the email as a `body`, including ones made in the dashboard. Change what was asked, keep the rest, and send the whole email back: updates replace it, so include the name, subject, preview text, parameters or bindings as they were. If `body` is null, the email can't be read as HTML; point the user at the dashboard editor instead of overwriting it.

## Check it

`presets_send_test` takes the `body` and emails it to the signed-in member with sample values. It sends a real email, so ask first.

Done when: the email is saved, reads as the user's own with no sample copy left, every `{{key}}` has a source, and you've told the user which template or blocks it uses and which images are still stand-ins.
