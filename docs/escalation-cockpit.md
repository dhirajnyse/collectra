# Escalation Cockpit

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Make stale owner follow-up visible before cash risk quietly ages.

## What Exists

Collectra now watches open tracked collection actions and shows them in an escalation cockpit.

The cockpit prioritizes:

- Already escalated actions
- Actions past their due time
- Actions due within 24 hours
- Higher risk scores

Users can escalate an open action up to level 3. Escalation stores:

- `escalation_level`
- `escalation_reason`
- `escalated_at`
- `last_escalated_by`

## Database

`collection_actions` now includes escalation fields and a partial index for open escalated work:

- `idx_collection_actions_workspace_escalation`

The schema also includes `alter table ... add column if not exists` statements so existing v2.0 workspaces can move forward without recreating the table.

## Audit Events

Escalation writes:

- `collection_action.escalated`

The audit metadata includes invoice, customer, risk score, escalation level, and escalation reason.

## Guardrails

- Escalation does not send customer messages.
- Escalation does not mark invoices paid.
- Only open actions can be escalated.
- Escalation is capped at level 3.
- Workspace RLS remains the access-control boundary.

## Next Work

- Add real member assignment beyond owner labels.
- Use owner digest drafts for scheduled approval workflows.
- Add customer-level collection playbooks.
