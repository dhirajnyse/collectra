# Collectra Threat Model

## Scope

This threat model covers the Collectra static demo and the SaaS platform track.

Collectra manages B2B money operations:

- Customers
- Contacts
- Deals
- Quotes
- Invoices
- Payment status
- AI-generated follow-up drafts
- Outbound message queue
- Email provider settings
- WhatsApp provider settings
- Workspace membership
- Audit logs

## Assets

| Asset | Sensitivity | Notes |
| --- | --- | --- |
| Customer records | High | Business contacts and commercial terms |
| Deals and quotes | High | Pipeline and pricing data |
| Invoices | High | Amounts, due dates, and collection status |
| Workspace membership | High | Controls data visibility |
| AI follow-ups | Medium/High | May contain customer and invoice data |
| Outbound messages | High | Customer communication content and recipients |
| Email provider settings | High | Sender identity, reply routing, and provider metadata |
| WhatsApp provider settings | High | Business phone identity and provider metadata |
| Audit logs | High | Finance and security activity history |
| Supabase anon key | Public with RLS | Safe only with correct RLS |
| Supabase service key | Critical secret | Never in browser or Git |
| OpenAI API key | Critical secret | Supabase Edge Function secret only |
| Email provider API key | Critical secret | Supabase Edge Function secret only |
| WhatsApp provider API key | Critical secret | Supabase Edge Function secret only |

## Actors

| Actor | Goal |
| --- | --- |
| Workspace owner | Manage company money operations |
| Workspace member | View or update authorized records |
| External attacker | Access or alter data without permission |
| Malicious insider | Abuse legitimate access |
| AI prompt attacker | Manipulate AI output or extract data |

## Trust Boundaries

1. Browser to Supabase Auth
2. Browser to Supabase database API
3. Browser to Supabase Edge Functions
4. Edge Functions to OpenAI
5. Edge Functions to email provider
6. Edge Functions to WhatsApp provider
7. Local exports from app to user machine
8. GitHub repository and deployment pipeline

## Main Risks

| Risk | Mitigation |
| --- | --- |
| Broken access control | Workspace-scoped schema and RLS policies |
| Cross-workspace data leak | Query by workspace and enforce membership in RLS |
| XSS | React rendering, avoid unsafe HTML, sanitize imports |
| Injection | Parameterized Supabase queries, no SQL from user input |
| Secret leakage | `.gitignore`, secret scanning, no service key in frontend |
| Dependency compromise | Dependabot, npm audit, CodeQL |
| AI prompt injection | Treat AI as draft generator, constrain data scope, validate workspace membership before prompts |
| AI secret leakage | Keep OpenAI keys in Edge Function secrets, never Vite variables |
| Email provider secret leakage | Keep provider keys in Edge Function secrets, never Vite variables |
| WhatsApp provider secret leakage | Keep provider keys in Edge Function secrets, never Vite variables |
| Accidental customer send | Queue approved drafts first; provider integrations require explicit send actions |
| Unauthorized provider send | Validate workspace membership in Edge Functions before sending |
| WhatsApp compliance risk | Verify customer opt-in and provider message-window rules before production sending |
| Unauthorized destructive actions | Role checks and append-only audit logs |
| CSV formula injection | Escape exported values and neutralize formulas |

## Security Build Plan

1. Keep public demo free of production secrets.
2. Build Supabase tables with RLS enabled by default.
3. Add workspace creation and membership logic.
4. Migrate from `localStorage` to Supabase.
5. Add audit log table for sensitive changes.
6. Wire app actions to audit logging.
7. Add AI follow-up generation through a Supabase Edge Function.
8. Add email provider sending through a Supabase Edge Function.
9. Add WhatsApp provider sending through a Supabase Edge Function.
10. Run automated security checks on every GitHub push.
