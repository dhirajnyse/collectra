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
- Customer collection playbooks
- Accounting connections and sync runs
- Provider OAuth request metadata
- Provider OAuth callback event metadata
- Provider credential vault metadata
- Provider token exchange metadata
- Bank transactions and payment match suggestions
- Payment allocations
- Payment match split lines and allocation lines
- AI-generated follow-up drafts
- Outbound message queue
- Outbound delivery events
- Collection risk scores
- Next-best-action recommendations
- Collection action tracking
- Action escalation metadata
- Action assignment metadata
- Owner profile directory
- Owner digest drafts
- Owner digest schedules
- Digest schedule runner output
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
| Customer collection playbooks | High | Internal payment behavior, channel, tone, escalation, and risk policy |
| Accounting connections and sync runs | High | Integration status, payment import counts, and review summaries |
| Provider OAuth request metadata | High | Requested scopes, callback URI, state/PKCE hashes, expiry, and provider authorization status |
| Provider OAuth callback event metadata | High | State hash, authorization-code hash, callback status, error details, and received timestamp |
| Provider credential vault metadata | High | Credential reference, token-family hash, key version, scopes, expiry, refresh, and rotation timing |
| Provider token exchange metadata | High | Exchange status, code hash, verifier hash, token response hash, expiry, error details, and vault link |
| Bank transactions and payment match suggestions | High | Imported cash movement, confidence scores, and review notes |
| Payment allocations | High | Posted payment decisions, partial status, reversal history, approval actor, and invoice status impact |
| Payment match split lines and allocation lines | High | Multi-invoice settlement plans, posted invoice impacts, remaining balances, and reversal status |
| Customer payment credits | High | Overpaid customer cash, source allocation links, and future application/refund decisions |
| Workspace membership | High | Controls data visibility |
| AI follow-ups | Medium/High | May contain customer and invoice data |
| Outbound messages | High | Customer communication content and recipients |
| Outbound delivery events | High | Provider status history and delivery outcomes |
| Collection risk scores | Medium/High | Derived collection priority and customer payment behavior signal |
| Next-best-action recommendations | Medium/High | Derived operational guidance for customer follow-up |
| Collection actions | High | Owner work history tied to invoice risk and follow-up decisions |
| Action escalation metadata | High | Urgency, escalation reason, and stale owner-work history |
| Action assignment metadata | High | Owner label, assignment note, and accountability history |
| Owner profile directory | High | Owner contact, preferred channel, role, and routing status |
| Owner digest drafts | High | Aggregated owner workload, overdue counts, and priority action summaries |
| Owner digest schedules | High | Owner cadence, channel, recipient, and future notification timing |
| Digest schedule runner output | High | Automated digest and outbound review creation history |
| Email provider settings | High | Sender identity, reply routing, and provider metadata |
| WhatsApp provider settings | High | Business phone identity and provider metadata |
| Audit logs | High | Finance and security activity history |
| Supabase anon key | Public with RLS | Safe only with correct RLS |
| Supabase service key | Critical secret | Never in browser or Git |
| OpenAI API key | Critical secret | Supabase Edge Function secret only |
| Email provider API key | Critical secret | Supabase Edge Function secret only |
| WhatsApp provider API key | Critical secret | Supabase Edge Function secret only |
| Provider credential vault encryption key | Critical secret | Edge Function or managed vault secret only |
| Provider token exchange client secrets | Critical secret | Edge Function secrets only |
| Retry automation secret | Critical secret | Supabase Edge Function secret only |

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
7. Provider OAuth redirects to Supabase Edge Functions
8. Local exports from app to user machine
9. GitHub repository and deployment pipeline

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
| Unauthorized provider send | Validate workspace membership and approved review status in Edge Functions before sending |
| WhatsApp compliance risk | Verify customer opt-in and provider message-window rules before production sending |
| Forged webhook delivery event | Verify provider signatures and prevent replay before accepting webhook events |
| Unauthorized retry loop | Require automation secret, cap retry count, and audit every requeue |
| Risk score misuse | Keep scores explainable and never let risk scoring mark invoices paid or send messages automatically |
| Action recommendation misuse | Keep recommendations advisory until a user approves a workflow action |
| Action tracking misuse | Keep tracked actions workspace-scoped, audited, and separate from payment status changes |
| Escalation misuse | Escalation must stay an audited metadata update and never trigger customer sending by itself |
| Assignment misuse | Assignment must stay audited owner metadata and never bypass workspace access |
| Owner directory misuse | Owner profiles must stay workspace-scoped and must not grant app permissions by themselves |
| Playbook leakage or misuse | Treat playbooks as internal guidance; do not disclose risk weights or policy names to customers |
| Accounting provider secret leakage | Store only metadata in workspace rows; keep OAuth tokens in server-side secrets or encrypted vault |
| OAuth request misuse | Store only request metadata and hashes; exchange codes and store credentials only server-side |
| OAuth callback misuse | Validate state server-side, reject expired requests, store only callback hashes/status events, and keep token exchange server-only |
| Token exchange leakage | Require provider/vault configuration before exchange, send tokens only to managed vault, and store only hashes/status in workspace rows |
| Credential vault leakage | Store only vault references, token-family hashes, key versions, expiry, and rotation metadata in workspace rows |
| Payment sync misuse | Keep sync runs advisory until finance approves invoice status changes |
| Bank match misuse | Keep imported bank transactions and match suggestions advisory until finance approves allocation |
| Payment allocation misuse | Require explicit approval, workspace membership, posted allocation records, and audit logs |
| Allocation reversal misuse | Require explicit reversal action, workspace membership, status restoration, and audit logs |
| Partial payment misuse | Derive partial status only from approved allocation math and keep remaining balance auditable |
| Overpayment credit misuse | Create credits only from approved allocation math and void linked open credits when source allocations are reversed |
| Split payment misuse | Require explicit split lines, posted allocation lines, workspace membership, and reversal of every line together |
| Bank provider secret leakage | Store only account metadata in workspace rows; keep bank OAuth tokens in server-side secrets or encrypted vault |
| Digest leakage | Owner digest drafts, schedules, and queued internal messages must stay workspace-scoped and never be sent without explicit approval |
| Unauthorized digest runner | Require automation secret, service-role isolation, dry-run testing, and no provider sends |
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
10. Add verified delivery webhook receivers.
11. Add protected retry automation with retry caps.
12. Add explainable collection risk scoring.
13. Add advisory next-best-action recommendations.
14. Add tracked collection actions with owner alerts.
15. Add audited action escalation.
16. Add audited action assignment.
17. Add audited owner digest drafts.
18. Add audited digest approval queue.
19. Add audited digest schedule rules.
20. Add protected digest schedule runner.
21. Add owner directory and outbound approval states.
22. Add customer collection playbooks with RLS and AI disclosure guardrails.
23. Add accounting sync metadata and payment-review guardrails.
24. Add provider OAuth request metadata without browser-visible tokens.
25. Add OAuth callback event metadata and server-side state validation.
26. Add provider credential vault metadata without browser-visible tokens.
27. Add provider token exchange metadata without browser-visible codes, verifiers, or tokens.
27. Add bank transaction matching with review-first allocation guardrails.
28. Add payment approval RPC and allocation ledger.
29. Add allocation reversal RPC and audit guardrails.
30. Add partial payment status and remaining-balance guardrails.
31. Add overpayment credit and split payment allocation guardrails.
32. Run automated security checks on every GitHub push.
