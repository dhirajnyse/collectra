# Collectra SaaS Roadmap

## Current Live Version

`v1.3.0 - Email provider foundation`

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
13. Add WhatsApp provider settings and send function.
14. Add accounting integrations.
