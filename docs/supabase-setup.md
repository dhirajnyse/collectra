# Supabase Setup

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Create The Project

1. Create a new Supabase project.
2. Open the SQL editor.
3. Run `platform/supabase/schema.sql`.
4. Open Project Settings.
5. Copy the Project URL and anon public key.

## Local Environment

Create:

`platform/.env.local`

Use:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_COLLECTRA_VERSION=v3.9.0
```

Do not commit `.env.local`.

## Local Test

```powershell
cd C:\Users\dhiraj\Documents\Codex\Collectra\platform
npm install
npm run dev
```

Test:

1. Enter your email.
2. Click **Send magic link**.
3. Open the email link.
4. Create a workspace.
5. Confirm the workspace appears in **Current access**.
6. Click **Seed demo data**.
7. Confirm the live data panel shows customers, deals, invoices, and audit rows.
8. Mark one open invoice paid and confirm a new audit event appears.
9. Confirm the pilot readiness panel shows environment, session, workspace, live data, audit trail, and payment write checks.
10. Deploy the `generate-followup` Edge Function and generate one AI draft.
11. Queue the approved draft and confirm it appears in outbound review.
12. Deploy the `send-queued-email` Edge Function.
13. Save active sender settings in **Email provider**.
14. Send one queued email and confirm the queue status changes.
15. Deploy the `send-queued-whatsapp` Edge Function.
16. Save active business phone settings in **WhatsApp provider**.
17. Send one queued WhatsApp message and confirm the queue status changes.
18. Confirm **Delivery status** shows provider event history.
19. Deploy `receive-resend-webhook` and set `RESEND_WEBHOOK_SECRET`.
20. Deploy `receive-whatsapp-webhook` and set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` plus `WHATSAPP_APP_SECRET`.
21. Deploy `run-message-retries` and set `SUPABASE_AUTOMATION_SECRET`.
22. Confirm **Collection risk** ranks open invoices after the workspace bundle loads.
23. Confirm customer playbooks appear in the live data bundle and influence recommended channels.
24. Confirm accounting connection and sync run metadata appear in the live data bundle.
25. Confirm bank accounts, bank transactions, and payment match suggestions appear in the live data bundle.
26. Approve one invoice-linked payment match and confirm allocation plus `payment_match.approved` audit log.
27. Reverse the posted allocation and confirm `payment_allocation.reversed`, invoice status restoration, bank review status, and match review status.
28. Approve the seeded short payment and confirm `INV-1052` becomes `partial`.
29. Approve the seeded overpayment match and confirm `customer_payment_credit.created`.
30. Reverse that allocation and confirm the linked customer credit becomes `void`.
31. Approve the seeded split-payment match and confirm separate invoice allocation lines.
32. Reverse the split allocation and confirm each line becomes `reversed`.
33. Confirm provider OAuth requests appear and expose no access or refresh tokens.
34. Deploy `receive-provider-oauth-callback` and confirm callback events store only hashes/status metadata.
35. Confirm provider credential vault entries expose only references, hashes, key versions, and rotation metadata.
36. Deploy `exchange-provider-token` and confirm token exchange runs store only hashes, status, and vault references.
36. Confirm **Next-best actions** show channel, urgency, and rationale.
37. Track one recommended action and confirm it appears in **Owner work**.
38. Complete or dismiss the tracked action and confirm the audit trail updates.
39. Escalate one open tracked action and confirm **Escalation cockpit** updates.
40. Reassign one open tracked action and confirm the owner chip plus audit trail update.
41. Create one owner digest and confirm the digest count plus audit trail update.
42. Queue the owner digest and confirm a pending outbound review item plus audit trail update.
43. Save an owner digest schedule and confirm the schedule count plus audit trail update.
44. Deploy `run-owner-digest-schedules` and run a dry schedule check with `SUPABASE_AUTOMATION_SECRET`.
45. Approve or reject a pending outbound review item before provider delivery.

## Migration Notes

- Seed demo data only in a fresh test workspace. The app prevents seeding when customers, deals, or invoices already exist.
- The preferred seed path is `public.seed_demo_workspace`, which runs as a database transaction.
- Browser code uses the Supabase anon key only. Keep service-role keys outside the frontend.
- Production bulk imports should keep using RPC or Edge Function boundaries so multi-table writes stay transactional.
- Set `OPENAI_API_KEY` and `OPENAI_MODEL` as Supabase Edge Function secrets, never as Vite browser variables.
- Set `EMAIL_PROVIDER` and `RESEND_API_KEY` as Supabase Edge Function secrets before testing live email.
- Set `WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_GRAPH_API_VERSION` as Supabase Edge Function secrets before testing live WhatsApp.
- Do not connect production sender domains or WhatsApp business phones until queued message approvals, audit logs, and sender verification are complete.
- Provider webhook endpoints must verify signatures or challenge tokens before writing delivery events.
- Retry automation must require `SUPABASE_AUTOMATION_SECRET` before requeueing failed messages.
- Collection risk scores are guidance signals; payment status remains controlled by invoice/payment writes.
- Split payments must remain explicit allocation lines; do not infer multi-invoice settlement from a bank memo alone.
- Next-best actions are advisory until the user approves an outbound message or explicit workflow action.
- Collection action tracking does not send messages or mark invoices paid automatically.
- Escalation only changes action urgency metadata; it does not contact customers.
- Assignment only changes owner metadata; it does not contact customers.
- Owner digest creation only saves a briefing draft; it does not contact customers or owners.
- Owner digest queueing only creates an outbound review item; it does not contact customers or owners.
- Owner digest schedule saving only stores cadence rules; it does not contact customers or owners.
- Digest schedule runner only creates digest drafts and outbound review items; it does not contact customers or owners.
- Provider OAuth request rows store setup metadata only; access tokens, refresh tokens, and authorization codes must stay server-side.
- Provider OAuth callback rows store only state/code hashes, status, and non-secret metadata.
- Provider credential vault rows store only references, hashes, key versions, expiry, and rotation metadata.
- Provider token exchange rows store only exchange status, hashes, expiry, error details, and vault links.
- Email and WhatsApp send functions require approved outbound review status before provider delivery.
- Payment match suggestions remain advisory until finance approves allocation.
- Payment allocation approval writes an audit log and calculates full versus partial invoice settlement.
- Allocation reversal requires an explicit user action, restores review state, and writes `payment_allocation.reversed`.
- Partial payments keep the invoice open as `partial` until the remaining balance is allocated or manually settled.
- Overpayments create open customer credits that remain linked to the approved allocation.

## Security Expectations

- RLS must stay enabled.
- Service-role keys must never be used in browser code.
- The public anon key is acceptable only with RLS enabled and tested.
- Provider API keys must stay in Supabase Edge Function secrets.
- Collection actions must stay protected by workspace RLS.
- Owner digest runs must stay protected by workspace RLS.
- Owner digest schedules must stay protected by workspace RLS.
- Owner profiles must stay protected by workspace RLS.
- Customer collection playbooks must stay protected by workspace RLS.
- Accounting connection and sync-run rows must stay protected by workspace RLS and must not store provider tokens.
- Provider OAuth request rows must stay protected by workspace RLS and must not store provider tokens.
- Provider OAuth callback rows must stay protected by workspace RLS and must not store raw authorization codes or provider tokens.
- Provider credential vault rows must stay protected by workspace RLS and must not store raw provider tokens or client secrets.
- Provider token exchange rows must stay protected by workspace RLS and must not store raw authorization codes, PKCE verifiers, provider tokens, or client secrets.
- Bank account, bank transaction, and payment match rows must stay protected by workspace RLS and must not store provider tokens.
- Payment allocation rows must stay protected by workspace RLS and must be auditable.
- Payment allocation reversal must stay explicit, auditable, and workspace-scoped.
- Partial payment status must be derived from approved allocations, not unreviewed match suggestions.
- Customer payment credits must stay protected by workspace RLS and must be voided when their source allocation is reversed.
- Pending outbound messages must be approved before provider delivery.
- Digest schedule runner must require `SUPABASE_AUTOMATION_SECRET`.
- Run GitHub Actions after pushing.
