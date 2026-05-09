# Overpayment Credit Foundation

`v3.9.0 - Provider token exchange foundation`

## Why This Matters

Real customers often overpay an invoice, round up, or combine invoice payment with advance cash. Collectra should not mark the invoice paid and lose the excess amount in a note. The extra cash needs a reviewable customer credit ledger so finance can decide whether to apply, refund, or investigate it later.

## What Changed

- New Supabase table: `customer_payment_credits`
- New audit event: `customer_payment_credit.created`
- `approve_payment_match` applies only the remaining invoice balance when the bank transaction is larger than the invoice balance
- The unallocated amount becomes an open customer credit linked to the payment allocation, bank transaction, match suggestion, and customer
- Payment allocation metadata stores `customer_credit_id` and `overpayment_credit_amount`
- `reverse_payment_allocation` voids the linked open customer credit when the source allocation is reversed
- The platform bundle loads customer credits and shows them in pilot checks, diagnostics, data summary, and the bank match panel
- Seeded demo data includes an Al Noor overpayment match for `INV-1057`

## Review Flow

1. Finance reviews a suggested bank match.
2. If the bank transaction exceeds the invoice balance, Collectra calculates the applied invoice amount and the credit amount.
3. Approval posts the allocation, updates the invoice, marks the bank transaction matched, and creates an open customer credit.
4. Finance can see the credit in the live data panel.
5. If the allocation is reversed, the linked open credit becomes `void` and the reversal audit metadata includes `voided_customer_credit_id`.

## Guardrails

- Customer credits are workspace-scoped and protected by RLS.
- Credits are created only after explicit payment match approval.
- Credits are linked to source allocation rows so reversal can clean them up.
- Browser fallback mirrors the RPC behavior for older local schemas.
- Overpayment credits do not automatically settle another invoice yet.

## Next Step

Multi-invoice split handling now settles several open invoices before leaving any remainder as customer credit. Provider OAuth request, callback, and credential vault metadata are staged; the next step is live provider token exchange.
