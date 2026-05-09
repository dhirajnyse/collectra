# Supabase Setup

## Current Version

`v0.9.0 - Data migration foundation`

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
VITE_COLLECTRA_VERSION=v0.9.0
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

## Migration Notes

- Seed demo data only in a fresh test workspace. The app prevents seeding when customers, deals, or invoices already exist.
- Browser code uses the Supabase anon key only. Keep service-role keys outside the frontend.
- Production migration should move bulk imports into a server-side RPC or Edge Function so multi-table writes can be transactional.

## Security Expectations

- RLS must stay enabled.
- Service-role keys must never be used in browser code.
- The public anon key is acceptable only with RLS enabled and tested.
- Run GitHub Actions after pushing.
