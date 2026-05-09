# Collectra SaaS Roadmap

## Current Live Version

`v0.9.0 - Data migration foundation`

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

## Next Steps

1. Create a Supabase project.
2. Copy `platform/.env.example` to `platform/.env.local`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run `platform/supabase/schema.sql` in Supabase SQL editor.
5. Run the platform app locally with `npm install` and `npm run dev`.
6. Test magic-link login locally.
7. Create a workspace after first login.
8. Seed demo customers, deals, and invoices into Supabase.
9. Load the workspace bundle and test marking an invoice paid.
10. Add OpenAI-powered follow-up generation.
11. Add email/WhatsApp send actions and accounting integrations.
