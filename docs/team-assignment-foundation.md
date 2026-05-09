# Team Assignment Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Make every collection action visibly owned by a person or function before full team management exists.

## What Exists

Collectra now stores owner assignment metadata on tracked collection actions:

- `owner_label`
- `assignment_note`
- `assigned_at`
- `assigned_by`

The platform UI shows owner chips in the escalation cockpit and tracked action list. Open actions can be reassigned from the owner work panel using simple labels:

- `Finance owner`
- `Sales owner`
- `Ops owner`
- `Dhiraj`

This started as label-based accountability. In v2.7.0, labels can now resolve to `workspace_owner_profiles` for contact routing while still staying separate from workspace permissions.

## Database

`collection_actions` now includes assignment fields and a partial index for open owner work:

- `idx_collection_actions_workspace_owner_status`

The schema includes `alter table ... add column if not exists` statements so existing v2.1 workspaces can move forward without recreating the table.

## Audit Events

Assignment writes:

- `collection_action.assigned`

The audit metadata includes invoice, customer, owner label, assignment note, and risk score.

## Guardrails

- Assignment does not change workspace permissions.
- Assignment does not send customer messages.
- Assignment does not mark invoices paid.
- Assignment remains workspace-scoped through RLS.
- User-directory assignment should later replace labels with real workspace member records.

## Next Work

- Use owner digest drafts for scheduled approval workflows.
- Add real member assignment with workspace profiles.
- Add customer-level collection playbooks.
