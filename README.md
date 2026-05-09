# Collectra

Current visible version: `v1.3.0 - Email provider foundation`

Collectra is a B2B money operations product for small and mid-sized companies that sell through quotes, invoices, payment terms, and follow-ups.

The current version is a dependency-free browser app. Open `index.html` to use it. Data is saved in the browser with `localStorage`.

## Product Promise

Turn leads into quotes, quotes into invoices, and invoices into collected cash without losing the work across email, WhatsApp, spreadsheets, and accounting tools.

## First Wedge

B2B trading, import/export, distributors, and service businesses that already manage customers, quotes, invoices, and collections manually.

## Prototype Modules

- Cash dashboard
- Customer database
- Deal pipeline
- Quote builder
- Invoice collection board
- AI follow-up desk
- Quote and invoice PDF export
- Workspace settings
- JSON backup/import and CSV exports
- Top-center version badge for deployment testing
- Security policy, threat model, and secure coding checklist
- Audit log design for finance-sensitive actions
- Supabase setup guide and workspace bootstrap foundation
- Supabase CRUD helpers and demo data seeding for workspace migration tests
- Supabase live pilot checklist and transactional seed RPC
- Supabase Edge Function scaffold for AI follow-up drafts
- Outbound message queue for approved email, WhatsApp, and manual follow-ups
- Email provider settings and server-side queued email send function
- Product blueprint in `docs/product-blueprint.md`

## Project Structure

- `index.html`: app shell and product screens
- `styles.css`: responsive product UI
- `src/data.js`: demo workspace data
- `src/storage.js`: browser persistence
- `src/pdf.js`: no-dependency PDF download helper
- `src/app.js`: app state, rendering, and interactions
- `platform/`: React/Vite/Supabase SaaS foundation

## Next Build Steps

1. Create and connect a Supabase project.
2. Run the schema and seed a test workspace from the platform app.
3. Deploy the `generate-followup` Edge Function and set AI secrets in Supabase.
4. Deploy the `send-queued-email` Edge Function and set Resend secrets in Supabase.
5. Save active sender settings and test one queued email send.
6. Add WhatsApp provider settings and send function.

## SaaS Track

See `docs/saas-roadmap.md`, `docs/supabase-setup.md`, `docs/supabase-pilot.md`, `docs/ai-followup-foundation.md`, `docs/send-queue-foundation.md`, `docs/email-provider-foundation.md`, and `platform/README.md` for the React/Vite/Supabase build path.

## Security

See `SECURITY.md`, `docs/security-threat-model.md`, `docs/security-checklist.md`, and `docs/audit-log-design.md`.

## GitHub

See `docs/github-setup.md` for the recommended repository setup and first push commands.
