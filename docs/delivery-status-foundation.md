# Delivery Status Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Show what happened after a collection follow-up was sent, without exposing provider secrets or accepting unverified webhook traffic.

## Why This Exists

Once Collectra sends email or WhatsApp follow-ups, finance teams will ask:

1. Was the message queued?
2. Did the provider accept it?
3. Was it delivered?
4. Was it read, bounced, suppressed, or failed?
5. Should we retry or follow up manually?

## Data Model

`outbound_messages` now stores the latest delivery state:

- `delivery_status`
- `delivery_detail`
- `last_delivery_event_at`
- `delivered_at`
- `read_at`
- `failed_at`
- `retry_count`
- `next_retry_at`

`outbound_message_events` stores provider event history:

- `workspace_id`
- `outbound_message_id`
- `provider`
- `provider_message_id`
- `provider_event_id`
- `event_type`
- `delivery_status`
- `summary`
- `occurred_at`
- `metadata`

## Current Behavior

- `send-queued-email` marks successful provider acceptance as `sent`.
- `send-queued-whatsapp` marks successful provider acceptance as `sent`.
- Provider request failures mark the outbound message as `failed`.
- Both send functions write a provider event row.
- The platform UI shows delivery status on outbound messages.
- The platform UI shows recent provider event history.

## Webhook And Retry Work

Live provider webhooks now have verified receiver foundations, and retry automation now requeues recoverable provider failures. Remaining production hardening should add:

- Provider-specific retry policies.
- Dashboard filters for retryable failures.
- Alerting for messages at the retry limit.

## Guardrails

- Provider secrets stay in Supabase Edge Function secrets.
- Browser code never receives provider API keys.
- Delivery event reads are workspace-scoped by RLS.
- Provider send attempts validate workspace membership before writing events.
- Public webhook endpoints must verify signatures before writing events.
- Retry automation must require the automation secret before changing message status.
- Delivery history should never be treated as proof of payment.
