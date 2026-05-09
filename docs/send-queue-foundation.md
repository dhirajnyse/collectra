# Send Queue Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Turn reviewed AI follow-up drafts into controlled outbound work items before any provider send is allowed.

## Why This Exists

Collection follow-ups are sensitive customer communications. Collectra should not jump from AI draft to automatic send. The safer workflow is:

1. Generate a draft.
2. Human reviews the wording.
3. Human chooses channel and recipient.
4. Collectra queues the approved message.
5. Provider integrations send only explicitly queued messages.

## Data Model

`outbound_messages` stores:

- `workspace_id`
- `followup_id`
- `invoice_id`
- `customer_id`
- `created_by`
- `channel`
- `recipient`
- `subject`
- `message`
- `status`
- `approved_at`
- `sent_at`
- `delivery_status`
- `delivery_detail`
- `delivered_at`
- `read_at`
- `failed_at`
- `retry_count`
- `next_retry_at`
- `provider_message_id`
- `metadata`

`outbound_message_events` stores provider event history for each outbound item.

## Current Status

- Supported channels: `email`, `whatsapp`, `manual`
- Current statuses: `queued`, `sent`, `failed`, `cancelled`
- v1.2.0 queues approved drafts only; it does not send them.
- v1.3.0 adds an explicit email send action through a server-side provider function.
- v1.4.0 adds an explicit WhatsApp send action through a server-side provider function.
- v1.5.0 adds delivery status fields and provider event history.
- v1.6.0 adds verified webhook receivers for provider status callbacks.
- v1.7.0 adds protected retry automation for recoverable failed messages.
- Queue actions write `outbound_message.queued` to the audit log.
- Email provider attempts write `outbound_message.sent` or `outbound_message.failed` to the audit log.
- WhatsApp provider attempts write `outbound_message.sent` or `outbound_message.failed` to the audit log.

## Provider Work

1. Email uses workspace sender settings plus `send-queued-email`.
2. WhatsApp uses workspace business phone settings plus `send-queued-whatsapp`.
3. Provider sending is locked behind explicit user action.
4. Queue status updates to `sent` or `failed`.
5. Provider message IDs and delivery events are stored without storing provider secrets.
6. Recoverable failures can be requeued by the protected retry runner.
