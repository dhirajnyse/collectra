# Collectra

Current visible version: `v3.9.0 - Provider token exchange foundation`

Collectra is a B2B money operations product for small and mid-sized companies that sell through quotes, invoices, payment terms, and follow-ups.

The current version is a dependency-free browser app. Open `index.html` to use it. Data is saved in the browser with `localStorage`.

## Product Promise

Turn leads into quotes, quotes into invoices, and invoices into collected cash without losing the work across email, WhatsApp, spreadsheets, and accounting tools.

## First Wedge

B2B trading, import/export, distributors, and service businesses that already manage customers, quotes, invoices, and collections manually.

## Prototype Modules

- Cash dashboard
- Customer database
- Deal pipeline
- Quote builder
- Invoice collection board
- AI follow-up desk
- Quote and invoice PDF export
- Workspace settings
- JSON backup/import and CSV exports
- Top-center version badge for deployment testing
- Security policy, threat model, and secure coding checklist
- Audit log design for finance-sensitive actions
- Supabase setup guide and workspace bootstrap foundation
- Supabase CRUD helpers and demo data seeding for workspace migration tests
- Supabase live pilot checklist and transactional seed RPC
- Supabase Edge Function scaffold for AI follow-up drafts
- Outbound message queue for approved email, WhatsApp, and manual follow-ups
- Email provider settings and server-side queued email send function
- WhatsApp provider settings and server-side queued WhatsApp send function
- Delivery status fields and provider event history for outbound messages
- Verified Resend and WhatsApp webhook receivers for delivery updates
- Protected retry automation for recoverable failed outbound messages
- Collection risk scores and ranked invoice attention list
- Next-best-action recommendations for call, email, retry, review, draft, and monitor workflows
- Action tracking and owner alerts for recommended collection work
- Escalation cockpit for stale owner actions and urgent cash follow-up
- Team assignment foundation for accountable collection ownership
- Owner digest foundation for audited cash briefing drafts
- Digest approval queue for internal review before notification delivery
- Digest schedule foundation for owner cadence, channel, and recipient rules
- Protected digest runner for due schedules and queued review items
- Owner directory and approval states for profile-based routing before provider delivery
- Customer collection playbooks for behavior-aware risk, channel, tone, and escalation rules
- Accounting sync foundation for connection status, payment-import runs, and review-safe matching
- Bank match foundation for bank accounts, imported transactions, and review-first payment suggestions
- Payment approval foundation for audited allocation posting before invoice status changes
- Allocation reversal foundation for undoing posted allocations with status restoration and audit logging
- Partial payment foundation for short-pay allocation and partial invoice status
- Overpayment credit foundation for reviewable customer credit creation and reversal cleanup
- Multi-invoice split foundation for applying one receipt across several invoices with reversible allocation lines
- Provider OAuth preparation for accounting and bank connection requests without browser-visible tokens
- OAuth callback foundation for server-side provider redirects without raw codes or tokens in browser rows
- Credential vault foundation for provider token references, key versions, expiry, and rotation metadata without browser-visible tokens
- Provider token exchange foundation for server-side exchange runs, managed vault handoff, and hash-only tracking
- Product blueprint in `docs/product-blueprint.md`

## Project Structure

- `index.html`: app shell and product screens
- `styles.css`: responsive product UI
- `src/data.js`: demo workspace data
- `src/storage.js`: browser persistence
- `src/pdf.js`: no-dependency PDF download helper
- `src/app.js`: app state, rendering, and interactions
- `platform/`: React/Vite/Supabase SaaS foundation

## Next Build Steps

1. Create and connect a Supabase project.
2. Run the schema and seed a test workspace from the platform app.
3. Deploy the `generate-followup` Edge Function and set AI secrets in Supabase.
4. Deploy the `send-queued-email` Edge Function and set Resend secrets in Supabase.
5. Save active sender settings and test one queued email send.
6. Deploy the `send-queued-whatsapp` Edge Function and set WhatsApp Cloud secrets.
7. Save active WhatsApp business phone settings and test one queued WhatsApp send.
8. Inspect delivery status and provider events after sends.
9. Deploy verified Resend and WhatsApp webhook receivers.
10. Deploy the `run-message-retries` Edge Function and set the automation secret.
11. Use collection risk scores to guide next-best actions.
12. Track recommended actions and owner alerts.
13. Escalate overdue owner work from the cockpit.
14. Assign tracked actions to owner labels.
15. Create owner digest drafts for open collection work.
16. Queue owner digest drafts for outbound review.
17. Save digest schedule rules.
18. Deploy the protected digest schedule runner.
19. Review, approve, or reject scheduled digest output before provider delivery.
20. Review customer collection playbooks on seeded accounts.
21. Review accounting sync runs on seeded workspaces.
22. Review bank transactions and payment match suggestions on seeded workspaces.
23. Approve an invoice-linked payment match and confirm allocation audit.
24. Reverse a posted allocation and confirm invoice, bank, match, and audit states.
25. Approve the seeded short payment and confirm partial invoice status.
26. Approve the seeded overpayment match and confirm customer credit creation.
27. Approve the seeded split-payment match and confirm separate invoice allocation lines.
28. Review provider OAuth requests and confirm tokens remain server-side.
29. Deploy the `receive-provider-oauth-callback` Edge Function.
30. Confirm provider callbacks validate state and store only hashes/status events.
31. Confirm provider credential vault entries expose metadata only.
32. Deploy `exchange-provider-token` and confirm exchange runs never expose raw codes or provider tokens.

## SaaS Track

See `docs/saas-roadmap.md`, `docs/supabase-setup.md`, `docs/supabase-pilot.md`, `docs/ai-followup-foundation.md`, `docs/send-queue-foundation.md`, `docs/email-provider-foundation.md`, `docs/whatsapp-provider-foundation.md`, `docs/delivery-status-foundation.md`, `docs/verified-webhook-foundation.md`, `docs/retry-automation-foundation.md`, `docs/collection-risk-scoring.md`, `docs/next-best-action-engine.md`, `docs/action-tracking-owner-alerts.md`, `docs/escalation-cockpit.md`, `docs/team-assignment-foundation.md`, `docs/owner-digest-foundation.md`, `docs/digest-approval-queue.md`, `docs/digest-schedule-foundation.md`, `docs/digest-runner-foundation.md`, `docs/owner-directory-approval-states.md`, `docs/customer-collection-playbooks.md`, `docs/accounting-sync-foundation.md`, `docs/bank-match-foundation.md`, `docs/payment-approval-foundation.md`, `docs/allocation-reversal-foundation.md`, `docs/partial-payment-foundation.md`, `docs/overpayment-credit-foundation.md`, `docs/multi-invoice-split-foundation.md`, `docs/provider-oauth-preparation.md`, `docs/oauth-callback-foundation.md`, `docs/credential-vault-foundation.md`, `docs/provider-token-exchange-foundation.md`, and `platform/README.md` for the React/Vite/Supabase build path.

## Security

See `SECURITY.md`, `docs/security-threat-model.md`, `docs/security-checklist.md`, and `docs/audit-log-design.md`.

## GitHub

See `docs/github-setup.md` for the recommended repository setup and first push commands.
