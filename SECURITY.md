# Security Policy

Collectra is currently an early-stage product. The public GitHub Pages app is a prototype/demo, while the `platform/` folder is the SaaS build track.

## Supported Versions

| Version | Status |
| --- | --- |
| v1.4.x | Active development |
| v1.3.x and earlier | Prototype history |

## Reporting a Vulnerability

Do not open public GitHub issues for security vulnerabilities.

Until a private security advisory channel is configured, report issues directly to the project owner. Include:

- Affected file, URL, or feature
- Steps to reproduce
- Expected impact
- Screenshots or logs, if safe to share
- Whether customer or financial data could be exposed

## Security Priorities

Collectra handles business contact, deal, invoice, payment, and AI-generated follow-up data. Security priorities are:

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
- Database draft: workspace membership, transactional demo seed RPC, AI follow-up history, outbound message queue, workspace email and WhatsApp settings, audit logs, plus row-level security policies
- AI workflow: Edge Function boundary for OpenAI calls with workspace membership validation
- Email workflow: Edge Function boundary for Resend calls with workspace membership validation and audit logging
- WhatsApp workflow: Edge Function boundary for WhatsApp Cloud calls with workspace membership validation and audit logging
- Automation: GitHub dependency audit and CodeQL workflows added

## Secrets

Never commit:

- Supabase service-role keys
- OpenAI API keys
- Email provider API keys
- WhatsApp provider API keys
- Production database credentials
- Customer exports
- Queued outbound message exports
- `.env.local` or other local environment files

Public Supabase anon keys may be used in browser apps only when row-level security is enabled and tested.
