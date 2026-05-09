# Supabase Pilot Runbook

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Prove the first live Collectra SaaS loop with real Supabase auth, workspace isolation, seeded finance records, customer playbooks, accounting sync metadata, provider OAuth request metadata, provider OAuth callback metadata, provider credential vault metadata, provider token exchange metadata, bank match suggestions, payment approvals, split allocations, allocation reversals, owner profiles, audited payment updates, AI drafts, outbound approvals, explicit provider sending, and tracked collection actions.

## Pilot Path

1. Create a Supabase project.
2. Run `platform/supabase/schema.sql` in the Supabase SQL editor.
3. Copy `platform/.env.example` to `platform/.env.local`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run the platform app locally.
6. Send a magic link and sign in.
7. Create a workspace.
8. Seed demo data.
9. Load the workspace bundle.
10. Mark one invoice paid.
11. Confirm the audit trail shows `invoice.marked_paid`.
12. Confirm the pilot readiness panel shows the core checks as ready.
13. Deploy the `generate-followup` Edge Function.
14. Generate one AI follow-up draft from an open invoice.
15. Confirm the audit trail shows `ai_followup.generated`.
16. Queue the approved draft for email, WhatsApp, or manual handling.
17. Confirm the audit trail shows `outbound_message.queued`.
18. Deploy the `send-queued-email` Edge Function.
19. Save active workspace email sender settings.
20. Send one queued email message.
21. Confirm the audit trail shows `outbound_message.sent` or `outbound_message.failed`.
22. Deploy the `send-queued-whatsapp` Edge Function.
23. Save active workspace WhatsApp business phone settings.
24. Send one queued WhatsApp message.
25. Confirm the queue and audit trail record the send result.
26. Confirm delivery status fields and `outbound_message_events` record provider outcomes.
27. Deploy verified webhook receivers and confirm unsigned test requests are rejected.
28. Deploy `run-message-retries` and run a dry retry check with the automation secret.
29. Confirm the **Collection risk** panel ranks open invoices with score reasons.
30. Confirm seeded playbooks appear in live data and alter recommended action channel or owner review behavior.
31. Confirm accounting sync shows a sandbox connection and review-needed payment import run.
32. Confirm bank match shows imported transactions and review-first suggestions.
33. Approve one invoice-linked match and confirm allocation plus `payment_match.approved`.
34. Reverse the posted allocation and confirm `payment_allocation.reversed`.
35. Approve the seeded short payment and confirm the invoice becomes `partial`.
36. Approve the seeded overpayment match and confirm `customer_payment_credit.created`.
37. Reverse that allocation and confirm the linked customer credit becomes `void`.
38. Approve the seeded split-payment match and confirm separate `payment_allocation_lines`.
39. Reverse the split allocation and confirm its lines become `reversed`.
40. Confirm provider OAuth requests appear without access or refresh tokens.
41. Deploy `receive-provider-oauth-callback` and confirm callback events store only hashes/status metadata.
42. Confirm provider credential vault entries expose only references, hashes, key versions, and rotation metadata.
43. Deploy `exchange-provider-token` and confirm exchange runs store only hashes, status, and vault references.
43. Confirm the action queue recommends channel, urgency, and rationale.
44. Track a recommended collection action.
45. Complete or dismiss the tracked action.
46. Confirm the audit trail shows `collection_action.tracked` and the resolved status event.
47. Escalate an open tracked action and confirm `collection_action.escalated`.
48. Reassign an open tracked action and confirm `collection_action.assigned`.
49. Create and queue an owner digest, then approve or reject the pending outbound review item.

## Acceptance Criteria

- Supabase credentials load without exposing service-role keys.
- Magic-link login creates a valid session.
- A signed-in user can create a workspace and owner membership.
- The `seed_demo_workspace` RPC inserts customers, playbooks, deals, invoices, and audit rows in one transaction.
- The seed path creates owner profiles for routing collection work.
- A fresh workspace cannot be seeded twice.
- Workspace bundle reads are scoped by RLS.
- Customer playbook reads are scoped by RLS.
- Accounting connection and sync-run reads are scoped by RLS.
- Provider OAuth request reads are scoped by RLS and contain no access tokens, refresh tokens, or authorization codes.
- Provider OAuth callback event reads are scoped by RLS and contain no raw authorization codes, access tokens, or refresh tokens.
- Provider credential vault reads are scoped by RLS and contain no raw provider tokens or client secrets.
- Provider token exchange runs are scoped by RLS and contain no raw authorization codes, PKCE verifiers, access tokens, refresh tokens, or client secrets.
- Bank account, bank transaction, and payment match reads are scoped by RLS.
- Payment match suggestions do not mark invoices paid automatically.
- Payment approval creates a posted allocation and `payment_match.approved` audit log.
- Allocation reversal restores invoice, bank transaction, and match suggestion review state and writes `payment_allocation.reversed`.
- Short payments mark invoices `partial` and preserve the remaining balance in allocation metadata.
- Overpayments create open customer credits and reversal voids credits linked to the source allocation.
- Split payment approvals create one allocation header plus separate posted allocation lines.
- Split payment reversal marks all allocation lines reversed and recalculates invoice status.
- `Mark paid` updates an invoice and writes an audit event.
- `generate-followup` validates workspace membership before calling OpenAI.
- A generated draft is saved in `ai_followups` and audited.
- An approved draft can be queued in `outbound_messages` without sending automatically.
- Email provider settings are workspace-scoped and admin-managed.
- `send-queued-email` validates workspace membership before contacting Resend.
- WhatsApp provider settings are workspace-scoped and admin-managed.
- `send-queued-whatsapp` validates workspace membership before contacting WhatsApp Cloud API.
- Sent and failed provider attempts update the outbound queue and audit log.
- Provider send attempts create delivery event history.
- Provider webhook receivers reject unsigned or invalid requests.
- Retry automation rejects calls without `SUPABASE_AUTOMATION_SECRET`.
- Recoverable failed messages can be requeued without exceeding the retry limit.
- Collection risk scoring ranks open invoices without changing payment status.
- Next-best-action recommendations remain advisory and do not send messages automatically.
- Collection actions are workspace-scoped, auditable, and separate from invoice payment writes.
- Escalation updates owner work metadata only and does not send customer messages.
- Assignment updates owner labels only and remains auditable.
- Owner digest drafts are workspace-scoped, auditable, and not sent automatically.
- Queued owner digests enter outbound review and are not sent automatically.
- Owner digest schedules are workspace-scoped configuration and are not executed automatically.
- Digest schedule runner rejects calls without `SUPABASE_AUTOMATION_SECRET` and does not send provider messages.
- Provider send functions reject pending or rejected outbound messages.
- `npm run security:audit` reports zero moderate-or-higher vulnerabilities.
- `npm run build` passes.

## Security Notes

- Keep RLS enabled on every workspace-scoped table.
- Keep service-role keys out of browser code and Git history.
- Use the database RPC for multi-table seed/import operations.
- Keep OpenAI keys in Supabase Edge Function secrets only.
- Treat generated follow-ups as drafts that require human approval before sending.
- Treat queued outbound messages as sensitive customer communications.
- Treat owner digest drafts as sensitive operational summaries.
- Treat owner digest schedules as sensitive routing configuration.
- Treat owner profile contacts as sensitive routing configuration.
- Treat bank transactions and payment match suggestions as sensitive reconciliation data.
- Treat payment allocations as posted finance history.
- Treat allocation reversal as sensitive finance correction history.
- Treat partial payment state as sensitive finance status derived from approved allocations.
- Treat customer payment credits as sensitive finance balances derived from approved allocations.
- Treat provider OAuth requests as sensitive integration setup metadata, not as a token store.
- Treat provider OAuth callback events as sensitive integration setup metadata, not as a token store.
- Treat provider credential vault entries as sensitive integration setup metadata, not as a token store.
- Treat provider token exchange runs as sensitive integration workflow metadata, not as a token store.
- Keep provider API keys in Supabase Edge Function secrets only.
- Keep the retry automation secret out of browser code and provider dashboards.
- Keep digest runner automation access out of browser code and provider dashboards.
- Require explicit user action before sending a queued provider message.
- Require approved review status before provider send functions call provider APIs.
- Verify customer opt-in and WhatsApp template/window rules before production use.
- Treat the browser fallback seed path as a development convenience only.
- Before onboarding real customer data, add production logging, backups, and a private vulnerability reporting channel.
