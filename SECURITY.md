# Security Policy

Collectra is currently an early-stage product. The public GitHub Pages app is a prototype/demo, while the `platform/` folder is the SaaS build track.

## Supported Versions

| Version | Status |
| --- | --- |
| v3.9.x | Active development |
| v3.8.x and earlier | Prototype history |

## Reporting a Vulnerability

Do not open public GitHub issues for security vulnerabilities.

Until a private security advisory channel is configured, report issues directly to the project owner. Include:

- Affected file, URL, or feature
- Steps to reproduce
- Expected impact
- Screenshots or logs, if safe to share
- Whether customer or financial data could be exposed

## Security Priorities

Collectra handles business contact, deal, invoice, payment, customer collection playbook, accounting sync metadata, provider OAuth request metadata, provider OAuth callback event metadata, provider credential vault metadata, provider token exchange metadata, bank transaction metadata, payment match suggestions, payment match split lines, payment allocations, payment allocation lines, customer payment credits, AI-generated follow-up, outbound approval, collection action, escalation, assignment, owner profile, and owner digest data. Security priorities are:

1. Workspace-level access isolation
2. Strong authentication and session handling
3. No service-role secrets in browser code
4. Protection from injection and XSS
5. Secure dependency and supply-chain handling
6. Auditability for finance-related actions
7. AI guardrails for customer data and prompt injection

## Current Security Status

- Static demo: browser-only prototype using `localStorage`
- Platform scaffold: React/Vite/Supabase-ready
- Database draft: workspace membership, transactional demo seed RPC, customer collection playbooks, accounting connection metadata, accounting sync runs, provider OAuth request metadata, provider OAuth callback event metadata, provider credential vault metadata, provider token exchange runs, bank accounts, imported bank transactions, payment match suggestions, payment match split lines, payment allocations, payment allocation lines, customer payment credits, AI follow-up history, outbound message queue, outbound approval states, owner profiles, delivery event history, collection risk and action recommendation view, tracked, assigned, and escalated collection actions, owner digest runs, owner digest schedules, workspace email and WhatsApp settings, audit logs, plus row-level security policies
- AI workflow: Edge Function boundary for OpenAI calls with workspace membership validation
- Email workflow: Edge Function boundary for Resend calls with workspace membership validation and audit logging
- WhatsApp workflow: Edge Function boundary for WhatsApp Cloud calls with workspace membership validation and audit logging
- Delivery workflow: Provider send attempts, verified webhooks, and protected retry automation update delivery status and event history
- Action workflow: Collection actions are workspace-scoped, RLS-protected, and audited when tracked, assigned, escalated, or resolved
- Digest workflow: Owner digest drafts, schedules, and protected runner output are workspace-scoped, RLS-protected, audited, queued for internal outbound review, and not sent automatically
- Approval workflow: Provider send functions reject outbound messages unless review status is approved
- Playbook workflow: Customer playbooks are workspace-scoped, RLS-protected, and used as internal guidance for AI drafts and risk actions
- Accounting workflow: Connection metadata and sync runs are workspace-scoped, RLS-protected, and do not store provider tokens
- Provider OAuth workflow: OAuth request rows store scopes, callback paths, PKCE/state hashes, and non-secret status metadata only; callback rows store state/code hashes and status events only; token exchange runs store exchange status and hashes only; credential vault rows store references, token-family hashes, key versions, expiry, and rotation metadata only
- Bank match workflow: Bank accounts, imported transactions, and match suggestions are workspace-scoped, RLS-protected, and review-first before invoice status changes
- Payment approval workflow: Invoice status changes from bank matches require an explicit approval action, posted allocation row, and audit event
- Allocation reversal workflow: Posted allocations can be reversed only through an audited action that restores invoice, bank, and match review state
- Partial payment workflow: Short bank payments create partial invoice status and keep remaining balance visible before further allocation
- Overpayment credit workflow: Extra bank cash becomes an audited customer credit and is voided if the source allocation is reversed
- Split payment workflow: Multi-invoice bank receipts create explicit split lines and allocation lines so every invoice impact can be reviewed, audited, and reversed
- Automation: GitHub dependency audit and CodeQL workflows added

## Secrets

Never commit:

- Supabase service-role keys
- OpenAI API keys
- Email provider API keys
- WhatsApp provider API keys
- Accounting provider OAuth secrets
- Provider OAuth authorization codes, access tokens, and refresh tokens
- Provider credential vault encryption keys
- Retry automation secrets
- Production database credentials
- Customer exports
- Bank transaction exports
- Payment match exports
- Payment split exports
- Provider OAuth request exports
- Provider OAuth callback event exports
- Provider credential vault metadata exports
- Provider token exchange metadata exports
- Customer payment credit exports
- Queued outbound message exports
- `.env.local` or other local environment files

Public Supabase anon keys may be used in browser apps only when row-level security is enabled and tested.
