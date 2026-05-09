# Action Tracking And Owner Alerts

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Turn recommended collection moves into accountable owner work.

## What Exists

Collectra now lets signed-in workspace users track the recommended action for a risky invoice.

Tracked actions include:

- Invoice and customer reference
- Action label
- Channel
- Urgency
- Rationale
- Risk score and band
- Due timestamp
- Status: `open`, `completed`, or `dismissed`

The platform UI shows urgent owner alerts above the collection risk cards, a track button in the action queue, and an owner work panel for completing or dismissing open actions.

Tracked actions also feed the escalation cockpit when owner work is open, due soon, overdue, or already escalated.

## Database

The schema includes:

- `collection_actions`

The table is workspace-scoped and protected with RLS. Members can read actions for their workspace, authenticated members can create actions as themselves, and workspace members can update action status.

Useful indexes:

- `idx_collection_actions_workspace_status_due`
- `idx_collection_actions_invoice_status`

## Audit Events

The service layer writes audit logs for:

- `collection_action.tracked`
- `collection_action.assigned`
- `collection_action.completed`
- `collection_action.dismissed`
- `collection_action.open`

## Guardrails

- Tracking an action does not send a customer message.
- Completing an action does not mark an invoice paid.
- Dismissing an action keeps the history visible in the owner work panel.
- Recommended actions remain explainable before they become tracked work.
- Workspace RLS remains the access-control boundary.

## Next Work

- Add real member assignment beyond owner labels.
- Add customer-level collection playbooks.
- Use owner digest drafts for scheduled approval workflows.
