# Digest Runner Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Run due owner digest schedules from a protected server boundary and queue the results for review without sending provider messages.

## What Exists

The `run-owner-digest-schedules` Supabase Edge Function:

- Requires `SUPABASE_AUTOMATION_SECRET`
- Accepts the secret through `x-collectra-automation-secret` or bearer auth
- Supports `dryRun`
- Can filter by `workspaceId`
- Reads active due `owner_digest_schedules`
- Builds owner digest drafts from open `collection_actions`
- Creates a pending outbound review item in `outbound_messages`
- Advances `next_run_at`
- Writes audit events

## Audit Events

The runner writes:

- `owner_digest.created`
- `outbound_message.review_pending`
- `owner_digest.review_pending`
- `owner_digest_schedule.run_queued`

## Dry Run

Use dry run before scheduling:

```powershell
curl -X POST `
  https://your-project.supabase.co/functions/v1/run-owner-digest-schedules `
  -H "x-collectra-automation-secret: your-long-random-automation-secret" `
  -H "Content-Type: application/json" `
  -d "{\"dryRun\":true,\"batchSize\":10}"
```

## Deploy

```powershell
supabase functions deploy run-owner-digest-schedules
supabase secrets set SUPABASE_AUTOMATION_SECRET=your-long-random-automation-secret
```

## Guardrails

- The runner does not send email or WhatsApp.
- The runner does not mark invoices paid.
- The runner only creates digest records and outbound review items.
- The runner leaves provider delivery blocked until approval.
- The runner uses service-role access only inside the Edge Function.
- The automation secret must never be exposed in browser code.

## Next Work

- Add schedule windows and local timezone support.
- Add approval roles for finance admins.
