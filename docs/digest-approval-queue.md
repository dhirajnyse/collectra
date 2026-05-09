# Digest Approval Queue

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Move owner digest drafts into an internal review queue before Collectra sends scheduled notifications.

## What Exists

An owner digest can now move from `draft` to `review_pending`, then to `queued` only after approval.

The platform service creates an `outbound_messages` row with:

- `source: owner_digest` in metadata
- `owner_digest_id`
- `owner_label`
- action, overdue, escalation, and risk counts
- `review_status: pending`

The digest row is updated with:

- `status: review_pending`
- `queued_outbound_message_id`

The platform UI lets a signed-in user choose manual, email, or WhatsApp review channel and optionally enter an owner recipient label. The outbound review panel then lets a signed-in user approve or reject the item. The static demo mirrors the workflow with review, approve, and reject actions on owner digest cards.

## Audit Events

Queueing writes:

- `outbound_message.review_pending`
- `owner_digest.review_pending`

Approval or rejection writes:

- `outbound_message.approved`
- `outbound_message.rejected`
- `owner_digest.approved`
- `owner_digest.rejected`

The paired events make it possible to trace both sides: the digest that was approved and the outbound review item created from it.

## Guardrails

- Queueing a digest does not send email or WhatsApp.
- Queueing a digest does not mark invoices paid.
- Queueing a digest does not change action owners.
- The outbound review item remains workspace-scoped through RLS.
- Provider send functions still require explicit user action and provider settings.
- Provider send functions require `review_status: approved`.

## Next Work

- Add approval roles for admins and finance owners.
- Add richer schedule rules for active digest schedules.
