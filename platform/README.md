# Collectra Platform

This folder is the React/Vite/Supabase foundation for the SaaS version of Collectra.

Current platform version: `v0.9.0 - Data migration foundation`

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

Use `supabase/schema.sql` as the first database draft. It creates workspaces, workspace members, customers, deals, invoices, AI follow-up logs, audit logs, row-level security policies, indexes, and updated-at triggers.

The platform service layer can now create customers, deals, and invoices, seed a fresh workspace with demo data, load a full workspace bundle, and mark invoices paid with audit logging.

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
