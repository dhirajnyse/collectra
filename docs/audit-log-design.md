# Collectra Audit Log Design

## Purpose

B2B finance software needs traceability. Collectra should record important actions so owners can answer:

- Who changed this customer?
- Who marked this invoice paid?
- Who generated this AI follow-up?
- When did a workspace or role change happen?

## Current Version

`v3.9.0 - Provider token exchange foundation`

The Supabase schema includes `audit_logs`, the platform service layer has a `writeAuditLog` helper, the AI Edge Function writes `ai_followup.generated` after saving a draft, the outbound approval flow writes queued, pending, approved, and rejected message events, provider flows write settings plus send-result events, retry automation writes `outbound_message.retry_queued`, collection actions write tracked, assigned, escalated, and resolved events, owner digests write created, review, approved, queued, and rejected events, digest schedules write `owner_digest_schedule.saved` and `owner_digest_schedule.run_queued`, payment approvals, split allocations, overpayment credits, and reversals write finance correction events, and `outbound_message_events` keeps provider delivery history.

## Audit Table

`audit_logs` stores:

- `workspace_id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `summary`
- `metadata`
- `created_at`

## Events To Log

Start with:

- `workspace.created`
- `customer.created`
- `customer.updated`
- `deal.created`
- `deal.updated`
- `invoice.created`
- `invoice.updated`
- `invoice.marked_paid`
- `ai_followup.generated`
- `outbound_message.queued`
- `outbound_message.review_pending`
- `outbound_message.approved`
- `outbound_message.rejected`
- `email_settings.saved`
- `whatsapp_settings.saved`
- `outbound_message.sent`
- `outbound_message.failed`
- `outbound_message.retry_queued`
- `collection_action.tracked`
- `collection_action.assigned`
- `collection_action.escalated`
- `collection_action.completed`
- `collection_action.dismissed`
- `owner_digest.created`
- `owner_digest.review_pending`
- `owner_digest.approved`
- `owner_digest.queued`
- `owner_digest.rejected`
- `owner_digest_schedule.saved`
- `owner_digest_schedule.run_queued`
- `payment_match.approved`
- `customer_payment_credit.created`
- `payment_allocation.reversed`
- `member.invited`
- `member.role_changed`

## Security Rules

- Audit logs are workspace-scoped.
- Workspace members can read audit logs.
- Only authenticated workspace members can write audit logs.
- The `actor_id` must match the authenticated user.
- Edge Functions using service-role credentials must validate workspace membership before writing audit logs.
- Provider send Edge Functions must record sent and failed attempts.
- Provider webhook Edge Functions must verify signatures before writing delivery events.
- Retry automation must record every automated requeue.
- Collection action status changes must be audited.
- Audit logs should not be edited or deleted from the normal app UI.

Provider delivery lifecycle events belong in `outbound_message_events`; audit logs should summarize sensitive user and system actions.

## Product Use

Audit logs will power:

- Owner activity feed
- Finance change history
- Security review
- Customer dispute support
- Admin reporting
