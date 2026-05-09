# Next-Best-Action Engine

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Turn collection risk into clear next moves for owners and finance teams.

## What Exists

Collectra now recommends an action for each ranked open invoice.

Actions include:

- `Retry provider send`
- `Approve queued follow-up`
- `Call after engagement`
- `Call finance contact`
- `Send firm follow-up`
- `Send WhatsApp nudge`
- `Owner review`
- `Review playbook hold`
- `Draft reminder`
- `Prepare reminder`
- `Monitor`

Each recommendation includes:

- Action label
- Channel
- Urgency
- Rationale

## Rules

The first rule set is intentionally transparent:

- Failed, bounced, complained, suppressed, or retried messages recommend retry automation.
- Queued outbound messages recommend review and approval.
- Engaged delivery signals on higher-risk invoices recommend a phone call.
- Critical risk recommends direct finance contact.
- High risk recommends firm follow-up using the active customer playbook channel where available.
- Owner-review playbooks recommend human review before follow-up.
- Hold playbooks recommend review before any customer outreach.
- Near-due invoices without AI draft history recommend drafting a reminder.
- Low risk invoices stay on the watchlist.

## Database View

`collection_risk_scores` now includes:

- `recommended_action`
- `action_channel`
- `action_urgency`
- `customer_playbook_id`
- `preferred_channel`
- `escalation_policy`

The view stays advisory. It does not send messages, retry sends, or change payment status.

## Guardrails

- Recommended actions do not execute automatically.
- Provider retries still require `run-message-retries`.
- Customer messages still go through the approved outbound queue.
- Customer playbooks guide recommendations but do not execute sends.
- Payment status remains controlled by explicit invoice/payment writes.
- Users should see the rationale before acting.

## Next Work

- Use tracked action outcomes to tune recommendation rules.
- Add accounting payment history to tune customer playbooks.
