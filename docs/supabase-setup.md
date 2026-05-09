# Supabase Setup

## Current Version

`v1.4.0 - WhatsApp provider foundation`

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
VITE_COLLECTRA_VERSION=v1.4.0
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

## Migration Notes

- Seed demo data only in a fresh test workspace. The app prevents seeding when customers, deals, or invoices already exist.
- The preferred seed path is `public.seed_demo_workspace`, which runs as a database transaction.
- Browser code uses the Supabase anon key only. Keep service-role keys outside the frontend.
- Production bulk imports should keep using RPC or Edge Function boundaries so multi-table writes stay transactional.
- Set `OPENAI_API_KEY` and `OPENAI_MODEL` as Supabase Edge Function secrets, never as Vite browser variables.
- Set `EMAIL_PROVIDER` and `RESEND_API_KEY` as Supabase Edge Function secrets before testing live email.
- Set `WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_GRAPH_API_VERSION` as Supabase Edge Function secrets before testing live WhatsApp.
- Do not connect production sender domains or WhatsApp business phones until queued message approvals, audit logs, and sender verification are complete.

## Security Expectations

- RLS must stay enabled.
- Service-role keys must never be used in browser code.
- The public anon key is acceptable only with RLS enabled and tested.
- Provider API keys must stay in Supabase Edge Function secrets.
- Run GitHub Actions after pushing.
