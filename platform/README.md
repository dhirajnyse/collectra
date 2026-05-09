# Collectra Platform

This folder is the React/Vite/Supabase foundation for the SaaS version of Collectra.

Current platform version: `v1.4.0 - WhatsApp provider foundation`

The root app remains a static GitHub Pages demo. This platform app is the next build track for login, database persistence, workspace permissions, and real AI workflows.

## Local Setup

```powershell
cd C:\Users\dhiraj\Documents\Codex\Collectra\platform
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add Supabase credentials when the Supabase project is ready.

## Scripts

- `npm run dev`: local Vite dev server
- `npm run build`: production build
- `npm run preview`: preview production build

## Supabase

Use `supabase/schema.sql` as the first database draft. It creates workspaces, workspace members, customers, deals, invoices, AI follow-up logs, outbound messages, provider settings, audit logs, row-level security policies, indexes, and updated-at triggers.

The platform service layer can now create customers, deals, and invoices, seed a fresh workspace with demo data, load a full workspace bundle, and mark invoices paid with audit logging. The preferred seed path is the `seed_demo_workspace` database RPC in `supabase/schema.sql`, with a browser fallback for older local schemas.

The `supabase/functions/generate-followup` Edge Function is the first AI workflow boundary. It validates the signed-in user, checks workspace membership, calls OpenAI from the server, saves the draft to `ai_followups`, and writes an audit event.

Approved follow-up drafts can now be queued into `outbound_messages` for email, WhatsApp, or manual handling. The queue is intentionally not a live sender yet; it is the human approval and audit layer before provider integrations are attached.

Queued email messages can now be sent through the `supabase/functions/send-queued-email` Edge Function. It validates the signed-in user, checks workspace membership, loads active workspace email settings, calls Resend from the server, updates queue status, and writes an audit event.

Queued WhatsApp messages can now be sent through the `supabase/functions/send-queued-whatsapp` Edge Function. It validates the signed-in user, checks workspace membership, loads active workspace WhatsApp settings, calls WhatsApp Cloud API from the server, updates queue status, and writes an audit event.

Set these Supabase Edge Function secrets before deploying it:

```powershell
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set OPENAI_MODEL=your-model
supabase secrets set EMAIL_PROVIDER=resend
supabase secrets set RESEND_API_KEY=your-resend-key
supabase secrets set WHATSAPP_PROVIDER=whatsapp_cloud
supabase secrets set WHATSAPP_ACCESS_TOKEN=your-whatsapp-cloud-token
supabase secrets set WHATSAPP_GRAPH_API_VERSION=your-current-graph-api-version
```

## Security

Security docs live at the repository root:

- `SECURITY.md`
- `docs/security-threat-model.md`
- `docs/security-checklist.md`

GitHub Actions run dependency audit and CodeQL after this version is pushed.

## Auth Flow

The current platform UI includes a magic-link form. It works once `.env.local` contains a valid Supabase URL and anon key.

After credentials are added:

1. Run `npm run dev`.
2. Enter an email in the magic-link form.
3. Confirm the email link.
4. Create a workspace.
5. Click **Seed demo data** in the live data panel.
6. Confirm customers, deals, invoices, and audit rows load from Supabase.
7. Confirm the pilot readiness panel shows the core checks as ready.
8. Deploy `generate-followup`, then generate a draft from an open invoice.
9. Queue the approved draft and confirm it appears in outbound review.
10. Deploy `send-queued-email`, save active sender settings, and send one queued email.
11. Deploy `send-queued-whatsapp`, save active WhatsApp settings, and send one queued WhatsApp message.
