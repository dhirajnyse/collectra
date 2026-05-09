# Collectra Secure Coding Checklist

Use this checklist before every release candidate.

## Access Control

- Every customer, customer playbook, accounting sync record, provider OAuth request, provider OAuth callback event, provider credential vault entry, provider token exchange run, bank transaction, payment match suggestion, payment match split line, payment allocation, payment allocation line, deal, invoice, and AI follow-up must belong to one workspace.
- Every database query must be scoped by workspace.
- Users may only access workspaces where they are members.
- Role checks must live in Supabase RLS or backend code, not only in React UI.
- Admin-only actions include member management and destructive deletes.

## Authentication

- Use Supabase Auth for login.
- Prefer magic-link or OAuth initially.
- Do not build custom password storage.
- Do not expose service-role keys in frontend code.
- Sign-out must clear app state and sensitive cached data.

## Data Protection

- Treat invoice, customer, payment, and follow-up records as sensitive business data.
- Treat queued outbound messages and recipients as sensitive customer communications.
- Treat tracked collection actions as sensitive operational history.
- Treat escalation reasons and levels as sensitive operational history.
- Treat assignment notes and owner labels as sensitive operational history.
- Treat owner profile contacts and routing preferences as sensitive operational history.
- Treat owner digest drafts as sensitive operational summaries.
- Treat owner digest schedules as sensitive operational routing.
- Treat digest runner output as sensitive automation history.
- Treat customer collection playbooks as sensitive internal policy and behavior data.
- Treat accounting connections and sync runs as sensitive integration and payment-review metadata.
- Treat provider OAuth requests as sensitive integration setup metadata.
- Treat provider OAuth callback events as sensitive integration setup metadata.
- Treat provider credential vault metadata as sensitive integration setup metadata.
- Treat provider token exchange metadata as sensitive integration workflow metadata.
- Treat bank transactions and payment match suggestions as sensitive financial reconciliation data.
- Treat payment allocations as sensitive posted finance history.
- Treat allocation reversals as sensitive finance correction history.
- Treat partial payment status as sensitive finance status derived from approved allocations.
- Treat split payment plans and allocation lines as sensitive finance settlement history.
- Keep `.env.local` out of Git.
- Keep OpenAI and Supabase service-role keys in server-side secrets only.
- Keep email and WhatsApp provider API keys in Supabase Edge Function secrets only.
- Keep accounting provider OAuth secrets out of browser-accessible tables.
- Keep bank provider OAuth secrets out of browser-accessible tables.
- Keep provider authorization codes, access tokens, refresh tokens, and raw PKCE verifiers out of browser-accessible tables.
- Store only hashes and status metadata for OAuth callbacks.
- Store only vault references, token-family hashes, key versions, expiry, and rotation metadata for provider credentials.
- Keep provider credential vault encryption keys in server-side secrets only.
- Keep provider token exchange client secrets and managed-vault write keys in server-side secrets only.
- Keep retry automation secrets in Supabase Edge Function secrets only.
- Avoid logging customer data, tokens, or full AI prompts in browser console.
- Exported JSON and CSV files are user-owned sensitive data.
- Audit invoice/payment/customer changes.

## Injection and XSS

- Avoid `innerHTML` for user-controlled data.
- Prefer React rendering because it escapes text by default.
- Never use `dangerouslySetInnerHTML` unless content is sanitized.
- Validate imported JSON before saving it.
- Escape CSV values and neutralize spreadsheet formulas before export.

## AI Safety

- Keep AI responses as drafts until the user sends them.
- Queue approved drafts before connecting real email or WhatsApp sending.
- Never let AI choose workspace IDs or access scope.
- Validate workspace membership inside the Edge Function before building prompts.
- Do not mix customer data across workspaces in prompts.
- Store AI drafts with model metadata and audit records.
- Audit every queued outbound message.
- Audit every provider send attempt as sent or failed.
- Require explicit user action before provider sending.
- Store provider delivery events without storing provider secrets.
- Keep risk scoring explainable and advisory only.
- Keep next-best-action recommendations advisory until user approval.
- Keep collection actions separate from payment status and customer sending.
- Keep escalation metadata separate from customer sending and payment writes.
- Keep owner profile routing separate from workspace permissions until invitation-based user assignment exists.
- Keep owner digest drafts in outbound review before scheduled sending exists.
- Keep owner digest schedules as configuration only until a protected runner exists.
- Keep digest runner output in outbound review and never direct provider sending.
- Keep customer playbooks internal; do not expose policy names or risk weights in customer messages.
- Require approved outbound review status before provider send functions call email or WhatsApp APIs.
- Verify webhook signatures and replay windows before enabling public delivery webhooks.
- Protect retry automation with a server-side secret and retry caps.
- Verify WhatsApp customer opt-in and provider message-window rules before production sending.
- Add prompt-injection tests before connecting email or WhatsApp sending.
- Log AI-generated follow-ups with user, invoice, and timestamp.

## Dependencies and Supply Chain

- Run `npm audit` for the platform app.
- Keep Dependabot enabled.
- Keep CodeQL enabled.
- Commit `package-lock.json`.
- Do not commit `node_modules` or `dist`.

## Release Gate

- Static app syntax checks pass.
- Platform app builds.
- GitHub Actions pass.
- RLS policies are enabled for all exposed Supabase tables.
- Audit logs exist for finance-sensitive actions.
- Provider sends validate workspace membership server-side.
- Delivery event reads are workspace-scoped by RLS.
- Retry automation rejects unsigned scheduler calls.
- Collection risk scores do not mutate invoice payment status.
- Next-best-action recommendations do not send customer messages automatically.
- Collection action tracking does not send messages or mark invoices paid automatically.
- Escalation does not send messages or mark invoices paid automatically.
- Assignment does not send messages, change permissions, or mark invoices paid automatically.
- Owner digest creation does not send messages or mark invoices paid automatically.
- Owner digest queueing does not send messages or mark invoices paid automatically.
- Owner digest schedule saving does not send messages or mark invoices paid automatically.
- Digest schedule runner does not send messages or mark invoices paid automatically.
- Pending outbound review items cannot call providers until approved.
- Customer playbooks do not send messages or mark invoices paid automatically.
- Accounting sync runs do not mark invoices paid automatically.
- Accounting connection rows do not store provider tokens or OAuth refresh secrets.
- Provider OAuth request rows do not store authorization codes, access tokens, refresh tokens, or raw PKCE verifier values.
- Provider OAuth callback event rows do not store raw authorization codes, access tokens, refresh tokens, or provider secrets.
- Provider credential vault rows do not store raw access tokens, refresh tokens, authorization codes, or provider client secrets.
- Provider token exchange rows do not store raw access tokens, refresh tokens, authorization codes, PKCE verifiers, or provider client secrets.
- Payment match suggestions do not mark invoices paid automatically.
- Payment allocations require explicit approval and audit logging before invoice status changes.
- Payment allocation reversal requires explicit action, restores review state, and writes an audit log.
- Partial payment status must come from approved allocation math, not unreviewed imported bank data.
- Overpayment credits must come from approved allocation math and remain linked to the source allocation.
- Split payments must require explicit split lines, posted allocation line auditability, and reversible invoice status math.
- Bank account rows do not store provider tokens or OAuth refresh secrets.
- No secrets are found in the repository.
