# Partial Payment Foundation

`v3.9.0 - Provider token exchange foundation`

## Purpose

B2B customers often pay in stages. Collectra should not mark an invoice fully paid when the bank transaction only covers part of the balance. This foundation makes short payments explicit, auditable, and visible.

## What Was Added

- Invoice status now supports `partial`
- `approve_payment_match` calculates applied amount and remaining balance
- Payment allocation metadata records invoice amount, amount allocated before approval, applied amount, remaining balance, transaction amount, and unallocated transaction amount
- Platform pilot checks include partial payment readiness
- Seeded GulfPack demo payment is now a short payment against `INV-1052`
- Static demo invoice status controls support `partial`

## Approval Behavior

When finance approves a short payment:

1. The match suggestion becomes `accepted`.
2. The bank transaction becomes `matched`.
3. The allocation posts only the applied amount.
4. The invoice becomes `partial`.
5. The remaining balance stays visible in allocation metadata.
6. `payment_match.approved` records the applied amount, transaction amount, remaining balance, and invoice status.

## Reversal Behavior

When a partial allocation is reversed:

1. The allocation becomes `reversed`.
2. The invoice status is recalculated from remaining posted allocations.
3. If no posted allocations remain, the invoice returns to open, due, or overdue based on its previous state and due date.
4. The correction is recorded as `payment_allocation.reversed`.

## Guardrails

- Approval cannot allocate more than the remaining invoice balance.
- Approval rejects invoices with no remaining balance.
- Partial payment logic stays inside the database RPC and mirrored browser fallback.
- Overpayment is handled by `customer_payment_credits`; split receipts are handled by `payment_match_split_lines` and `payment_allocation_lines`.

## Next Step

Add live token exchange for bank and accounting data after validated OAuth callbacks.
