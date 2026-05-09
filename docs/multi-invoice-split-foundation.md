# Multi-Invoice Split Foundation

`v3.9.0 - Provider token exchange foundation`

## Why This Matters

Real B2B customers often pay several invoices in one bank transfer. If Collectra only links a receipt to one invoice, finance has to repair the ledger manually. The platform now treats a combined receipt as a reviewed split plan, then posts separate invoice allocation lines when finance approves it.

## What Changed

- New Supabase table: `payment_match_split_lines`
- New Supabase table: `payment_allocation_lines`
- `approve_payment_match` can approve either one invoice-linked match or a split plan with multiple invoice lines
- Split approval creates one allocation header plus one posted line per invoice
- Invoice status math now considers posted allocation lines as well as direct allocations
- Any remainder after the split can still become a customer payment credit
- `reverse_payment_allocation` reverses every posted split line and restores invoice statuses together
- Platform bundle, diagnostics, pilot checks, data summary, and bank match panel show split plans and split allocation lines
- Seeded demo data includes a Crescent Marine combined receipt across `INV-1064` and `INV-1065`

## Review Flow

1. Finance reviews the combined bank transaction.
2. Collectra shows the planned invoice split lines and total amount.
3. Approval posts one allocation header and separate invoice allocation lines.
4. Each invoice is updated based on its allocated amount and remaining balance.
5. Finance can see the split lines in the live data panel.
6. If the allocation is reversed, all split lines are marked reversed and each invoice is recalculated.

## Guardrails

- Split plans and allocation lines are workspace-scoped and protected by RLS.
- Split lines are created only for a reviewed payment match suggestion.
- Approval requires at least one linked invoice or at least one split line.
- Posted split lines preserve previous invoice status and remaining-balance metadata.
- Reversal unwinds the allocation header and every posted split line in one action.
- Browser fallback mirrors the RPC behavior for local testing.

## Next Step

Add live provider token exchange so imported transactions can come from live systems instead of seeded demo data.
