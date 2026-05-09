# Allocation Reversal Foundation

`v3.9.0 - Provider token exchange foundation`

## Purpose

Payment approval needs a correction path before Collectra can safely connect real bank and accounting providers. This foundation lets finance reverse a posted allocation while keeping the approval history and correction history auditable.

## What Was Added

- Reversal fields on `payment_allocations`: `reversed_by`, `reversal_note`, and `reversed_at`
- New reversal RPC: `reverse_payment_allocation`
- Platform service helper with RPC-first behavior and browser fallback
- Platform reverse button for posted allocations
- Audit event: `payment_allocation.reversed`

## Reversal Behavior

When a user reverses a posted allocation:

1. The allocation becomes `reversed`.
2. The bank transaction returns to a review-safe status.
3. The invoice returns to its prior open, due, or overdue status.
4. The match suggestion returns to suggested or review status.
5. An audit log records the correction.

## Guardrails

- Reversal requires an authenticated workspace member.
- Already reversed allocations cannot be reversed again.
- Reversal does not delete the allocation row.
- Reversal does not erase the original `payment_match.approved` audit event.
- Reversal never stores bank or accounting provider secrets in browser-accessible rows.

## Next Step

Split allocation handling now reverses all posted invoice lines together. Provider OAuth request, callback, and credential vault metadata are staged; the next accounting step is live provider token exchange.
