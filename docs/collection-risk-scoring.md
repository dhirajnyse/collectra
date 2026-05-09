# Collection Risk Scoring

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Help owners and finance teams decide which open invoices deserve attention first.

## What Exists

Collectra now calculates an explainable risk score for open invoices.

Signals:

- Days overdue or due soon
- Invoice status, including partial payment state
- Invoice amount
- Latest outbound delivery status
- Retry count
- Whether an AI follow-up exists
- Customer playbook risk weight and payment behavior

The public demo shows risk badges, score meters, action badges, and playbook context on the dashboard. The platform app shows a ranked **Collection risk** panel with score reasons, suggested next action, and the customer playbook used.

## Score Bands

- `75-100`: Critical
- `55-74`: High
- `35-54`: Watch
- `0-34`: Steady

## Database View

The schema includes:

- `collection_risk_scores`

The view reads invoices, customers, latest outbound message status, AI follow-up count, and active customer playbooks. It is defined with `security_invoker` so underlying RLS remains the control surface.

The view also exposes:

- `customer_playbook_id`
- `payment_behavior`
- `preferred_channel`
- `escalation_policy`
- `playbook_risk_weight`
- `recommended_action`
- `action_channel`
- `action_urgency`

## Guardrails

- Risk score does not change payment status.
- Risk score does not send messages automatically.
- Risk reasons should stay visible so users understand the score.
- Playbook risk weights remain internal advisory signals.
- Follow-up automation should continue through the approved outbound queue.
- Workspace-scoped RLS remains the source of access control.

## Next Work

- Add risk filters to the invoice board.
- Use tracked action outcomes to improve future scoring.
- Add customer-level risk history and payment behavior trends.
