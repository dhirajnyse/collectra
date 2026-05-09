# Send Queue Foundation

## Current Version

`v1.4.0 - WhatsApp provider foundation`

## Goal

Turn reviewed AI follow-up drafts into controlled outbound work items before any real email or WhatsApp provider is connected.

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
- `provider_message_id`
- `metadata`

## Current Status

- Supported channels: `email`, `whatsapp`, `manual`
- Current statuses: `queued`, `sent`, `failed`, `cancelled`
- v1.2.0 queues approved drafts only; it does not send them.
- v1.3.0 adds an explicit email send action through a server-side provider function.
- v1.4.0 adds an explicit WhatsApp send action through a server-side provider function.
- Queue actions write `outbound_message.queued` to the audit log.
- Email provider attempts write `outbound_message.sent` or `outbound_message.failed` to the audit log.
- WhatsApp provider attempts write `outbound_message.sent` or `outbound_message.failed` to the audit log.

## Provider Work

1. Email uses workspace sender settings plus `send-queued-email`.
2. WhatsApp uses workspace business phone settings plus `send-queued-whatsapp`.
3. Provider sending is locked behind explicit user action.
4. Queue status updates to `sent` or `failed`.
5. Provider message IDs are stored without storing provider secrets.
6. Delivery webhooks and retry history are next.
