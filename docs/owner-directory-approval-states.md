# Owner Directory And Approval States

Current version:
`v3.9.0 - Provider token exchange foundation`

## Purpose

Give Collectra a safer operational model before launch: finance work routes to known owner profiles, and provider delivery is blocked until a queued message is explicitly approved.

## Owner Directory

The schema now includes `workspace_owner_profiles`.

Each owner profile stores:

- `label`
- `display_name`
- `work_email`
- `phone`
- `role_title`
- `preferred_channel`
- `status`

Collection actions, owner digest runs, and digest schedules can store `owner_profile_id` while keeping the readable `owner_label`. This preserves compatibility with earlier demo data while creating a path toward real workspace users.

## Approval States

`outbound_messages` now has `review_status`:

- `pending`
- `approved`
- `rejected`

Owner digest queueing creates a pending outbound review item. Approving the item marks the outbound message approved and moves the related digest into `queued`. Rejecting the item cancels the outbound message and marks the related digest rejected.

## Provider Guardrail

`send-queued-email` and `send-queued-whatsapp` now reject sends unless:

- the message status is `queued`
- the message `review_status` is `approved`
- the provider settings and workspace membership checks pass

This means the schedule runner can prepare work, but it cannot silently send email or WhatsApp messages.

## Audit Events

New or expanded review events:

- `outbound_message.review_pending`
- `outbound_message.approved`
- `outbound_message.rejected`
- `owner_digest.review_pending`
- `owner_digest.approved`
- `owner_digest.rejected`

## Next Work

- Customer-level collection playbooks
- Approval roles for finance admins versus members
- Owner profile invitations linked to real auth users
