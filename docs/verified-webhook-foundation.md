# Verified Webhook Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Let Collectra receive provider delivery callbacks without trusting unsigned public HTTP requests.

## Why This Exists

Provider webhooks are public endpoints. Attackers can send fake requests unless every callback is verified before it changes delivery status.

Collectra now has two verified webhook receivers:

- `receive-resend-webhook`
- `receive-whatsapp-webhook`

## Resend Receiver

`receive-resend-webhook`:

- Accepts `POST` requests only.
- Reads the raw request body before JSON parsing.
- Verifies `svix-id`, `svix-timestamp`, and `svix-signature`.
- Rejects signatures outside a five-minute replay window.
- Maps Resend email events into Collectra delivery statuses.
- Writes provider history to `outbound_message_events`.
- Updates the matching `outbound_messages` row by `provider_message_id`.

Required secret:

```powershell
supabase secrets set RESEND_WEBHOOK_SECRET=your-resend-webhook-signing-secret
```

## WhatsApp Receiver

`receive-whatsapp-webhook`:

- Accepts Meta's `GET` challenge flow for webhook registration.
- Verifies the configured `hub.verify_token`.
- Verifies `POST` payloads with `x-hub-signature-256`.
- Extracts WhatsApp `statuses` callbacks.
- Maps `sent`, `delivered`, `read`, and `failed` into Collectra delivery statuses.
- Writes provider history to `outbound_message_events`.
- Updates the matching `outbound_messages` row by `provider_message_id`.

Required secrets:

```powershell
supabase secrets set WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-whatsapp-webhook-verify-token
supabase secrets set WHATSAPP_APP_SECRET=your-meta-app-secret
```

## Deploy Functions

```powershell
cd C:\Users\dhiraj\Documents\Codex\Collectra\platform
supabase functions deploy receive-resend-webhook
supabase functions deploy receive-whatsapp-webhook
```

## Guardrails

- Unsigned Resend requests are rejected.
- WhatsApp challenge requests must match the verify token.
- WhatsApp status callbacks must match the app-secret HMAC signature.
- Duplicate provider event IDs are ignored.
- Delivery event reads remain workspace-scoped by RLS.
- Webhook events should update delivery history, not payment status.

## Next Work

- Add dashboard filters for retryable failures and messages at the retry limit.
- Add customer-level payment behavior history.
