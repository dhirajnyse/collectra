# Supabase Pilot Runbook

## Current Version

`v1.3.0 - Email provider foundation`

## Goal

Prove the first live Collectra SaaS loop with real Supabase auth, workspace isolation, seeded finance records, audited payment updates, AI drafts, outbound approvals, and explicit email sending.

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

## Acceptance Criteria

- Supabase credentials load without exposing service-role keys.
- Magic-link login creates a valid session.
- A signed-in user can create a workspace and owner membership.
- The `seed_demo_workspace` RPC inserts customers, deals, invoices, and audit rows in one transaction.
- A fresh workspace cannot be seeded twice.
- Workspace bundle reads are scoped by RLS.
- `Mark paid` updates an invoice and writes an audit event.
- `generate-followup` validates workspace membership before calling OpenAI.
- A generated draft is saved in `ai_followups` and audited.
- An approved draft can be queued in `outbound_messages` without sending automatically.
- Email provider settings are workspace-scoped and admin-managed.
- `send-queued-email` validates workspace membership before contacting Resend.
- Sent and failed provider attempts update the outbound queue and audit log.
- `npm run security:audit` reports zero moderate-or-higher vulnerabilities.
- `npm run build` passes.

## Security Notes

- Keep RLS enabled on every workspace-scoped table.
- Keep service-role keys out of browser code and Git history.
- Use the database RPC for multi-table seed/import operations.
- Keep OpenAI keys in Supabase Edge Function secrets only.
- Treat generated follow-ups as drafts that require human approval before sending.
- Treat queued outbound messages as sensitive customer communications.
- Keep provider API keys in Supabase Edge Function secrets only.
- Require explicit user action before sending a queued provider message.
- Treat the browser fallback seed path as a development convenience only.
- Before onboarding real customer data, add production logging, backups, and a private vulnerability reporting channel.
