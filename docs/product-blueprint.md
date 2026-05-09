# Collectra Product Blueprint

## Concept

Collectra is a B2B money operations OS: CRM, quotes, invoices, collections, and cash visibility in one workflow.

Current visible version: `v1.4.0 - WhatsApp provider foundation`.

## Positioning

For small and mid-sized B2B companies that sell through quotes and payment terms, Collectra helps owners and finance teams collect faster, lose fewer deals, and see expected cash without stitching together WhatsApp, Gmail, Excel, and accounting software.

## First Ideal Customer

B2B trading and import/export companies.

They handle supplier quotes, customer quotations, payment terms, shipping documents, partial payments, overdue invoices, and constant follow-up. The work is often spread across inboxes, spreadsheets, and accounting tools.

## MVP Scope

1. Customer and deal database
2. Pipeline from lead to won
3. Quote builder with PDF-ready preview
4. Invoice tracker with due dates and status
5. AI follow-up generator for overdue and upcoming payments
6. Owner dashboard for expected cash, overdue invoices, and active pipeline
7. Browser-saved demo workspace for early product testing
8. Quote and invoice PDF export
9. Workspace settings, JSON backup/import, and CSV exports
10. React/Vite/Supabase platform scaffold
11. Security policy, threat model, secure coding checklist, and GitHub security automation
12. Audit log schema and platform preview for finance-sensitive actions
13. Supabase session detection and workspace bootstrap flow
14. Supabase CRUD helpers and demo data seed flow for migration testing
15. Live Supabase pilot readiness diagnostics and transactional seed RPC
16. Server-side AI follow-up generation scaffold with audit logging
17. Audited outbound queue for approved follow-up drafts
18. Workspace email provider settings and server-side queued email sending
19. Workspace WhatsApp provider settings and server-side queued WhatsApp sending

## Differentiator

Most tools store information. Collectra should move money forward. The AI layer should notice stale deals, draft follow-ups, summarize risk, and guide the owner toward the next commercial action.

## Pricing Draft

- Starter: USD 49/month for one workspace
- Pro: USD 149/month for team workflow, quote templates, and invoice follow-up
- Growth: USD 299/month for automation, integrations, and advanced cash forecasting
- Add-ons: payment links, WhatsApp automation, QuickBooks/Xero sync, custom templates

## Build Sequence

1. Interactive frontend prototype
2. Real quote and invoice PDF export
3. Local data persistence
4. Create/edit forms for customers, deals, and invoices
5. Workspace backup/import and CSV exports
6. React/Vite platform scaffold
7. Backend API and database
8. Authentication and workspaces
9. Email/WhatsApp follow-up sending
10. Accounting integrations
11. Security automation and release gates
12. Audit trail and activity feed
13. Live Supabase workspace onboarding
14. Data migration, seed loading, and payment-status writes
15. Live pilot verification before AI workflows
16. Edge Function AI follow-up drafts
17. Send queue before email/WhatsApp provider integrations
18. Email provider integration through server-side Edge Function
19. WhatsApp provider integration through server-side Edge Function
20. Delivery-status webhooks and retry history

## North Star Metric

Cash collected faster: days sales outstanding reduced for customers.
