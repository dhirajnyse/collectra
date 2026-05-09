# Retry Automation Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Let Collectra recover from provider send failures without creating uncontrolled resend loops.

## What Exists

Collectra now has a protected retry runner:

- `run-message-retries`

The function:

- Accepts `POST` requests only.
- Requires `SUPABASE_AUTOMATION_SECRET` through `x-collectra-automation-secret` or a bearer token.
- Uses the Supabase service role only inside the Edge Function.
- Finds failed email and WhatsApp outbound messages below the retry limit.
- Requeues due messages by setting `status` back to `queued`.
- Clears stale provider message IDs so old callbacks do not update a new attempt.
- Increments `retry_count`.
- Writes `retry.queued` history to `outbound_message_events`.
- Writes an audit event for every requeued message.

## Failure Scheduling

Provider send functions now set `next_retry_at` when Resend or WhatsApp Cloud API requests fail.

Retry delay starts at 15 minutes and caps at 60 minutes. The retry runner also accepts older failed messages with no retry timestamp, which keeps migration testing simple.

## Required Secret

```powershell
supabase secrets set SUPABASE_AUTOMATION_SECRET=your-long-random-automation-secret
```

## Deploy Function

```powershell
cd C:\Users\dhiraj\Documents\Codex\Collectra\platform
supabase functions deploy run-message-retries
```

## Dry Check

```powershell
curl -X POST ^
  -H "Content-Type: application/json" ^
  -H "x-collectra-automation-secret: your-long-random-automation-secret" ^
  -d "{\"dryRun\":true,\"batchSize\":10}" ^
  https://your-project.supabase.co/functions/v1/run-message-retries
```

## Scheduled Run

Use Supabase scheduled functions or an external scheduler to call the function every 10 to 15 minutes.

Recommended payload:

```json
{
  "batchSize": 25,
  "maxRetries": 3
}
```

## Guardrails

- The function rejects requests without the automation secret.
- Only `failed` email and WhatsApp messages are eligible.
- `manual` channel messages are never requeued automatically.
- Messages at or above the retry limit are skipped.
- Provider IDs are cleared before a new send attempt.
- Retry attempts are visible in delivery event history.

## Next Work

- Add dashboard filters for retryable failures.
- Add per-workspace retry policy controls.
