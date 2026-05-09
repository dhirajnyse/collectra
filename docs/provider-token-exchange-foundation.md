# Provider Token Exchange Foundation

`v3.9.0 - Provider token exchange foundation`

This phase adds the server-side boundary that turns a validated provider OAuth callback into a managed credential-vault handoff.

## Added

- New Supabase table: `provider_token_exchange_runs`
- New Edge Function: `platform/supabase/functions/exchange-provider-token`
- Demo seed row for a vaulted Zoho Books exchange
- Platform diagnostics, data summary, and accounting panel visibility for exchange runs

## Security Rules

- Raw authorization codes are accepted only by the Edge Function request body and are never stored
- PKCE code verifiers are accepted only by the Edge Function request body and are never stored
- Provider access tokens and refresh tokens must be written to a managed vault endpoint before workspace metadata is updated
- Workspace rows store only status, hashes, expiry, provider, integration type, and vault references
- The function blocks exchange if provider credentials or managed-vault settings are missing

## Required Secrets

```powershell
supabase secrets set PROVIDER_ZOHO_BOOKS_TOKEN_ENDPOINT=your-provider-token-endpoint
supabase secrets set PROVIDER_ZOHO_BOOKS_CLIENT_ID=your-provider-client-id
supabase secrets set PROVIDER_ZOHO_BOOKS_CLIENT_SECRET=your-provider-client-secret
supabase secrets set PROVIDER_CREDENTIAL_VAULT_URL=your-managed-vault-write-url
supabase secrets set PROVIDER_CREDENTIAL_VAULT_API_KEY=your-managed-vault-write-key
supabase secrets set PROVIDER_CREDENTIAL_KEY_VERSION=your-managed-vault-key-version
```

The function also accepts provider-specific names like `ZOHO_BOOKS_TOKEN_ENDPOINT`, but the `PROVIDER_...` prefix is preferred for clarity.

## Next Step

Connect a real managed vault implementation, then let the OAuth callback hand off validated authorization codes directly to `exchange-provider-token` during the same server-side request.
