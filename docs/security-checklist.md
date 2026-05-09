# Collectra Secure Coding Checklist

Use this checklist before every release candidate.

## Access Control

- Every customer, deal, invoice, and AI follow-up must belong to one workspace.
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
- Keep `.env.local` out of Git.
- Keep OpenAI and Supabase service-role keys in server-side secrets only.
- Keep email provider API keys in Supabase Edge Function secrets only.
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
- No secrets are found in the repository.
