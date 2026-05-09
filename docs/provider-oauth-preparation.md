# Provider OAuth Preparation

`v3.9.0 - Provider token exchange foundation`

## Why This Matters

Live bank and accounting integrations are powerful, but risky if OAuth is rushed. Collectra now has a safe request layer that can prepare a provider authorization flow without storing access tokens, refresh tokens, or authorization codes in browser-readable tables.

## What Changed

- New Supabase table: `provider_oauth_requests`
- Request rows store `integration_type`, `provider`, status, requested scopes, redirect URI, PKCE method/hash, state nonce hash, expiry, and non-secret metadata
- Request rows can link to `workspace_accounting_connections` or `workspace_bank_accounts`
- Seeded demo data includes an exchange-pending Zoho Books accounting OAuth request and a draft Lean bank OAuth request
- Platform bundle, diagnostics, pilot checks, AI checks, data summary, and accounting panel show OAuth request readiness
- Security docs now explicitly separate OAuth request metadata from provider tokens

## Guardrails

- No provider access token or refresh token belongs in `provider_oauth_requests`
- Store only hashes for state and PKCE verifier material in browser-readable rows
- Future authorization-code exchange must happen in a Supabase Edge Function or other server boundary
- Provider OAuth requests are workspace-scoped and protected by RLS
- Request expiry is indexed so stale authorization attempts can be cleaned up later

## Current Callback Step

`v3.7.0` adds `provider_oauth_callback_events` plus the `receive-provider-oauth-callback` Edge Function. It validates state, rejects expired or mismatched requests, records only hashes/status metadata, and moves valid callbacks to `exchange_pending`.

## Next Step

Connect the validated OAuth callback directly to `exchange-provider-token`, then add refresh automation so provider credentials rotate through the managed vault without storing tokens in browser-accessible rows.
