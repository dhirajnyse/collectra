# Digest Schedule Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Save owner digest cadence, channel, and recipient rules before Collectra runs any background notification automation.

## What Exists

Collectra now stores digest schedule rules in `owner_digest_schedules`:

- `owner_label`
- `cadence`
- `channel`
- `recipient`
- `status`
- `next_run_at`
- `last_queued_at`
- `metadata`

The platform UI can save a schedule from the owner digest panel. The static demo mirrors the workflow with a Schedule action on tracked risk cards.

## Database

`owner_digest_schedules` is workspace-scoped and protected by RLS.

Indexes:

- `idx_owner_digest_schedules_workspace_status`
- `idx_owner_digest_schedules_workspace_owner`

Each workspace can have one schedule per owner label.

## Audit Events

Schedule saves write:

- `owner_digest_schedule.saved`

The audit metadata includes owner label, cadence, channel, recipient, status, and next run time.

## Guardrails

- Saving a schedule does not send email or WhatsApp.
- Saving a schedule does not queue a digest.
- Saving a schedule does not mark invoices paid.
- Schedule rules remain workspace-scoped through RLS.
- A protected runner must later validate workspace scope before acting on schedules.

## Next Work

- Add owner recipient records through workspace profiles.
- Add schedule windows and local timezone support.
- Add richer schedule rules such as weekday and local send window.
