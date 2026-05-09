# Credential Vault Foundation

`v3.9.0 - Provider token exchange foundation`

## Why This Matters

After OAuth callback validation, Collectra needs a safe way to represent provider credentials without leaking tokens to browser-readable rows. This phase adds vault metadata that can prove a provider connection is ready while keeping actual secrets behind server boundaries.

## What Changed

- New Supabase table: `provider_credential_vault`
- Vault rows link to OAuth requests, OAuth callback events, accounting connections, or bank accounts
- Rows store provider, integration type, status, credential reference, token-family hash, encryption key version, scopes, token expiry, refresh timestamp, rotation due timestamp, and non-secret metadata
- Seeded demo data includes an active Zoho Books credential-vault entry
- Platform bundle, pilot checks, AI checks, diagnostics, data summary, and accounting panel show vault readiness

## Guardrails

- Raw access tokens and refresh tokens are not stored in `provider_credential_vault`
- Raw authorization codes are not stored in credential rows
- Browser-visible rows store references, hashes, status, expiry, and rotation metadata only
- Credential payloads must live in a server-side encrypted vault or provider secret store
- Rotation due dates are indexed so future automation can refresh credentials before expiry

## Next Step

Wire validated callbacks into `exchange-provider-token`, then add a refresh runner so real provider credentials can rotate through the managed vault.
