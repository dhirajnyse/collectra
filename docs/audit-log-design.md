# Collectra Audit Log Design

## Purpose

B2B finance software needs traceability. Collectra should record important actions so owners can answer:

- Who changed this customer?
- Who marked this invoice paid?
- Who generated this AI follow-up?
- When did a workspace or role change happen?

## Current Version

`v1.3.0 - Email provider foundation`

The Supabase schema includes `audit_logs`, the platform service layer has a `writeAuditLog` helper, the AI Edge Function writes `ai_followup.generated` after saving a draft, the outbound approval flow writes `outbound_message.queued`, and the email provider flow writes sender and send-result events.

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
- `email_settings.saved`
- `outbound_message.sent`
- `outbound_message.failed`
- `member.invited`
- `member.role_changed`

## Security Rules

- Audit logs are workspace-scoped.
- Workspace members can read audit logs.
- Only authenticated workspace members can write audit logs.
- The `actor_id` must match the authenticated user.
- Edge Functions using service-role credentials must validate workspace membership before writing audit logs.
- Provider send Edge Functions must record sent and failed attempts.
- Audit logs should not be edited or deleted from the normal app UI.

## Product Use

Audit logs will power:

- Owner activity feed
- Finance change history
- Security review
- Customer dispute support
- Admin reporting
