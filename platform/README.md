# Collectra Platform

This folder is the React/Vite/Supabase foundation for the SaaS version of Collectra.

Current platform version: `v3.9.0 - Provider token exchange foundation`

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

Use `supabase/schema.sql` as the first database draft. It creates workspaces, workspace members, owner profiles, customers, customer collection playbooks, accounting connections, accounting sync runs, provider OAuth requests, provider OAuth callback events, provider credential vault metadata, provider token exchange runs, bank accounts, bank transactions, payment match suggestions, payment match split lines, payment allocations, payment allocation lines, customer payment credits, deals, invoices, AI follow-up logs, outbound messages, provider settings, collection actions, owner digest runs, owner digest schedules, audit logs, row-level security policies, indexes, and updated-at triggers.

The platform service layer can now create customers, deals, and invoices, seed a fresh workspace with demo data, load a full workspace bundle, and mark invoices paid with audit logging. The preferred seed path is the `seed_demo_workspace` database RPC in `supabase/schema.sql`, with a browser fallback for older local schemas.

The `supabase/functions/generate-followup` Edge Function is the first AI workflow boundary. It validates the signed-in user, checks workspace membership, calls OpenAI from the server, saves the draft to `ai_followups`, and writes an audit event.

Approved follow-up drafts can now be queued into `outbound_messages` for email, WhatsApp, or manual handling. The queue is intentionally not a live sender yet; it is the human approval and audit layer before provider integrations are attached.

Queued email messages can now be sent through the `supabase/functions/send-queued-email` Edge Function. It validates the signed-in user, checks workspace membership, loads active workspace email settings, calls Resend from the server, updates queue status, and writes an audit event.

Queued WhatsApp messages can now be sent through the `supabase/functions/send-queued-whatsapp` Edge Function. It validates the signed-in user, checks workspace membership, loads active workspace WhatsApp settings, calls WhatsApp Cloud API from the server, updates queue status, and writes an audit event.

Outbound messages now carry delivery status fields and write provider events to `outbound_message_events`. The platform UI shows the latest delivery status and provider event history.

Provider webhooks now have verified receiver foundations. `receive-resend-webhook` verifies Svix headers before processing Resend events. `receive-whatsapp-webhook` supports Meta's GET challenge flow and verifies `x-hub-signature-256` before processing WhatsApp status callbacks.

Retry automation now has a protected Edge Function. `run-message-retries` requeues recoverable failed email and WhatsApp messages, increments retry count, clears stale provider IDs, and records retry history in `outbound_message_events`.

Collection risk scoring now ranks open invoices by due date pressure, amount, provider delivery signals, retry count, and follow-up coverage. The platform UI shows the top risks with score explanations and next actions, and the schema includes the `collection_risk_scores` view for database-side inspection.

The next-best-action engine now turns risk signals into recommended actions with a channel, urgency, and rationale. Recommendations include calling finance, sending a firm email, drafting a reminder, approving a queued follow-up, retrying provider sends, and monitoring steady invoices.

Action tracking now turns those recommendations into owner work. The platform stores tracked collection actions, exposes open owner alerts for urgent invoices, and lets signed-in users complete or dismiss actions with audit logging.

The escalation cockpit now watches open collection actions. Signed-in users can escalate stale owner work up to level 3, store escalation reason and timestamp fields, and write `collection_action.escalated` audit events.

The team assignment foundation gives each tracked collection action an `owner_label`, assignment note, assigned timestamp, and audited reassignment flow.

The owner directory foundation adds `workspace_owner_profiles` so owner labels can resolve to display names, work email, phone, role title, preferred channel, and status. Tracked actions, digest runs, and digest schedules can now keep an `owner_profile_id` while retaining the readable owner label.

The owner digest foundation now groups each owner's open collection actions into saved briefing drafts in `owner_digest_runs`. Digest creation is audited and deliberately does not send email or WhatsApp yet.

The digest approval queue now moves an owner digest draft into `outbound_messages` for internal review. Digest output can pause at `review_pending`, outbound rows carry `review_status`, and approval or rejection is audited before provider delivery can happen.

The digest schedule foundation now saves owner digest cadence, channel, recipient, status, and next-run timestamp in `owner_digest_schedules`. Schedule saves are audited and do not trigger background sends yet.

The digest runner foundation adds `run-owner-digest-schedules`, a protected automation Edge Function. It checks active due schedules, creates owner digest runs, creates pending outbound review items, advances `next_run_at`, and writes audit events without sending provider messages.

The send functions now require `review_status = approved` before contacting Resend or WhatsApp Cloud API. Scheduled digest output is intentionally created as pending review so automation cannot silently send owner/customer messages.

Customer collection playbooks now store customer-specific payment behavior, preferred channel, reminder tone, escalation policy, reminder timing, and risk weight. The seed RPC and browser fallback create sample playbooks, the workspace bundle loads them, the risk engine applies their risk weights and channels, and `generate-followup` includes playbook context before writing AI drafts.

The accounting sync foundation adds `workspace_accounting_connections` and `accounting_sync_runs`. These tables store provider metadata, sync direction, run status, counts, and review summaries without storing OAuth tokens or provider secrets in browser-accessible rows. Seeded workspaces show a Zoho Books sandbox connection and review-needed payment import run.

The bank match foundation adds `workspace_bank_accounts`, `bank_transactions`, and `payment_match_suggestions`. These tables stage imported bank cash, suggested invoice matches, confidence scores, and review notes without marking invoices paid automatically.

The payment approval foundation adds `payment_allocations` and the `approve_payment_match` RPC. Approving an invoice-linked suggestion accepts the match, marks the bank transaction matched, posts an allocation row, updates invoice status, and writes `payment_match.approved` to the audit log.

The allocation reversal foundation adds `reverse_payment_allocation`. Reversing a posted allocation marks the allocation reversed, restores the invoice, bank transaction, and match suggestion back to review-ready states, and writes `payment_allocation.reversed` to the audit log.

The partial payment foundation makes short payments first-class. Approval now applies only the remaining invoice balance, marks short payments as `partial`, records the remaining balance in allocation metadata, and keeps full payments as `paid`.

The overpayment credit foundation adds `customer_payment_credits`. When an approved bank transaction exceeds the remaining invoice balance, Collectra applies the invoice amount, records the extra cash as an open customer credit, writes `customer_payment_credit.created`, and voids that credit if the source allocation is reversed.

The multi-invoice split foundation adds `payment_match_split_lines` and `payment_allocation_lines`. A single reviewed bank receipt can now settle multiple open invoices for the same customer, post one allocation header with separate invoice lines, preserve remaining-balance math, and reverse all posted split lines together.

The provider OAuth preparation foundation adds `provider_oauth_requests`. It stores workspace-scoped provider, integration type, requested scopes, callback URI, PKCE/state hashes, status, expiry, and non-secret metadata so future OAuth callback functions can exchange codes server-side without placing provider tokens in browser-readable rows.

The OAuth callback foundation adds `provider_oauth_callback_events` and `supabase/functions/receive-provider-oauth-callback`. Provider redirects now land on a server-side boundary that validates state, rejects expired or mismatched requests, records only callback hashes/status events, and moves valid requests to `exchange_pending` before any future token vault exchange.

The credential vault foundation adds `provider_credential_vault`. It stores provider, integration type, vault reference, token-family hash, key version, scopes, expiry, rotation due date, and non-secret metadata so the browser can show readiness without exposing authorization codes, access tokens, refresh tokens, or ciphertext.

The provider token exchange foundation adds `provider_token_exchange_runs` and `supabase/functions/exchange-provider-token`. The function validates the signed-in user, checks workspace role, requires provider and vault configuration before contacting the provider token endpoint, sends token payloads only to a managed vault endpoint, and stores only exchange status, hashes, vault references, expiry, and audit metadata in workspace rows.

Set these Supabase Edge Function secrets before deploying the functions:

```powershell
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set OPENAI_MODEL=your-model
supabase secrets set EMAIL_PROVIDER=resend
supabase secrets set RESEND_API_KEY=your-resend-key
supabase secrets set WHATSAPP_PROVIDER=whatsapp_cloud
supabase secrets set WHATSAPP_ACCESS_TOKEN=your-whatsapp-cloud-token
supabase secrets set WHATSAPP_GRAPH_API_VERSION=your-current-graph-api-version
supabase secrets set RESEND_WEBHOOK_SECRET=your-resend-webhook-signing-secret
supabase secrets set WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-whatsapp-webhook-verify-token
supabase secrets set WHATSAPP_APP_SECRET=your-meta-app-secret
supabase secrets set PROVIDER_ZOHO_BOOKS_TOKEN_ENDPOINT=your-provider-token-endpoint
supabase secrets set PROVIDER_ZOHO_BOOKS_CLIENT_ID=your-provider-client-id
supabase secrets set PROVIDER_ZOHO_BOOKS_CLIENT_SECRET=your-provider-client-secret
supabase secrets set PROVIDER_CREDENTIAL_VAULT_URL=your-managed-vault-write-url
supabase secrets set PROVIDER_CREDENTIAL_VAULT_API_KEY=your-managed-vault-write-key
supabase secrets set PROVIDER_CREDENTIAL_KEY_VERSION=your-managed-vault-key-version
supabase secrets set SUPABASE_AUTOMATION_SECRET=your-long-random-automation-secret
```

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
7. Confirm the pilot readiness panel shows the core checks as ready.
8. Deploy `generate-followup`, then generate a draft from an open invoice.
9. Queue the approved draft and confirm it appears in outbound review.
10. Deploy `send-queued-email`, save active sender settings, and send one queued email.
11. Deploy `send-queued-whatsapp`, save active WhatsApp settings, and send one queued WhatsApp message.
12. Confirm outbound review shows delivery status and provider event history.
13. Deploy `receive-resend-webhook` and `receive-whatsapp-webhook`, then register their public URLs in the provider dashboards.
14. Deploy `run-message-retries`, set `SUPABASE_AUTOMATION_SECRET`, and run a dry check before scheduling it.
15. Confirm the collection risk panel ranks open invoices and explains the top score.
16. Confirm the action queue recommends a channel, urgency, and rationale for each top invoice.
17. Track a recommended action, then complete or dismiss it from the owner work panel.
18. Escalate an open action and confirm the escalation appears in the cockpit and audit trail.
19. Reassign an open action and confirm `collection_action.assigned` appears in the audit trail.
20. Create an owner digest and confirm `owner_digest.created` appears in the audit trail.
21. Queue the digest and confirm `owner_digest.review_pending` plus an outbound review item appear.
22. Save a digest schedule and confirm `owner_digest_schedule.saved` appears in the audit trail.
23. Confirm seeded customer playbooks appear in the live data panel and influence risk recommendations.
24. Confirm the accounting sync panel shows a sandbox connection and review-needed sync run.
25. Confirm the bank match panel shows imported transactions and payment suggestions.
26. Approve one invoice-linked payment match and confirm the allocation plus audit log.
27. Reverse the posted allocation and confirm invoice, bank, match, and audit states.
28. Approve the seeded short payment and confirm the invoice becomes partial.
29. Approve the seeded overpayment match and confirm an open customer credit appears.
30. Reverse that allocation and confirm the credit becomes void.
31. Approve the seeded split-payment match and confirm separate invoice allocation lines appear.
32. Reverse that split allocation and confirm every split line becomes reversed.
33. Confirm provider OAuth requests appear and expose no access or refresh tokens.
34. Deploy `receive-provider-oauth-callback` and confirm provider callbacks store only hashes/status events.
35. Confirm provider credential vault entries expose only references, hashes, key versions, and rotation metadata.
36. Deploy `exchange-provider-token` and confirm token exchange runs store only hashes, status, and vault references.
37. Deploy `run-owner-digest-schedules`, set `SUPABASE_AUTOMATION_SECRET`, and run a dry schedule check.
38. Approve or reject pending outbound review items before testing provider send buttons.
