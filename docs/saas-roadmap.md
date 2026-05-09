# Collectra SaaS Roadmap

## Current Live Version

`v3.9.0 - Provider token exchange foundation`

The root app is still a static GitHub Pages demo. It now shows the version badge at the top middle so deployments are easy to identify.

## Platform Track

The `platform/` folder contains the React/Vite/Supabase foundation.

It is not replacing the public demo yet. It exists so we can build the real SaaS without disturbing the working GitHub Pages version.

## v0.5.0 Additions

- Magic-link auth UI in the React platform app
- Supabase service helper for auth and workspace bundle loading
- Workspace/customer/deal/invoice preview panels
- Row-level security SQL for workspace-scoped SaaS data

## v0.6.0 Additions

- Repository security policy
- Security threat model
- Secure coding checklist
- GitHub dependency audit workflow
- GitHub CodeQL workflow
- Dependabot configuration for platform dependencies

## v0.7.0 Additions

- Supabase `audit_logs` table
- Audit log RLS policies
- Platform service helper for writing audit logs
- Platform audit trail preview
- CSV formula-injection hardening
- JSON import validation guardrails

## v0.8.0 Additions

- Supabase session detection in the platform app
- Sign-out action
- Workspace creation form
- Workspace membership listing
- SQL indexes for workspace-scoped data
- `updated_at` triggers for mutable tables
- Supabase setup guide

## v0.9.0 Additions

- Supabase CRUD service helpers for customers, deals, and invoices
- Demo seed bundle for fresh workspace migration testing
- Live workspace bundle panel in the platform UI
- Invoice **Mark paid** action with audit logging
- Platform docs updated for seed/load verification

## v1.0.0 Additions

- Live pilot readiness panel in the platform app
- Connection diagnostics for credentials, session, workspace, live data, audit trail, and payment writes
- Transactional `seed_demo_workspace` Supabase RPC
- Browser seed fallback for older local schemas
- Supabase pilot runbook in `docs/supabase-pilot.md`

## v1.1.0 Additions

- Supabase Edge Function scaffold for `generate-followup`
- Server-side OpenAI call path with workspace membership validation
- `ai_followups` schema expansion for model, metadata, and creator tracking
- Platform AI Desk panel for invoice tone selection and draft previews
- AI follow-up runbook in `docs/ai-followup-foundation.md`

## v1.2.0 Additions

- `outbound_messages` table for approved follow-up work items
- RLS policies for queued outbound messages
- Platform queue controls for email, WhatsApp, and manual follow-up
- Audit event `outbound_message.queued`
- Send queue docs in `docs/send-queue-foundation.md`

## v1.3.0 Additions

- `workspace_email_settings` table for workspace sender configuration
- RLS policies for admin-managed email provider settings
- Platform email provider settings panel
- Supabase Edge Function `send-queued-email` for server-side Resend sending
- Audit events `email_settings.saved`, `outbound_message.sent`, and `outbound_message.failed`
- Email provider docs in `docs/email-provider-foundation.md`

## v1.4.0 Additions

- `workspace_whatsapp_settings` table for workspace business phone configuration
- RLS policies for admin-managed WhatsApp provider settings
- Platform WhatsApp provider settings panel
- Supabase Edge Function `send-queued-whatsapp` for server-side WhatsApp Cloud sending
- Audit event `whatsapp_settings.saved`
- WhatsApp provider docs in `docs/whatsapp-provider-foundation.md`

## v1.5.0 Additions

- Delivery status columns on `outbound_messages`
- `outbound_message_events` table for provider event history
- RLS policies and indexes for delivery event reads
- Email and WhatsApp send functions now record provider delivery events
- Platform delivery status panel and outbound message delivery chips
- Delivery status docs in `docs/delivery-status-foundation.md`

## v1.6.0 Additions

- Supabase Edge Function `receive-resend-webhook`
- Supabase Edge Function `receive-whatsapp-webhook`
- Resend Svix signature verification and replay-window guard
- WhatsApp GET challenge verification and `x-hub-signature-256` validation
- Webhook delivery events update outbound delivery status
- Verified webhook docs in `docs/verified-webhook-foundation.md`

## v1.7.0 Additions

- Supabase Edge Function `run-message-retries`
- Automation-secret guard for server-side retry jobs
- Retry scheduling after provider send failures
- Retry event history in `outbound_message_events`
- Retry due index for failed outbound messages
- Retry automation docs in `docs/retry-automation-foundation.md`

## v1.8.0 Additions

- Public demo risk score badges and score meters
- Platform collection risk panel with ranked open invoices
- Transparent risk reasons and next action suggestions
- Database view `collection_risk_scores`
- Risk scoring docs in `docs/collection-risk-scoring.md`

## v1.9.0 Additions

- Public demo next-action badges on dashboard risk cards
- Platform action queue with channel, urgency, and rationale
- Next-best-action rules for retry, review, phone, email, AI draft, and watchlist actions
- `collection_risk_scores` view now exposes recommended action fields
- Next-best-action docs in `docs/next-best-action-engine.md`

## v2.0.0 Additions

- Public demo action tracking affordance on risk cards
- Supabase `collection_actions` table with RLS, indexes, and updated-at trigger
- Platform owner alerts for the highest urgency collection risks
- Track, complete, and dismiss actions from the platform action queue
- Audit events for tracked and resolved collection actions
- Action tracking docs in `docs/action-tracking-owner-alerts.md`

## v2.1.0 Additions

- Public demo escalation button for tracked risk-card actions
- Escalation fields on `collection_actions`
- Platform escalation cockpit for open owner actions
- Audited `collection_action.escalated` service helper
- Escalation status chips for due soon, overdue, and escalated actions
- Escalation cockpit docs in `docs/escalation-cockpit.md`

## v2.2.0 Additions

- Owner labels and assignment metadata on `collection_actions`
- Audited `collection_action.assigned` service helper
- Platform owner chips in the escalation cockpit and tracked action list
- Assignment controls for open tracked actions
- Public demo assignment rotation on tracked risk cards
- Team assignment docs in `docs/team-assignment-foundation.md`

## v2.3.0 Additions

- Supabase `owner_digest_runs` table with RLS, indexes, and updated-at trigger
- Audited `owner_digest.created` service helper
- Platform owner digest desk for open collection action briefings
- Public demo digest button for tracked risk-card actions
- Live data and AI readiness panels now report saved digest drafts
- Owner digest docs in `docs/owner-digest-foundation.md`

## v2.4.0 Additions

- Digest queue metadata on `owner_digest_runs`
- Audited `owner_digest.queued` service helper
- Owner digest drafts can become `outbound_messages` for internal review
- Platform digest queue controls for manual, email, and WhatsApp channels
- Public demo queue button for draft owner digests
- Digest approval queue docs in `docs/digest-approval-queue.md`

## v2.5.0 Additions

- Supabase `owner_digest_schedules` table with RLS, indexes, and updated-at trigger
- Audited `owner_digest_schedule.saved` service helper
- Platform digest schedule controls for cadence, channel, and recipient
- Public demo schedule button for tracked owner digest work
- Live data and AI readiness panels now report saved schedules
- Digest schedule docs in `docs/digest-schedule-foundation.md`

## v2.6.0 Additions

- Supabase Edge Function `run-owner-digest-schedules`
- Automation-secret guard for due owner digest schedules
- Dry-run support for schedule checks
- Scheduled digest creation plus outbound review queueing
- Audit event `owner_digest_schedule.run_queued`
- Public demo Run action for saved digest schedules
- Digest runner docs in `docs/digest-runner-foundation.md`

## v2.7.0 Additions

- Supabase `workspace_owner_profiles` table for owner directory routing
- Owner profile links on collection actions, digest runs, and digest schedules
- `review_status` approval state on outbound messages
- Approve and reject service helpers for outbound review
- Send Edge Functions now block provider delivery until review status is approved
- Scheduled digest runner now creates pending review items instead of approved sends
- Public demo owner directory and digest approval states
- Owner directory and approval docs in `docs/owner-directory-approval-states.md`

## v2.8.0 Additions

- Supabase `customer_collection_playbooks` table with workspace RLS, indexes, and updated-at trigger
- Transactional seed RPC and browser fallback now create customer playbooks
- `collection_risk_scores` view applies playbook risk weight and preferred channel context
- AI follow-up Edge Function receives payment behavior, reminder tone, channel, escalation, and notes
- Platform live data, risk cards, action queue, and AI desk show playbook context
- Public demo risk and customer cards show playbook behavior
- Customer playbook docs in `docs/customer-collection-playbooks.md`

## v2.9.0 Additions

- Supabase `workspace_accounting_connections` table with RLS, indexes, and updated-at trigger
- Supabase `accounting_sync_runs` table for import/export run status, counts, and review summaries
- Transactional seed RPC and browser fallback now create accounting sync metadata
- Platform live data and diagnostics show accounting connection and sync run status
- Public demo dashboard and settings show accounting review context
- Accounting sync docs in `docs/accounting-sync-foundation.md`

## v3.0.0 Additions

- Supabase `workspace_bank_accounts` table with RLS, indexes, and updated-at trigger
- Supabase `bank_transactions` table for imported credit/debit movement
- Supabase `payment_match_suggestions` table for confidence-scored invoice matches
- Transactional seed RPC and browser fallback now create bank match demo data
- Platform pilot readiness, diagnostics, and workspace bundle show bank match status
- Public demo dashboard, insights, and settings show imported credits and review needs
- Bank match docs in `docs/bank-match-foundation.md`

## v3.1.0 Additions

- Supabase `payment_allocations` table with RLS, indexes, and updated-at trigger
- Supabase `approve_payment_match` RPC for transactional match approval
- Payment match suggestions store reviewer and reviewed timestamp fields
- Platform approval button for invoice-linked match suggestions
- Approved matches post allocation rows, mark bank transactions matched, mark invoices paid, and write audit logs
- Payment approval docs in `docs/payment-approval-foundation.md`

## v3.2.0 Additions

- Reversal fields on `payment_allocations`: `reversed_by`, `reversal_note`, and `reversed_at`
- Supabase `reverse_payment_allocation` RPC for transactional reversal
- Platform reverse button for posted payment allocations
- Reversal restores invoice, bank transaction, and match suggestion status back to review-ready state
- Audit event `payment_allocation.reversed`
- Allocation reversal docs in `docs/allocation-reversal-foundation.md`

## v3.3.0 Additions

- Invoice status now supports `partial`
- Payment approval calculates applied amount instead of assuming a full invoice settlement
- Short payments create partial invoices and record remaining balance metadata
- Reversal recalculates invoice status so earlier posted allocations remain respected
- Seeded bank data includes a partial GulfPack payment test case
- Partial payment docs in `docs/partial-payment-foundation.md`

## v3.4.0 Additions

- Supabase `customer_payment_credits` table with RLS, indexes, updated-at trigger, and source allocation link
- `approve_payment_match` now creates an open customer credit when a bank transaction exceeds the remaining invoice balance
- `reverse_payment_allocation` voids linked open customer credits when the source allocation is reversed
- Platform bundle, diagnostics, pilot checks, and bank match panel show customer credit state
- Seeded bank data includes an Al Noor overpayment test case
- Overpayment credit docs in `docs/overpayment-credit-foundation.md`

## v3.5.0 Additions

- Supabase `payment_match_split_lines` and `payment_allocation_lines` tables with RLS, indexes, and updated-at triggers
- `approve_payment_match` now supports reviewed split plans across multiple invoices
- `reverse_payment_allocation` reverses all posted split lines and recalculates affected invoices
- Platform bundle, diagnostics, pilot checks, and bank match panel show split plans and split allocation lines
- Seeded bank data includes a Crescent Marine combined receipt test case
- Multi-invoice split docs in `docs/multi-invoice-split-foundation.md`

## v3.6.0 Additions

- Supabase `provider_oauth_requests` table with RLS, indexes, and updated-at trigger
- Seed data now stages Zoho Books accounting and Lean bank OAuth request metadata
- Platform bundle, diagnostics, pilot checks, AI checks, and accounting panel show provider OAuth readiness
- OAuth request rows store scopes, callback paths, PKCE/state hashes, expiry, and non-secret metadata only
- Provider OAuth docs in `docs/provider-oauth-preparation.md`

## v3.7.0 Additions

- Supabase `provider_oauth_callback_events` table with RLS, indexes, and updated-at trigger
- `receive-provider-oauth-callback` Edge Function validates state and rejects expired or mismatched callbacks
- Valid callbacks store only state/code hashes and move OAuth requests to `exchange_pending`
- Seed data includes a validated Zoho Books callback event without raw codes or tokens
- Platform bundle, diagnostics, pilot checks, AI checks, data summary, and accounting panel show callback readiness
- OAuth callback docs in `docs/oauth-callback-foundation.md`

## v3.8.0 Additions

- Supabase `provider_credential_vault` table with RLS, indexes, updated-at trigger, and rotation-due lookup
- Seed data now stages an active Zoho Books credential-vault metadata entry
- Vault rows store credential references, token-family hashes, key versions, scopes, expiry, refresh, and rotation metadata only
- Platform bundle, diagnostics, pilot checks, AI checks, data summary, and accounting panel show credential vault readiness
- Credential vault docs in `docs/credential-vault-foundation.md`

## v3.9.0 Additions

- Supabase `provider_token_exchange_runs` table with RLS, indexes, and updated-at trigger
- `exchange-provider-token` Edge Function for server-only provider token exchange and managed vault handoff
- Exchange runs store only status, hashes, expiry, error metadata, and vault links
- Platform bundle, diagnostics, pilot checks, AI checks, data summary, and accounting panel show token exchange readiness
- Provider token exchange docs in `docs/provider-token-exchange-foundation.md`

## Next Steps

1. Create a Supabase project.
2. Copy `platform/.env.example` to `platform/.env.local`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run `platform/supabase/schema.sql` in Supabase SQL editor.
5. Run the platform app locally with `npm install` and `npm run dev`.
6. Test magic-link login locally.
7. Create a workspace after first login.
8. Seed demo customers, deals, and invoices into Supabase through the RPC.
9. Load the workspace bundle and test marking an invoice paid.
10. Deploy the `generate-followup` Edge Function and set Supabase AI secrets.
11. Deploy the `send-queued-email` Edge Function and set email provider secrets.
12. Save active sender settings and send one queued email.
13. Deploy the `send-queued-whatsapp` Edge Function and set WhatsApp provider secrets.
14. Save active WhatsApp business phone settings and send one queued WhatsApp message.
15. Inspect delivery status and provider event history after sends.
16. Deploy verified provider webhook receivers and register provider callback URLs.
17. Deploy `run-message-retries`, set `SUPABASE_AUTOMATION_SECRET`, and run a dry check.
18. Confirm the collection risk panel ranks open invoices correctly.
19. Confirm the action queue recommends channel, urgency, and rationale.
20. Track, complete, and dismiss recommended collection actions.
21. Escalate stale owner work from the cockpit.
22. Assign tracked actions to owner labels.
23. Create owner digest drafts for open collection work.
24. Queue owner digest drafts for outbound review.
25. Save digest schedule rules.
26. Deploy `run-owner-digest-schedules` and run a dry check.
27. Review, approve, and reject pending digest output before provider delivery tests.
28. Confirm customer-level collection playbooks influence risk and AI drafts.
29. Confirm accounting sync metadata loads and payment import runs can require review.
30. Confirm bank accounts, imported transactions, and match suggestions load after seed.
31. Approve one invoice-linked match and confirm the allocation plus audit log.
32. Reverse the posted allocation and confirm restored invoice, bank, match, and audit state.
33. Approve the seeded short payment and confirm the invoice becomes partial.
34. Approve the seeded overpayment match and confirm an open customer credit.
35. Approve the seeded split-payment match and confirm separate invoice allocation lines.
36. Reverse the split allocation and confirm every split line becomes reversed.
37. Confirm provider OAuth requests load and contain no provider tokens.
38. Deploy `receive-provider-oauth-callback` and confirm callback rows contain no raw authorization codes or tokens.
39. Confirm provider credential vault rows expose metadata only.
40. Add live provider token exchange and refresh automation.
