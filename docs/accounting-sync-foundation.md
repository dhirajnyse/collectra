# Accounting Sync Foundation

`v3.9.0 - Provider token exchange foundation`

Accounting sync is the bridge between Collectra's collection workflow and the system of record where payments eventually land.

## What Changed

- New Supabase table: `workspace_accounting_connections`
- New Supabase table: `accounting_sync_runs`
- Provider OAuth request metadata is now staged in `provider_oauth_requests`
- Seeded demo workspaces now include a Zoho Books sandbox connection
- Seeded demo workspaces now include completed and review-needed payment import runs
- Workspace bundles load accounting connection and sync-run records
- Platform live data shows connection status and latest sync review state
- Static demo shows accounting review context in dashboard work and settings health

## Security Boundary

The new tables store metadata only:

- provider name
- connection status
- sync direction
- last and next sync timestamps
- run status and record counts
- human-readable review summaries

They do not store OAuth refresh tokens, API keys, bank details, or provider secrets. Future provider secrets should stay in Supabase Edge Function secrets or a dedicated encrypted vault.

OAuth request rows store setup metadata only: requested scopes, callback URI, PKCE/state hashes, status, and expiry. Authorization codes and provider credentials still belong behind a server boundary.

## Product Direction

This prepares Collectra for:

- QuickBooks, Xero, Zoho Books, Tally, and CSV import paths
- payment import dry runs before invoice status changes
- payment matching review queues
- audited invoice updates after finance approval
- partial-payment status before final settlement
- scheduled sync runners protected by automation secrets

## Guardrails

- Sync runs do not mark invoices paid automatically.
- Failed or ambiguous payment matches stay in review.
- Workspace RLS remains the access-control boundary.
- Provider tokens must never be committed or stored in browser-accessible data.
