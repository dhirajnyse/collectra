# Payment Approval Foundation

`v3.9.0 - Provider token exchange foundation`

## Purpose

Bank matches should not silently change financial records. This release adds the approval step that lets a finance user convert an invoice-linked match suggestion into a posted payment allocation.

## What Was Added

- New Supabase table: `payment_allocations`
- New approval RPC: `approve_payment_match`
- Match suggestions now store `reviewed_by` and `reviewed_at`
- Platform service helper for approval with RPC-first behavior and browser fallback
- Platform UI button to approve invoice-linked suggestions
- Audit event: `payment_match.approved`

## Approval Behavior

When a user approves an invoice-linked suggestion:

1. The match suggestion becomes `accepted`.
2. The bank transaction becomes `matched`.
3. The invoice becomes `paid` for full settlement or `partial` for a short payment.
4. A `payment_allocations` row is posted.
5. An audit log records the approval.

## Guardrails

- Suggestions without invoices cannot be approved.
- Rejected suggestions cannot be approved.
- Approval requires an authenticated workspace member.
- Bank and accounting provider secrets remain outside browser-accessible rows.
- Allocation reversal is a separate audited workflow added in `docs/allocation-reversal-foundation.md`.

## Next Step

Multi-invoice split handling, provider OAuth request metadata, server-side OAuth callback validation, and credential vault metadata are now in place. The next step is live provider token exchange for imports.
