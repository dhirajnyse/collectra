# Bank Match Foundation

`v3.9.0 - Provider token exchange foundation`

## Purpose

Collectra needs a trustworthy way to turn imported cash movement into invoice decisions. This foundation adds the first review-first bank matching layer without connecting real bank credentials yet.

## What Was Added

- New Supabase table: `workspace_bank_accounts`
- New Supabase table: `bank_transactions`
- New Supabase table: `payment_match_suggestions`
- Demo seed data for one AED operating account, three incoming credits, and three match suggestions
- Platform service fetch and browser fallback seed support
- Platform pilot readiness and live workspace bundle visibility
- Static demo health and insight counters

## Review-First Rule

Payment matches are suggestions. A suggested match should not mark an invoice paid until a finance user approves the allocation path. This keeps Collectra safer for launch because imported bank data can contain partial payments, duplicate references, round-off differences, or advance payments with no invoice yet.

## Security Boundary

- No bank credentials or OAuth tokens are stored in the browser.
- Bank transaction rows are workspace-scoped and protected by RLS.
- Match suggestions keep confidence, reason, and review notes for auditability.
- The first seed uses demo CSV-style metadata only.

## Follow-On

`v3.1.0` added the approval action, allocation row, and audit log. `v3.2.0` adds reversal for mistaken posted allocations. `v3.3.0` adds partial-payment handling. `v3.4.0` adds customer credits for overpayments. `v3.5.0` adds multi-invoice split handling. `v3.6.0` stages provider OAuth requests without tokens. `v3.7.0` validates OAuth callbacks without storing raw codes or tokens. `v3.8.0` stages credential vault metadata. The remaining work is live provider token exchange for bank and accounting imports.
