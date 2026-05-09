# Collectra Audit Log Design

## Purpose

B2B finance software needs traceability. Collectra should record important actions so owners can answer:

- Who changed this customer?
- Who marked this invoice paid?
- Who generated this AI follow-up?
- When did a workspace or role change happen?

## Current Version

`v0.7.0 - Audit foundation`

The Supabase schema now includes `audit_logs`, and the platform service layer has a `writeAuditLog` helper.

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
- `member.invited`
- `member.role_changed`

## Security Rules

- Audit logs are workspace-scoped.
- Workspace members can read audit logs.
- Only authenticated workspace members can write audit logs.
- The `actor_id` must match the authenticated user.
- Audit logs should not be edited or deleted from the normal app UI.

## Product Use

Audit logs will power:

- Owner activity feed
- Finance change history
- Security review
- Customer dispute support
- Admin reporting

