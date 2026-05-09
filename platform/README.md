# Collectra Platform

This folder is the React/Vite/Supabase foundation for the SaaS version of Collectra.

Current platform version: `v0.7.0 - Audit foundation`

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

Use `supabase/schema.sql` as the first database draft. It creates workspaces, workspace members, customers, deals, invoices, AI follow-up logs, audit logs, and row-level security policies.

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
4. Build workspace creation and data loading on top of `src/lib/collectraService.js`.
