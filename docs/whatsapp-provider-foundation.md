# WhatsApp Provider Foundation

## Current Version

`v1.4.0 - WhatsApp provider foundation`

## Goal

Let Collectra send explicitly approved queued WhatsApp messages without exposing WhatsApp Cloud API secrets in browser code.

## Why This Exists

Many B2B trading and import/export teams close the payment loop on WhatsApp. Collectra should support that channel with the same safe path as email:

1. AI drafts a follow-up.
2. User reviews the message.
3. User queues the approved WhatsApp item.
4. User confirms the send action.
5. Server-side code calls the provider and writes an audit event.

## Data Model

`workspace_whatsapp_settings` stores:

- `workspace_id`
- `created_by`
- `provider`
- `business_label`
- `phone_number_id`
- `display_phone`
- `status`
- `metadata`

The first supported provider is `whatsapp_cloud`.

## Edge Function

`supabase/functions/send-queued-whatsapp`:

- Validates the signed-in Supabase user.
- Confirms the user is a member of the workspace.
- Loads a queued WhatsApp message from `outbound_messages`.
- Loads active workspace WhatsApp settings.
- Calls WhatsApp Cloud API from the server.
- Updates the queue to `sent` or `failed`.
- Writes `outbound_message.sent` or `outbound_message.failed` to `audit_logs`.

## Required Secrets

Set these in Supabase, not in `.env.local`:

```powershell
supabase secrets set WHATSAPP_PROVIDER=whatsapp_cloud
supabase secrets set WHATSAPP_ACCESS_TOKEN=your-whatsapp-cloud-token
supabase secrets set WHATSAPP_GRAPH_API_VERSION=your-current-graph-api-version
```

## Deploy Function

```powershell
cd C:\Users\dhiraj\Documents\Codex\Collectra\platform
supabase functions deploy send-queued-whatsapp
```

## Local Test Path

1. Run `platform/supabase/schema.sql`.
2. Start the platform app.
3. Sign in with magic link.
4. Create or load a workspace.
5. Generate an AI draft from an open invoice.
6. Queue the approved draft for WhatsApp.
7. Save active business phone settings in **WhatsApp provider**.
8. Click **Send WhatsApp** in outbound review.
9. Confirm the message status changes from `queued` to `sent` or `failed`.
10. Confirm the audit trail records the send result.

## Guardrails

- Provider keys stay in Supabase Edge Function secrets.
- Browser code never receives the WhatsApp access token.
- WhatsApp sends require an existing queued message.
- WhatsApp sends require active workspace business phone settings.
- The Edge Function validates workspace membership before sending.
- Failed provider responses update the queue and audit trail.
- Production sending should verify customer opt-in, message-window rules, and approved templates where required.
