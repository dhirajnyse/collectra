# Owner Digest Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Turn assigned collection actions into short owner briefing drafts before Collectra sends scheduled notifications.

## What Exists

Collectra now stores owner digest runs in `owner_digest_runs`:

- `owner_label`
- `subject`
- `body`
- `action_count`
- `overdue_count`
- `escalated_count`
- `total_risk_score`
- `status`
- `metadata`

The platform UI groups open collection actions by owner and can create a digest draft for each owner. The public demo also has a small digest action on tracked risk cards so GitHub Pages testing shows the new workflow.

In v2.4.0, a draft digest can also be queued into outbound review before any delivery integration sends it. In v2.5.0, owner digest schedules save cadence, channel, recipient, and next-run configuration. In v2.6.0, the protected runner can turn due schedules into queued digest review items.

## Database

`owner_digest_runs` is workspace-scoped and protected by RLS.

Indexes:

- `idx_owner_digest_runs_workspace_owner_created`
- `idx_owner_digest_runs_workspace_status`

The digest body is a saved draft, not a delivery event. This keeps the future notification sender clean because email, WhatsApp, and scheduler logic can later read an approved digest instead of building one ad hoc.

## Audit Events

Digest creation writes:

- `owner_digest.created`

The audit metadata includes owner label, action count, overdue count, escalated count, and total risk score.

## Guardrails

- Digest creation does not send email or WhatsApp.
- Digest queueing does not send email or WhatsApp.
- Digest schedule saving does not send email or WhatsApp.
- Digest schedule running does not send email or WhatsApp.
- Digest creation does not mark invoices paid.
- Digest creation does not change action assignment.
- Digest drafts remain workspace-scoped through RLS.
- Digest content should be treated as sensitive operational data.

## Next Work

- Add delivery from outbound review after explicit approval.
- Link owner labels to real workspace users and invitation flows.
