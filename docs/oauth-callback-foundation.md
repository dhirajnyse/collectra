# OAuth Callback Foundation

`v3.9.0 - Provider token exchange foundation`

## Why This Matters

Provider OAuth is a high-risk boundary because authorization codes and tokens can unlock accounting or bank data. Collectra now has the callback receiving layer without turning browser-readable tables into a token store.

## What Changed

- New Supabase table: `provider_oauth_callback_events`
- New Edge Function: `supabase/functions/receive-provider-oauth-callback`
- Callback events store workspace, provider, integration type, status, state hash, authorization-code hash, error details, received timestamp, and non-secret metadata
- Valid callbacks move their request to `exchange_pending`
- Seeded demo data includes a validated Zoho Books callback event
- Platform bundle, pilot checks, AI checks, diagnostics, live-data summary, and accounting panel show callback readiness

## Guardrails

- Raw authorization codes are never stored in `provider_oauth_callback_events`
- Access tokens and refresh tokens are not stored in request or callback rows
- Incoming `state` is hashed and compared with the staged request hash
- Expired or mismatched callbacks are rejected and recorded as status metadata
- Token exchange remains a future server-only step that writes encrypted vault payloads

## Follow-On

`v3.9.0` adds provider token exchange run tracking and a server-side vault handoff function. The next step is wiring the OAuth callback to hand validated authorization codes directly into that exchange boundary during the same server request.
