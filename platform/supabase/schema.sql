create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  owner_id uuid references auth.users(id) on delete set null,
  industry text,
  currency text not null default 'AED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  contact text,
  email text,
  phone text,
  segment text,
  terms text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  value numeric not null default 0,
  stage text not null check (stage in ('lead', 'quoted', 'negotiation', 'won')),
  owner text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  amount numeric not null default 0,
  due_date date,
  status text not null check (status in ('open', 'due', 'overdue', 'partial', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create table if not exists public.ai_followups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  tone text not null,
  message text not null,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_followups add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.ai_followups add column if not exists model text;
alter table public.ai_followups add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (status in ('open', 'due', 'overdue', 'partial', 'paid'));

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  followup_id uuid references public.ai_followups(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'manual')),
  recipient text,
  subject text,
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'cancelled')),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  delivery_status text not null default 'not_sent' check (delivery_status in ('not_sent', 'accepted', 'sent', 'delivered', 'read', 'opened', 'clicked', 'bounced', 'complained', 'suppressed', 'failed', 'unknown')),
  delivery_detail text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  review_note text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  last_delivery_event_at timestamptz,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outbound_messages add column if not exists delivery_status text not null default 'not_sent' check (delivery_status in ('not_sent', 'accepted', 'sent', 'delivered', 'read', 'opened', 'clicked', 'bounced', 'complained', 'suppressed', 'failed', 'unknown'));
alter table public.outbound_messages add column if not exists review_status text not null default 'pending';
alter table public.outbound_messages drop constraint if exists outbound_messages_review_status_check;
alter table public.outbound_messages add constraint outbound_messages_review_status_check check (review_status in ('pending', 'approved', 'rejected'));
alter table public.outbound_messages add column if not exists delivery_detail text;
alter table public.outbound_messages add column if not exists approved_at timestamptz;
alter table public.outbound_messages add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.outbound_messages add column if not exists rejected_at timestamptz;
alter table public.outbound_messages add column if not exists rejected_by uuid references auth.users(id) on delete set null;
alter table public.outbound_messages add column if not exists review_note text;
alter table public.outbound_messages add column if not exists delivered_at timestamptz;
alter table public.outbound_messages add column if not exists read_at timestamptz;
alter table public.outbound_messages add column if not exists failed_at timestamptz;
alter table public.outbound_messages add column if not exists last_delivery_event_at timestamptz;
alter table public.outbound_messages add column if not exists retry_count integer not null default 0;
alter table public.outbound_messages add column if not exists next_retry_at timestamptz;
alter table public.outbound_messages add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.outbound_message_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  outbound_message_id uuid not null references public.outbound_messages(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  provider_event_id text,
  event_type text not null,
  delivery_status text not null default 'unknown' check (delivery_status in ('not_sent', 'accepted', 'sent', 'delivered', 'read', 'opened', 'clicked', 'bounced', 'complained', 'suppressed', 'failed', 'unknown')),
  summary text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_email_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  provider text not null default 'resend' check (provider in ('resend')),
  from_name text,
  from_email text not null,
  reply_to text,
  status text not null default 'draft' check (status in ('draft', 'active', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.workspace_whatsapp_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  provider text not null default 'whatsapp_cloud' check (provider in ('whatsapp_cloud')),
  business_label text,
  phone_number_id text not null,
  display_phone text,
  status text not null default 'draft' check (status in ('draft', 'active', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_owner_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  label text not null,
  display_name text not null,
  work_email text,
  phone text,
  role_title text,
  preferred_channel text not null default 'manual' check (preferred_channel in ('manual', 'email', 'whatsapp')),
  status text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, label)
);

create table if not exists public.customer_collection_playbooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  playbook_name text not null,
  payment_behavior text not null default 'standard' check (payment_behavior in ('standard', 'reliable', 'seasonal', 'slow_payer', 'dispute_prone', 'new_account')),
  preferred_channel text not null default 'email' check (preferred_channel in ('email', 'whatsapp', 'phone', 'manual')),
  reminder_tone text not null default 'friendly' check (reminder_tone in ('friendly', 'firm', 'urgent')),
  escalation_policy text not null default 'standard' check (escalation_policy in ('standard', 'high_touch', 'owner_review', 'hold')),
  risk_weight integer not null default 0 check (risk_weight >= -20 and risk_weight <= 30),
  days_before_due integer not null default 3 check (days_before_due >= 0 and days_before_due <= 30),
  status text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_accounting_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv')),
  connection_name text not null,
  status text not null default 'draft' check (status in ('draft', 'sandbox', 'active', 'paused', 'error')),
  external_tenant_id text,
  sync_direction text not null default 'import_payments' check (sync_direction in ('import_payments', 'export_invoices', 'two_way', 'manual_review')),
  default_currency text not null default 'AED',
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create table if not exists public.accounting_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  accounting_connection_id uuid references public.workspace_accounting_connections(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  run_type text not null default 'dry_run' check (run_type in ('manual', 'scheduled', 'webhook', 'dry_run')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'needs_review')),
  started_at timestamptz,
  completed_at timestamptz,
  records_examined integer not null default 0 check (records_examined >= 0),
  records_matched integer not null default 0 check (records_matched >= 0),
  records_created integer not null default 0 check (records_created >= 0),
  records_failed integer not null default 0 check (records_failed >= 0),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  account_name text not null,
  bank_name text,
  account_mask text,
  currency text not null default 'AED',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'error')),
  last_import_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, account_name)
);

create table if not exists public.provider_oauth_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  integration_type text not null check (integration_type in ('accounting', 'bank')),
  provider text not null check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd')),
  accounting_connection_id uuid references public.workspace_accounting_connections(id) on delete set null,
  bank_account_id uuid references public.workspace_bank_accounts(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'redirect_pending', 'exchange_pending', 'authorized', 'expired', 'error', 'cancelled')),
  requested_scopes jsonb not null default '[]'::jsonb,
  redirect_uri text,
  state_nonce_hash text,
  code_challenge_method text not null default 'S256' check (code_challenge_method in ('S256', 'plain', 'not_required')),
  code_challenge_hash text,
  expires_at timestamptz,
  authorized_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_oauth_callback_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_oauth_request_id uuid references public.provider_oauth_requests(id) on delete cascade,
  integration_type text not null check (integration_type in ('accounting', 'bank')),
  provider text not null check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd')),
  status text not null default 'received' check (status in ('received', 'validated', 'rejected', 'exchange_pending', 'authorized', 'error')),
  state_nonce_hash text,
  authorization_code_hash text,
  error_code text,
  error_description text,
  received_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_credential_vault (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_oauth_request_id uuid references public.provider_oauth_requests(id) on delete set null,
  provider_oauth_callback_event_id uuid references public.provider_oauth_callback_events(id) on delete set null,
  accounting_connection_id uuid references public.workspace_accounting_connections(id) on delete set null,
  bank_account_id uuid references public.workspace_bank_accounts(id) on delete set null,
  integration_type text not null check (integration_type in ('accounting', 'bank')),
  provider text not null check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd')),
  status text not null default 'pending_exchange' check (status in ('pending_exchange', 'active', 'rotation_due', 'revoked', 'error')),
  credential_ref text not null,
  token_family_hash text,
  encryption_key_version text not null default 'edge-vault-v1',
  scopes jsonb not null default '[]'::jsonb,
  token_expires_at timestamptz,
  last_refreshed_at timestamptz,
  rotation_due_at timestamptz,
  revoked_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, integration_type)
);

create table if not exists public.provider_token_exchange_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_oauth_request_id uuid references public.provider_oauth_requests(id) on delete set null,
  provider_oauth_callback_event_id uuid references public.provider_oauth_callback_events(id) on delete set null,
  provider_credential_vault_id uuid references public.provider_credential_vault(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  integration_type text not null check (integration_type in ('accounting', 'bank')),
  provider text not null check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd')),
  exchange_mode text not null default 'authorization_code' check (exchange_mode in ('authorization_code', 'refresh_token', 'dry_run')),
  status text not null default 'prepared' check (status in ('prepared', 'blocked', 'exchanging', 'vaulted', 'failed')),
  authorization_code_hash text,
  code_verifier_hash text,
  token_response_hash text,
  token_expires_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bank_account_id uuid references public.workspace_bank_accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  transaction_date date not null,
  posted_at timestamptz,
  description text not null,
  counterparty text,
  reference text,
  direction text not null default 'credit' check (direction in ('credit', 'debit')),
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'AED',
  status text not null default 'imported' check (status in ('imported', 'matched', 'needs_review', 'ignored')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_match_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  match_status text not null default 'suggested' check (match_status in ('suggested', 'accepted', 'rejected', 'needs_review')),
  match_reason text,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, bank_transaction_id, invoice_id)
);

create table if not exists public.payment_match_split_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_match_suggestion_id uuid not null references public.payment_match_suggestions(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  line_order integer not null default 1,
  amount numeric not null default 0 check (amount >= 0),
  status text not null default 'suggested' check (status in ('suggested', 'accepted', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, payment_match_suggestion_id, invoice_id)
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete set null,
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  reversed_by uuid references auth.users(id) on delete set null,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'AED',
  status text not null default 'posted' check (status in ('posted', 'reversed')),
  allocation_note text,
  reversal_note text,
  reversed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, payment_match_suggestion_id)
);

create table if not exists public.payment_allocation_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_allocation_id uuid not null references public.payment_allocations(id) on delete cascade,
  payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete set null,
  bank_transaction_id uuid references public.bank_transactions(id) on delete set null,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'AED',
  status text not null default 'posted' check (status in ('posted', 'reversed')),
  previous_invoice_status text,
  remaining_after numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, payment_allocation_id, invoice_id)
);

create table if not exists public.customer_payment_credits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source_payment_allocation_id uuid references public.payment_allocations(id) on delete set null,
  bank_transaction_id uuid references public.bank_transactions(id) on delete set null,
  payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'AED',
  status text not null default 'open' check (status in ('open', 'applied', 'void')),
  credit_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_payment_allocation_id)
);

create table if not exists public.collection_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  owner_profile_id uuid references public.workspace_owner_profiles(id) on delete set null,
  owner_label text not null default 'Finance owner',
  assignment_note text,
  assigned_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  action_label text not null,
  action_channel text not null,
  action_urgency text not null,
  rationale text,
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_band text,
  due_at timestamptz,
  escalation_level integer not null default 0 check (escalation_level >= 0 and escalation_level <= 3),
  escalation_reason text,
  escalated_at timestamptz,
  last_escalated_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  dismissed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_digest_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  owner_profile_id uuid references public.workspace_owner_profiles(id) on delete set null,
  owner_label text not null,
  subject text not null,
  body text not null,
  action_count integer not null default 0 check (action_count >= 0),
  overdue_count integer not null default 0 check (overdue_count >= 0),
  escalated_count integer not null default 0 check (escalated_count >= 0),
  total_risk_score integer not null default 0 check (total_risk_score >= 0),
  status text not null default 'draft' check (status in ('draft', 'review_pending', 'queued', 'sent', 'rejected')),
  queued_outbound_message_id uuid references public.outbound_messages(id) on delete set null,
  queued_at timestamptz,
  queued_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_digest_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  owner_profile_id uuid references public.workspace_owner_profiles(id) on delete set null,
  owner_label text not null,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly')),
  channel text not null default 'manual' check (channel in ('manual', 'email', 'whatsapp')),
  recipient text,
  status text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  next_run_at timestamptz,
  last_queued_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, owner_label)
);

alter table public.collection_actions add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0 and escalation_level <= 3);
alter table public.collection_actions add column if not exists escalation_reason text;
alter table public.collection_actions add column if not exists escalated_at timestamptz;
alter table public.collection_actions add column if not exists last_escalated_by uuid references auth.users(id) on delete set null;
alter table public.collection_actions add column if not exists owner_profile_id uuid references public.workspace_owner_profiles(id) on delete set null;
alter table public.collection_actions add column if not exists owner_label text not null default 'Finance owner';
alter table public.collection_actions add column if not exists assignment_note text;
alter table public.collection_actions add column if not exists assigned_at timestamptz;
alter table public.collection_actions add column if not exists assigned_by uuid references auth.users(id) on delete set null;
alter table public.owner_digest_runs drop constraint if exists owner_digest_runs_status_check;
alter table public.owner_digest_runs add constraint owner_digest_runs_status_check check (status in ('draft', 'review_pending', 'queued', 'sent', 'rejected'));
alter table public.owner_digest_runs add column if not exists owner_profile_id uuid references public.workspace_owner_profiles(id) on delete set null;
alter table public.owner_digest_runs add column if not exists queued_outbound_message_id uuid references public.outbound_messages(id) on delete set null;
alter table public.owner_digest_runs add column if not exists queued_at timestamptz;
alter table public.owner_digest_runs add column if not exists queued_by uuid references auth.users(id) on delete set null;
alter table public.owner_digest_runs add column if not exists rejected_at timestamptz;
alter table public.owner_digest_runs add column if not exists rejected_by uuid references auth.users(id) on delete set null;
alter table public.owner_digest_schedules add column if not exists owner_profile_id uuid references public.workspace_owner_profiles(id) on delete set null;
alter table public.customer_collection_playbooks add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customer_collection_playbooks add column if not exists playbook_name text not null default 'Standard collection path';
alter table public.customer_collection_playbooks add column if not exists payment_behavior text not null default 'standard';
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_payment_behavior_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_payment_behavior_check check (payment_behavior in ('standard', 'reliable', 'seasonal', 'slow_payer', 'dispute_prone', 'new_account'));
alter table public.customer_collection_playbooks add column if not exists preferred_channel text not null default 'email';
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_preferred_channel_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_preferred_channel_check check (preferred_channel in ('email', 'whatsapp', 'phone', 'manual'));
alter table public.customer_collection_playbooks add column if not exists reminder_tone text not null default 'friendly';
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_reminder_tone_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_reminder_tone_check check (reminder_tone in ('friendly', 'firm', 'urgent'));
alter table public.customer_collection_playbooks add column if not exists escalation_policy text not null default 'standard';
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_escalation_policy_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_escalation_policy_check check (escalation_policy in ('standard', 'high_touch', 'owner_review', 'hold'));
alter table public.customer_collection_playbooks add column if not exists risk_weight integer not null default 0;
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_risk_weight_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_risk_weight_check check (risk_weight >= -20 and risk_weight <= 30);
alter table public.customer_collection_playbooks add column if not exists days_before_due integer not null default 3;
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_days_before_due_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_days_before_due_check check (days_before_due >= 0 and days_before_due <= 30);
alter table public.customer_collection_playbooks add column if not exists status text not null default 'active';
alter table public.customer_collection_playbooks drop constraint if exists customer_collection_playbooks_status_check;
alter table public.customer_collection_playbooks add constraint customer_collection_playbooks_status_check check (status in ('active', 'paused', 'disabled'));
alter table public.customer_collection_playbooks add column if not exists notes text;
alter table public.customer_collection_playbooks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_collection_playbooks add column if not exists updated_at timestamptz not null default now();
alter table public.workspace_accounting_connections add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.workspace_accounting_connections add column if not exists provider text not null default 'manual_csv';
alter table public.workspace_accounting_connections drop constraint if exists workspace_accounting_connections_provider_check;
alter table public.workspace_accounting_connections add constraint workspace_accounting_connections_provider_check check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv'));
alter table public.workspace_accounting_connections add column if not exists connection_name text not null default 'Accounting connection';
alter table public.workspace_accounting_connections add column if not exists status text not null default 'draft';
alter table public.workspace_accounting_connections drop constraint if exists workspace_accounting_connections_status_check;
alter table public.workspace_accounting_connections add constraint workspace_accounting_connections_status_check check (status in ('draft', 'sandbox', 'active', 'paused', 'error'));
alter table public.workspace_accounting_connections add column if not exists external_tenant_id text;
alter table public.workspace_accounting_connections add column if not exists sync_direction text not null default 'import_payments';
alter table public.workspace_accounting_connections drop constraint if exists workspace_accounting_connections_sync_direction_check;
alter table public.workspace_accounting_connections add constraint workspace_accounting_connections_sync_direction_check check (sync_direction in ('import_payments', 'export_invoices', 'two_way', 'manual_review'));
alter table public.workspace_accounting_connections add column if not exists default_currency text not null default 'AED';
alter table public.workspace_accounting_connections add column if not exists last_sync_at timestamptz;
alter table public.workspace_accounting_connections add column if not exists next_sync_at timestamptz;
alter table public.workspace_accounting_connections add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.workspace_accounting_connections add column if not exists updated_at timestamptz not null default now();
alter table public.accounting_sync_runs add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.accounting_sync_runs add column if not exists run_type text not null default 'dry_run';
alter table public.accounting_sync_runs drop constraint if exists accounting_sync_runs_run_type_check;
alter table public.accounting_sync_runs add constraint accounting_sync_runs_run_type_check check (run_type in ('manual', 'scheduled', 'webhook', 'dry_run'));
alter table public.accounting_sync_runs add column if not exists status text not null default 'queued';
alter table public.accounting_sync_runs drop constraint if exists accounting_sync_runs_status_check;
alter table public.accounting_sync_runs add constraint accounting_sync_runs_status_check check (status in ('queued', 'running', 'completed', 'failed', 'needs_review'));
alter table public.accounting_sync_runs add column if not exists records_examined integer not null default 0;
alter table public.accounting_sync_runs add column if not exists records_matched integer not null default 0;
alter table public.accounting_sync_runs add column if not exists records_created integer not null default 0;
alter table public.accounting_sync_runs add column if not exists records_failed integer not null default 0;
alter table public.accounting_sync_runs add column if not exists summary text;
alter table public.accounting_sync_runs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.provider_oauth_requests add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.provider_oauth_requests add column if not exists integration_type text not null default 'accounting';
alter table public.provider_oauth_requests drop constraint if exists provider_oauth_requests_integration_type_check;
alter table public.provider_oauth_requests add constraint provider_oauth_requests_integration_type_check check (integration_type in ('accounting', 'bank'));
alter table public.provider_oauth_requests add column if not exists provider text not null default 'manual_csv';
alter table public.provider_oauth_requests drop constraint if exists provider_oauth_requests_provider_check;
alter table public.provider_oauth_requests add constraint provider_oauth_requests_provider_check check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd'));
alter table public.provider_oauth_requests add column if not exists accounting_connection_id uuid references public.workspace_accounting_connections(id) on delete set null;
alter table public.provider_oauth_requests add column if not exists bank_account_id uuid references public.workspace_bank_accounts(id) on delete set null;
alter table public.provider_oauth_requests add column if not exists status text not null default 'draft';
alter table public.provider_oauth_requests drop constraint if exists provider_oauth_requests_status_check;
alter table public.provider_oauth_requests add constraint provider_oauth_requests_status_check check (status in ('draft', 'ready', 'redirect_pending', 'exchange_pending', 'authorized', 'expired', 'error', 'cancelled'));
alter table public.provider_oauth_requests add column if not exists requested_scopes jsonb not null default '[]'::jsonb;
alter table public.provider_oauth_requests add column if not exists redirect_uri text;
alter table public.provider_oauth_requests add column if not exists state_nonce_hash text;
alter table public.provider_oauth_requests add column if not exists code_challenge_method text not null default 'S256';
alter table public.provider_oauth_requests drop constraint if exists provider_oauth_requests_code_challenge_method_check;
alter table public.provider_oauth_requests add constraint provider_oauth_requests_code_challenge_method_check check (code_challenge_method in ('S256', 'plain', 'not_required'));
alter table public.provider_oauth_requests add column if not exists code_challenge_hash text;
alter table public.provider_oauth_requests add column if not exists expires_at timestamptz;
alter table public.provider_oauth_requests add column if not exists authorized_at timestamptz;
alter table public.provider_oauth_requests add column if not exists error_code text;
alter table public.provider_oauth_requests add column if not exists error_message text;
alter table public.provider_oauth_requests add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.provider_oauth_requests add column if not exists updated_at timestamptz not null default now();
alter table public.provider_oauth_callback_events add column if not exists provider_oauth_request_id uuid references public.provider_oauth_requests(id) on delete cascade;
alter table public.provider_oauth_callback_events add column if not exists integration_type text not null default 'accounting';
alter table public.provider_oauth_callback_events drop constraint if exists provider_oauth_callback_events_integration_type_check;
alter table public.provider_oauth_callback_events add constraint provider_oauth_callback_events_integration_type_check check (integration_type in ('accounting', 'bank'));
alter table public.provider_oauth_callback_events add column if not exists provider text not null default 'manual_csv';
alter table public.provider_oauth_callback_events drop constraint if exists provider_oauth_callback_events_provider_check;
alter table public.provider_oauth_callback_events add constraint provider_oauth_callback_events_provider_check check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd'));
alter table public.provider_oauth_callback_events add column if not exists status text not null default 'received';
alter table public.provider_oauth_callback_events drop constraint if exists provider_oauth_callback_events_status_check;
alter table public.provider_oauth_callback_events add constraint provider_oauth_callback_events_status_check check (status in ('received', 'validated', 'rejected', 'exchange_pending', 'authorized', 'error'));
alter table public.provider_oauth_callback_events add column if not exists state_nonce_hash text;
alter table public.provider_oauth_callback_events add column if not exists authorization_code_hash text;
alter table public.provider_oauth_callback_events add column if not exists error_code text;
alter table public.provider_oauth_callback_events add column if not exists error_description text;
alter table public.provider_oauth_callback_events add column if not exists received_at timestamptz not null default now();
alter table public.provider_oauth_callback_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.provider_oauth_callback_events add column if not exists updated_at timestamptz not null default now();
alter table public.provider_credential_vault add column if not exists provider_oauth_request_id uuid references public.provider_oauth_requests(id) on delete set null;
alter table public.provider_credential_vault add column if not exists provider_oauth_callback_event_id uuid references public.provider_oauth_callback_events(id) on delete set null;
alter table public.provider_credential_vault add column if not exists accounting_connection_id uuid references public.workspace_accounting_connections(id) on delete set null;
alter table public.provider_credential_vault add column if not exists bank_account_id uuid references public.workspace_bank_accounts(id) on delete set null;
alter table public.provider_credential_vault add column if not exists integration_type text not null default 'accounting';
alter table public.provider_credential_vault drop constraint if exists provider_credential_vault_integration_type_check;
alter table public.provider_credential_vault add constraint provider_credential_vault_integration_type_check check (integration_type in ('accounting', 'bank'));
alter table public.provider_credential_vault add column if not exists provider text not null default 'manual_csv';
alter table public.provider_credential_vault drop constraint if exists provider_credential_vault_provider_check;
alter table public.provider_credential_vault add constraint provider_credential_vault_provider_check check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd'));
alter table public.provider_credential_vault add column if not exists status text not null default 'pending_exchange';
alter table public.provider_credential_vault drop constraint if exists provider_credential_vault_status_check;
alter table public.provider_credential_vault add constraint provider_credential_vault_status_check check (status in ('pending_exchange', 'active', 'rotation_due', 'revoked', 'error'));
alter table public.provider_credential_vault add column if not exists credential_ref text not null default 'vault://pending';
alter table public.provider_credential_vault add column if not exists token_family_hash text;
alter table public.provider_credential_vault add column if not exists encryption_key_version text not null default 'edge-vault-v1';
alter table public.provider_credential_vault add column if not exists scopes jsonb not null default '[]'::jsonb;
alter table public.provider_credential_vault add column if not exists token_expires_at timestamptz;
alter table public.provider_credential_vault add column if not exists last_refreshed_at timestamptz;
alter table public.provider_credential_vault add column if not exists rotation_due_at timestamptz;
alter table public.provider_credential_vault add column if not exists revoked_at timestamptz;
alter table public.provider_credential_vault add column if not exists error_code text;
alter table public.provider_credential_vault add column if not exists error_message text;
alter table public.provider_credential_vault add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.provider_credential_vault add column if not exists updated_at timestamptz not null default now();
alter table public.provider_token_exchange_runs add column if not exists provider_oauth_request_id uuid references public.provider_oauth_requests(id) on delete set null;
alter table public.provider_token_exchange_runs add column if not exists provider_oauth_callback_event_id uuid references public.provider_oauth_callback_events(id) on delete set null;
alter table public.provider_token_exchange_runs add column if not exists provider_credential_vault_id uuid references public.provider_credential_vault(id) on delete set null;
alter table public.provider_token_exchange_runs add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.provider_token_exchange_runs add column if not exists integration_type text not null default 'accounting';
alter table public.provider_token_exchange_runs drop constraint if exists provider_token_exchange_runs_integration_type_check;
alter table public.provider_token_exchange_runs add constraint provider_token_exchange_runs_integration_type_check check (integration_type in ('accounting', 'bank'));
alter table public.provider_token_exchange_runs add column if not exists provider text not null default 'manual_csv';
alter table public.provider_token_exchange_runs drop constraint if exists provider_token_exchange_runs_provider_check;
alter table public.provider_token_exchange_runs add constraint provider_token_exchange_runs_provider_check check (provider in ('quickbooks', 'xero', 'zoho_books', 'tally', 'manual_csv', 'plaid', 'lean', 'tarabut_gateway', 'emirates_nbd'));
alter table public.provider_token_exchange_runs add column if not exists exchange_mode text not null default 'authorization_code';
alter table public.provider_token_exchange_runs drop constraint if exists provider_token_exchange_runs_exchange_mode_check;
alter table public.provider_token_exchange_runs add constraint provider_token_exchange_runs_exchange_mode_check check (exchange_mode in ('authorization_code', 'refresh_token', 'dry_run'));
alter table public.provider_token_exchange_runs add column if not exists status text not null default 'prepared';
alter table public.provider_token_exchange_runs drop constraint if exists provider_token_exchange_runs_status_check;
alter table public.provider_token_exchange_runs add constraint provider_token_exchange_runs_status_check check (status in ('prepared', 'blocked', 'exchanging', 'vaulted', 'failed'));
alter table public.provider_token_exchange_runs add column if not exists authorization_code_hash text;
alter table public.provider_token_exchange_runs add column if not exists code_verifier_hash text;
alter table public.provider_token_exchange_runs add column if not exists token_response_hash text;
alter table public.provider_token_exchange_runs add column if not exists token_expires_at timestamptz;
alter table public.provider_token_exchange_runs add column if not exists started_at timestamptz not null default now();
alter table public.provider_token_exchange_runs add column if not exists completed_at timestamptz;
alter table public.provider_token_exchange_runs add column if not exists error_code text;
alter table public.provider_token_exchange_runs add column if not exists error_message text;
alter table public.provider_token_exchange_runs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.provider_token_exchange_runs add column if not exists updated_at timestamptz not null default now();
alter table public.workspace_bank_accounts add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.workspace_bank_accounts add column if not exists account_name text not null default 'Operating account';
alter table public.workspace_bank_accounts add column if not exists bank_name text;
alter table public.workspace_bank_accounts add column if not exists account_mask text;
alter table public.workspace_bank_accounts add column if not exists currency text not null default 'AED';
alter table public.workspace_bank_accounts add column if not exists status text not null default 'draft';
alter table public.workspace_bank_accounts drop constraint if exists workspace_bank_accounts_status_check;
alter table public.workspace_bank_accounts add constraint workspace_bank_accounts_status_check check (status in ('draft', 'active', 'paused', 'error'));
alter table public.workspace_bank_accounts add column if not exists last_import_at timestamptz;
alter table public.workspace_bank_accounts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.workspace_bank_accounts add column if not exists updated_at timestamptz not null default now();
alter table public.bank_transactions add column if not exists bank_account_id uuid references public.workspace_bank_accounts(id) on delete cascade;
alter table public.bank_transactions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.bank_transactions add column if not exists transaction_date date not null default current_date;
alter table public.bank_transactions add column if not exists posted_at timestamptz;
alter table public.bank_transactions add column if not exists description text not null default 'Imported bank transaction';
alter table public.bank_transactions add column if not exists counterparty text;
alter table public.bank_transactions add column if not exists reference text;
alter table public.bank_transactions add column if not exists direction text not null default 'credit';
alter table public.bank_transactions drop constraint if exists bank_transactions_direction_check;
alter table public.bank_transactions add constraint bank_transactions_direction_check check (direction in ('credit', 'debit'));
alter table public.bank_transactions add column if not exists amount numeric not null default 0;
alter table public.bank_transactions drop constraint if exists bank_transactions_amount_check;
alter table public.bank_transactions add constraint bank_transactions_amount_check check (amount >= 0);
alter table public.bank_transactions add column if not exists currency text not null default 'AED';
alter table public.bank_transactions add column if not exists status text not null default 'imported';
alter table public.bank_transactions drop constraint if exists bank_transactions_status_check;
alter table public.bank_transactions add constraint bank_transactions_status_check check (status in ('imported', 'matched', 'needs_review', 'ignored'));
alter table public.bank_transactions add column if not exists raw_payload jsonb not null default '{}'::jsonb;
alter table public.bank_transactions add column if not exists updated_at timestamptz not null default now();
alter table public.payment_match_suggestions add column if not exists bank_transaction_id uuid references public.bank_transactions(id) on delete cascade;
alter table public.payment_match_suggestions add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.payment_match_suggestions add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.payment_match_suggestions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.payment_match_suggestions add column if not exists confidence numeric not null default 0;
alter table public.payment_match_suggestions drop constraint if exists payment_match_suggestions_confidence_check;
alter table public.payment_match_suggestions add constraint payment_match_suggestions_confidence_check check (confidence >= 0 and confidence <= 100);
alter table public.payment_match_suggestions add column if not exists match_status text not null default 'suggested';
alter table public.payment_match_suggestions drop constraint if exists payment_match_suggestions_match_status_check;
alter table public.payment_match_suggestions add constraint payment_match_suggestions_match_status_check check (match_status in ('suggested', 'accepted', 'rejected', 'needs_review'));
alter table public.payment_match_suggestions add column if not exists match_reason text;
alter table public.payment_match_suggestions add column if not exists review_note text;
alter table public.payment_match_suggestions add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.payment_match_suggestions add column if not exists reviewed_at timestamptz;
alter table public.payment_match_suggestions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payment_match_suggestions add column if not exists updated_at timestamptz not null default now();
alter table public.payment_match_split_lines add column if not exists payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete cascade;
alter table public.payment_match_split_lines add column if not exists invoice_id uuid references public.invoices(id) on delete cascade;
alter table public.payment_match_split_lines add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.payment_match_split_lines add column if not exists line_order integer not null default 1;
alter table public.payment_match_split_lines add column if not exists amount numeric not null default 0;
alter table public.payment_match_split_lines drop constraint if exists payment_match_split_lines_amount_check;
alter table public.payment_match_split_lines add constraint payment_match_split_lines_amount_check check (amount >= 0);
alter table public.payment_match_split_lines add column if not exists status text not null default 'suggested';
alter table public.payment_match_split_lines drop constraint if exists payment_match_split_lines_status_check;
alter table public.payment_match_split_lines add constraint payment_match_split_lines_status_check check (status in ('suggested', 'accepted', 'rejected'));
alter table public.payment_match_split_lines add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payment_match_split_lines add column if not exists updated_at timestamptz not null default now();
alter table public.payment_allocations add column if not exists payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete set null;
alter table public.payment_allocations add column if not exists bank_transaction_id uuid references public.bank_transactions(id) on delete cascade;
alter table public.payment_allocations add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.payment_allocations add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.payment_allocations add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.payment_allocations add column if not exists reversed_by uuid references auth.users(id) on delete set null;
alter table public.payment_allocations add column if not exists amount numeric not null default 0;
alter table public.payment_allocations drop constraint if exists payment_allocations_amount_check;
alter table public.payment_allocations add constraint payment_allocations_amount_check check (amount >= 0);
alter table public.payment_allocations add column if not exists currency text not null default 'AED';
alter table public.payment_allocations add column if not exists status text not null default 'posted';
alter table public.payment_allocations drop constraint if exists payment_allocations_status_check;
alter table public.payment_allocations add constraint payment_allocations_status_check check (status in ('posted', 'reversed'));
alter table public.payment_allocations add column if not exists allocation_note text;
alter table public.payment_allocations add column if not exists reversal_note text;
alter table public.payment_allocations add column if not exists reversed_at timestamptz;
alter table public.payment_allocations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payment_allocations add column if not exists updated_at timestamptz not null default now();
alter table public.payment_allocation_lines add column if not exists payment_allocation_id uuid references public.payment_allocations(id) on delete cascade;
alter table public.payment_allocation_lines add column if not exists payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete set null;
alter table public.payment_allocation_lines add column if not exists bank_transaction_id uuid references public.bank_transactions(id) on delete set null;
alter table public.payment_allocation_lines add column if not exists invoice_id uuid references public.invoices(id) on delete cascade;
alter table public.payment_allocation_lines add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.payment_allocation_lines add column if not exists amount numeric not null default 0;
alter table public.payment_allocation_lines drop constraint if exists payment_allocation_lines_amount_check;
alter table public.payment_allocation_lines add constraint payment_allocation_lines_amount_check check (amount >= 0);
alter table public.payment_allocation_lines add column if not exists currency text not null default 'AED';
alter table public.payment_allocation_lines add column if not exists status text not null default 'posted';
alter table public.payment_allocation_lines drop constraint if exists payment_allocation_lines_status_check;
alter table public.payment_allocation_lines add constraint payment_allocation_lines_status_check check (status in ('posted', 'reversed'));
alter table public.payment_allocation_lines add column if not exists previous_invoice_status text;
alter table public.payment_allocation_lines add column if not exists remaining_after numeric not null default 0;
alter table public.payment_allocation_lines add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payment_allocation_lines add column if not exists updated_at timestamptz not null default now();
alter table public.customer_payment_credits add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.customer_payment_credits add column if not exists source_payment_allocation_id uuid references public.payment_allocations(id) on delete set null;
alter table public.customer_payment_credits add column if not exists bank_transaction_id uuid references public.bank_transactions(id) on delete set null;
alter table public.customer_payment_credits add column if not exists payment_match_suggestion_id uuid references public.payment_match_suggestions(id) on delete set null;
alter table public.customer_payment_credits add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customer_payment_credits add column if not exists amount numeric not null default 0;
alter table public.customer_payment_credits drop constraint if exists customer_payment_credits_amount_check;
alter table public.customer_payment_credits add constraint customer_payment_credits_amount_check check (amount >= 0);
alter table public.customer_payment_credits add column if not exists currency text not null default 'AED';
alter table public.customer_payment_credits add column if not exists status text not null default 'open';
alter table public.customer_payment_credits drop constraint if exists customer_payment_credits_status_check;
alter table public.customer_payment_credits add constraint customer_payment_credits_status_check check (status in ('open', 'applied', 'void'));
alter table public.customer_payment_credits add column if not exists credit_note text;
alter table public.customer_payment_credits add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_payment_credits add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_deals_updated_at on public.deals;
create trigger set_deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_outbound_messages_updated_at on public.outbound_messages;
create trigger set_outbound_messages_updated_at
before update on public.outbound_messages
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_email_settings_updated_at on public.workspace_email_settings;
create trigger set_workspace_email_settings_updated_at
before update on public.workspace_email_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_whatsapp_settings_updated_at on public.workspace_whatsapp_settings;
create trigger set_workspace_whatsapp_settings_updated_at
before update on public.workspace_whatsapp_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_owner_profiles_updated_at on public.workspace_owner_profiles;
create trigger set_workspace_owner_profiles_updated_at
before update on public.workspace_owner_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_collection_playbooks_updated_at on public.customer_collection_playbooks;
create trigger set_customer_collection_playbooks_updated_at
before update on public.customer_collection_playbooks
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_accounting_connections_updated_at on public.workspace_accounting_connections;
create trigger set_workspace_accounting_connections_updated_at
before update on public.workspace_accounting_connections
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_bank_accounts_updated_at on public.workspace_bank_accounts;
create trigger set_workspace_bank_accounts_updated_at
before update on public.workspace_bank_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_oauth_requests_updated_at on public.provider_oauth_requests;
create trigger set_provider_oauth_requests_updated_at
before update on public.provider_oauth_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_oauth_callback_events_updated_at on public.provider_oauth_callback_events;
create trigger set_provider_oauth_callback_events_updated_at
before update on public.provider_oauth_callback_events
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_credential_vault_updated_at on public.provider_credential_vault;
create trigger set_provider_credential_vault_updated_at
before update on public.provider_credential_vault
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_token_exchange_runs_updated_at on public.provider_token_exchange_runs;
create trigger set_provider_token_exchange_runs_updated_at
before update on public.provider_token_exchange_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_bank_transactions_updated_at on public.bank_transactions;
create trigger set_bank_transactions_updated_at
before update on public.bank_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_match_suggestions_updated_at on public.payment_match_suggestions;
create trigger set_payment_match_suggestions_updated_at
before update on public.payment_match_suggestions
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_match_split_lines_updated_at on public.payment_match_split_lines;
create trigger set_payment_match_split_lines_updated_at
before update on public.payment_match_split_lines
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_allocations_updated_at on public.payment_allocations;
create trigger set_payment_allocations_updated_at
before update on public.payment_allocations
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_allocation_lines_updated_at on public.payment_allocation_lines;
create trigger set_payment_allocation_lines_updated_at
before update on public.payment_allocation_lines
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_payment_credits_updated_at on public.customer_payment_credits;
create trigger set_customer_payment_credits_updated_at
before update on public.customer_payment_credits
for each row execute function public.set_updated_at();

drop trigger if exists set_collection_actions_updated_at on public.collection_actions;
create trigger set_collection_actions_updated_at
before update on public.collection_actions
for each row execute function public.set_updated_at();

drop trigger if exists set_owner_digest_runs_updated_at on public.owner_digest_runs;
create trigger set_owner_digest_runs_updated_at
before update on public.owner_digest_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_owner_digest_schedules_updated_at on public.owner_digest_schedules;
create trigger set_owner_digest_schedules_updated_at
before update on public.owner_digest_schedules
for each row execute function public.set_updated_at();

create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_customers_workspace_id on public.customers(workspace_id);
create index if not exists idx_deals_workspace_id on public.deals(workspace_id);
create index if not exists idx_deals_customer_id on public.deals(customer_id);
create index if not exists idx_invoices_workspace_id on public.invoices(workspace_id);
create index if not exists idx_invoices_customer_id on public.invoices(customer_id);
create index if not exists idx_invoices_due_date on public.invoices(due_date);
create index if not exists idx_ai_followups_workspace_id on public.ai_followups(workspace_id);
create index if not exists idx_ai_followups_invoice_id on public.ai_followups(invoice_id);
create index if not exists idx_outbound_messages_workspace_created_at on public.outbound_messages(workspace_id, created_at desc);
create index if not exists idx_outbound_messages_status on public.outbound_messages(status);
create index if not exists idx_outbound_messages_delivery_status on public.outbound_messages(delivery_status);
create index if not exists idx_outbound_messages_invoice_id on public.outbound_messages(invoice_id);
create index if not exists idx_outbound_messages_provider_message_id on public.outbound_messages(provider_message_id);
create index if not exists idx_outbound_messages_retry_due
on public.outbound_messages(status, next_retry_at, retry_count)
where status = 'failed';
create index if not exists idx_outbound_message_events_message_created_at on public.outbound_message_events(outbound_message_id, created_at desc);
create index if not exists idx_outbound_message_events_workspace_created_at on public.outbound_message_events(workspace_id, created_at desc);
create unique index if not exists idx_outbound_message_events_provider_event_id
on public.outbound_message_events(workspace_id, provider, provider_event_id)
where provider_event_id is not null;
create index if not exists idx_workspace_email_settings_workspace_id on public.workspace_email_settings(workspace_id);
create index if not exists idx_workspace_whatsapp_settings_workspace_id on public.workspace_whatsapp_settings(workspace_id);
create index if not exists idx_audit_logs_workspace_created_at on public.audit_logs(workspace_id, created_at desc);
create index if not exists idx_workspace_owner_profiles_workspace_status
on public.workspace_owner_profiles(workspace_id, status, label);
create index if not exists idx_workspace_owner_profiles_workspace_label
on public.workspace_owner_profiles(workspace_id, label);
create unique index if not exists idx_customer_collection_playbooks_workspace_customer_unique
on public.customer_collection_playbooks(workspace_id, customer_id);
create index if not exists idx_customer_collection_playbooks_workspace_customer
on public.customer_collection_playbooks(workspace_id, customer_id);
create index if not exists idx_customer_collection_playbooks_workspace_status
on public.customer_collection_playbooks(workspace_id, status, preferred_channel);
create index if not exists idx_workspace_accounting_connections_workspace_status
on public.workspace_accounting_connections(workspace_id, status, provider);
create index if not exists idx_accounting_sync_runs_workspace_created
on public.accounting_sync_runs(workspace_id, created_at desc);
create index if not exists idx_accounting_sync_runs_connection_created
on public.accounting_sync_runs(accounting_connection_id, created_at desc);
create index if not exists idx_accounting_sync_runs_workspace_status
on public.accounting_sync_runs(workspace_id, status, created_at desc);
create index if not exists idx_provider_oauth_requests_workspace_status
on public.provider_oauth_requests(workspace_id, status, created_at desc);
create index if not exists idx_provider_oauth_requests_provider_type
on public.provider_oauth_requests(workspace_id, provider, integration_type);
create index if not exists idx_provider_oauth_requests_expiry
on public.provider_oauth_requests(expires_at)
where status in ('ready', 'redirect_pending');
create index if not exists idx_provider_oauth_callback_events_workspace_status
on public.provider_oauth_callback_events(workspace_id, status, received_at desc);
create index if not exists idx_provider_oauth_callback_events_request_status
on public.provider_oauth_callback_events(provider_oauth_request_id, status, received_at desc);
create index if not exists idx_provider_oauth_callback_events_provider_type
on public.provider_oauth_callback_events(workspace_id, provider, integration_type, received_at desc);
create index if not exists idx_provider_credential_vault_workspace_status
on public.provider_credential_vault(workspace_id, status, provider);
create index if not exists idx_provider_credential_vault_request
on public.provider_credential_vault(provider_oauth_request_id, status);
create unique index if not exists idx_provider_credential_vault_workspace_provider_unique
on public.provider_credential_vault(workspace_id, provider, integration_type);
create index if not exists idx_provider_credential_vault_rotation_due
on public.provider_credential_vault(rotation_due_at)
where status in ('active', 'rotation_due');
create index if not exists idx_provider_token_exchange_runs_workspace_status
on public.provider_token_exchange_runs(workspace_id, status, started_at desc);
create index if not exists idx_provider_token_exchange_runs_request_status
on public.provider_token_exchange_runs(provider_oauth_request_id, status, started_at desc);
create index if not exists idx_provider_token_exchange_runs_vault
on public.provider_token_exchange_runs(provider_credential_vault_id, started_at desc);
create index if not exists idx_workspace_bank_accounts_workspace_status
on public.workspace_bank_accounts(workspace_id, status, bank_name);
create index if not exists idx_bank_transactions_workspace_date
on public.bank_transactions(workspace_id, transaction_date desc);
create index if not exists idx_bank_transactions_account_status
on public.bank_transactions(bank_account_id, status, transaction_date desc);
create index if not exists idx_payment_match_suggestions_workspace_status
on public.payment_match_suggestions(workspace_id, match_status, created_at desc);
create index if not exists idx_payment_match_suggestions_transaction
on public.payment_match_suggestions(bank_transaction_id, created_at desc);
create index if not exists idx_payment_match_suggestions_invoice
on public.payment_match_suggestions(invoice_id, match_status);
create index if not exists idx_payment_match_split_lines_match_order
on public.payment_match_split_lines(payment_match_suggestion_id, line_order, created_at);
create index if not exists idx_payment_match_split_lines_invoice
on public.payment_match_split_lines(invoice_id, status);
create index if not exists idx_payment_allocations_workspace_created
on public.payment_allocations(workspace_id, created_at desc);
create unique index if not exists idx_payment_allocations_workspace_match_unique
on public.payment_allocations(workspace_id, payment_match_suggestion_id);
create index if not exists idx_payment_allocations_invoice_status
on public.payment_allocations(invoice_id, status);
create index if not exists idx_payment_allocations_transaction
on public.payment_allocations(bank_transaction_id, status);
create index if not exists idx_payment_allocation_lines_allocation
on public.payment_allocation_lines(payment_allocation_id, status);
create index if not exists idx_payment_allocation_lines_invoice_status
on public.payment_allocation_lines(invoice_id, status);
create index if not exists idx_payment_allocation_lines_match
on public.payment_allocation_lines(payment_match_suggestion_id, status);
create index if not exists idx_customer_payment_credits_workspace_status
on public.customer_payment_credits(workspace_id, status, created_at desc);
create index if not exists idx_customer_payment_credits_customer_status
on public.customer_payment_credits(customer_id, status, created_at desc);
create unique index if not exists idx_customer_payment_credits_workspace_allocation_unique
on public.customer_payment_credits(workspace_id, source_payment_allocation_id)
where source_payment_allocation_id is not null;
create index if not exists idx_collection_actions_workspace_status_due
on public.collection_actions(workspace_id, status, due_at, created_at desc);
create index if not exists idx_collection_actions_invoice_status
on public.collection_actions(invoice_id, status);
create index if not exists idx_collection_actions_workspace_escalation
on public.collection_actions(workspace_id, escalation_level desc, escalated_at desc)
where status = 'open';
create index if not exists idx_collection_actions_workspace_owner_status
on public.collection_actions(workspace_id, owner_label, status, due_at)
where status = 'open';
create index if not exists idx_outbound_messages_workspace_review
on public.outbound_messages(workspace_id, review_status, status, created_at desc);
create index if not exists idx_owner_digest_runs_workspace_owner_created
on public.owner_digest_runs(workspace_id, owner_label, created_at desc);
create index if not exists idx_owner_digest_runs_workspace_status
on public.owner_digest_runs(workspace_id, status, created_at desc);
create index if not exists idx_owner_digest_schedules_workspace_status
on public.owner_digest_schedules(workspace_id, status, next_run_at);
create index if not exists idx_owner_digest_schedules_workspace_owner
on public.owner_digest_schedules(workspace_id, owner_label);

create or replace view public.collection_risk_scores
with (security_invoker = true)
as
with latest_outbound as (
  select distinct on (invoice_id)
    invoice_id,
    status as outbound_status,
    delivery_status,
    retry_count,
    next_retry_at,
    created_at
  from public.outbound_messages
  where invoice_id is not null
  order by invoice_id, created_at desc
),
followup_counts as (
  select invoice_id, count(*)::integer as followup_count
  from public.ai_followups
  where invoice_id is not null
  group by invoice_id
),
active_playbooks as (
  select *
  from public.customer_collection_playbooks
  where status = 'active'
),
scored as (
  select
    invoices.id,
    invoices.workspace_id,
    invoices.customer_id,
    customers.name as customer_name,
    invoices.invoice_number,
    invoices.amount,
    invoices.due_date,
    invoices.status,
    latest_outbound.outbound_status,
    latest_outbound.delivery_status,
    coalesce(latest_outbound.retry_count, 0) as retry_count,
    latest_outbound.next_retry_at,
    coalesce(followup_counts.followup_count, 0) as followup_count,
    active_playbooks.id as customer_playbook_id,
    active_playbooks.playbook_name,
    active_playbooks.payment_behavior,
    active_playbooks.preferred_channel,
    active_playbooks.reminder_tone,
    active_playbooks.escalation_policy,
    coalesce(active_playbooks.risk_weight, 0) as playbook_risk_weight,
    active_playbooks.days_before_due,
    case
      when invoices.due_date is null then null
      else current_date - invoices.due_date
    end as days_past_due,
    case
      when invoices.status = 'paid' then 0
      else least(100, greatest(0,
        (case
          when invoices.due_date is null then 12
          when current_date - invoices.due_date > 30 then 45
          when current_date - invoices.due_date > 14 then 35
          when current_date - invoices.due_date > 0 then 28
          when current_date - invoices.due_date >= -3 then 18
          when current_date - invoices.due_date >= -10 then 10
          else 0
        end)
        + (case
          when invoices.status = 'overdue' then 20
          when invoices.status = 'due' then 8
          when invoices.status = 'partial' then 12
          else 0
        end)
        + (case
          when invoices.amount >= 100000 then 20
          when invoices.amount >= 75000 then 14
          when invoices.amount >= 50000 then 10
          else 0
        end)
        + (case
          when latest_outbound.delivery_status in ('failed', 'bounced', 'complained', 'suppressed') then 22
          when latest_outbound.outbound_status = 'queued' then 8
          when latest_outbound.delivery_status in ('delivered', 'read', 'opened', 'clicked') then -8
          when latest_outbound.invoice_id is null and invoices.due_date is not null and current_date - invoices.due_date > 0 then 10
          else 0
        end)
        + least(16, coalesce(latest_outbound.retry_count, 0) * 6)
        + (case
          when coalesce(followup_counts.followup_count, 0) = 0 and invoices.due_date is not null and current_date - invoices.due_date >= -3 then 6
          else 0
        end)
        + coalesce(active_playbooks.risk_weight, 0)
      ))::integer
    end as risk_score
  from public.invoices
  left join public.customers on customers.id = invoices.customer_id
  left join latest_outbound on latest_outbound.invoice_id = invoices.id
  left join followup_counts on followup_counts.invoice_id = invoices.id
  left join active_playbooks on active_playbooks.workspace_id = invoices.workspace_id
    and active_playbooks.customer_id = invoices.customer_id
)
select
  scored.*,
  case
    when risk_score >= 75 then 'critical'
    when risk_score >= 55 then 'high'
    when risk_score >= 35 then 'watch'
    else 'steady'
  end as risk_band,
  case
    when delivery_status in ('failed', 'bounced', 'complained', 'suppressed') or retry_count > 0 then 'Retry provider send'
    when outbound_status = 'queued' then 'Approve queued follow-up'
    when escalation_policy = 'hold' then 'Review playbook hold'
    when escalation_policy = 'owner_review' and risk_score >= 35 then 'Owner review'
    when delivery_status in ('delivered', 'read', 'opened', 'clicked') and risk_score >= 55 then 'Call after engagement'
    when risk_score >= 75 then 'Call finance contact'
    when risk_score >= 55 and preferred_channel = 'whatsapp' then 'Send WhatsApp nudge'
    when risk_score >= 55 and preferred_channel = 'manual' then 'Manual owner follow-up'
    when risk_score >= 55 then 'Send firm follow-up'
    when followup_count = 0 and days_past_due is not null and days_past_due >= -3 then 'Draft reminder'
    when risk_score >= 35 then 'Prepare reminder'
    else 'Monitor'
  end as recommended_action,
  case
    when delivery_status in ('failed', 'bounced', 'complained', 'suppressed') or retry_count > 0 then 'Automation'
    when outbound_status = 'queued' then 'Review'
    when escalation_policy in ('hold', 'owner_review') then 'Review'
    when delivery_status in ('delivered', 'read', 'opened', 'clicked') and risk_score >= 55 then 'Phone'
    when risk_score >= 55 and preferred_channel = 'phone' then 'Phone'
    when risk_score >= 55 and preferred_channel = 'whatsapp' then 'WhatsApp'
    when risk_score >= 55 and preferred_channel = 'manual' then 'Manual'
    when risk_score >= 75 then 'Phone'
    when risk_score >= 55 then 'Email'
    when followup_count = 0 and days_past_due is not null and days_past_due >= -3 then 'AI Desk'
    when risk_score >= 35 and preferred_channel = 'whatsapp' then 'WhatsApp'
    when risk_score >= 35 and preferred_channel = 'phone' then 'Phone'
    when risk_score >= 35 then 'Email'
    else 'Watchlist'
  end as action_channel,
  case
    when delivery_status in ('failed', 'bounced', 'complained', 'suppressed') or retry_count > 0 then 'Now'
    when risk_score >= 55 or outbound_status = 'queued' then 'Today'
    when risk_score >= 35 or (followup_count = 0 and days_past_due is not null and days_past_due >= -3) then 'Next'
    else 'Later'
  end as action_urgency
from scored;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.seed_demo_workspace(target_workspace_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  alnoor_id uuid;
  meridian_id uuid;
  crescent_id uuid;
  gulfpack_id uuid;
  inserted_customers integer := 0;
  inserted_deals integer := 0;
  inserted_invoices integer := 0;
  inserted_owners integer := 0;
  inserted_playbooks integer := 0;
  inserted_accounting_connections integer := 0;
  inserted_accounting_runs integer := 0;
  inserted_oauth_requests integer := 0;
  inserted_oauth_callback_events integer := 0;
  inserted_credential_vault_entries integer := 0;
  inserted_token_exchange_runs integer := 0;
  inserted_bank_accounts integer := 0;
  inserted_bank_transactions integer := 0;
  inserted_match_suggestions integer := 0;
  accounting_connection_id uuid;
  bank_account_id uuid;
  zoho_oauth_request_id uuid;
  zoho_oauth_callback_event_id uuid;
  zoho_credential_vault_id uuid;
  meridian_invoice_id uuid;
  gulfpack_invoice_id uuid;
  alnoor_invoice_id uuid;
  crescent_split_invoice_a_id uuid;
  crescent_split_invoice_b_id uuid;
  meridian_transaction_id uuid;
  gulfpack_transaction_id uuid;
  alnoor_overpay_transaction_id uuid;
  alnoor_transaction_id uuid;
  crescent_split_transaction_id uuid;
  crescent_split_match_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Workspace access denied';
  end if;

  if exists (select 1 from public.customers where workspace_id = target_workspace_id)
    or exists (select 1 from public.deals where workspace_id = target_workspace_id)
    or exists (select 1 from public.invoices where workspace_id = target_workspace_id) then
    raise exception 'Workspace already contains finance data';
  end if;

  insert into public.customers (workspace_id, name, contact, email, phone, segment, terms, notes)
  values
    (target_workspace_id, 'Al Noor Components LLC', 'Faisal', 'faisal@alnoor.example', '+971 50 000 1204', 'Industrial trading', '50% advance, 50% before delivery', 'Sensitive to landed cost changes.')
  returning id into alnoor_id;
  inserted_customers := inserted_customers + 1;

  insert into public.customers (workspace_id, name, contact, email, phone, segment, terms, notes)
  values
    (target_workspace_id, 'Meridian Food Packaging', 'Rami', 'rami@meridian.example', '+971 55 000 8421', 'Packaging', 'Net 15', 'Good account, but payments drift after month end.')
  returning id into meridian_id;
  inserted_customers := inserted_customers + 1;

  insert into public.customers (workspace_id, name, contact, email, phone, segment, terms, notes)
  values
    (target_workspace_id, 'Crescent Marine Services', 'Sana', 'sana@crescent.example', '+971 52 000 3391', 'Marine services', 'Net 30', 'Often asks for spare parts bundles and tender pricing.')
  returning id into crescent_id;
  inserted_customers := inserted_customers + 1;

  insert into public.customers (workspace_id, name, contact, email, phone, segment, terms, notes)
  values
    (target_workspace_id, 'GulfPack Materials', 'Nadia', 'nadia@gulfpack.example', '+971 56 000 7730', 'Distribution', 'Due on receipt', 'Fast approval if quote has delivery dates.')
  returning id into gulfpack_id;
  inserted_customers := inserted_customers + 1;

  insert into public.deals (workspace_id, customer_id, title, value, stage, owner, next_action)
  values
    (target_workspace_id, alnoor_id, 'Industrial valve supply', 128000, 'quoted', 'Dhiraj', 'Follow up on revised landed cost'),
    (target_workspace_id, meridian_id, 'Monthly packaging contract', 94000, 'negotiation', 'Sales', 'Send final payment terms'),
    (target_workspace_id, crescent_id, 'Spare parts tender', 216000, 'lead', 'Ops', 'Prepare first quote'),
    (target_workspace_id, gulfpack_id, 'Warehouse replenishment', 76000, 'won', 'Finance', 'Raise invoice');
  get diagnostics inserted_deals = row_count;

  insert into public.invoices (workspace_id, customer_id, invoice_number, amount, due_date, status)
  values
    (target_workspace_id, meridian_id, 'INV-1048', 54000, '2026-05-02', 'overdue'),
    (target_workspace_id, gulfpack_id, 'INV-1052', 76000, '2026-05-14', 'due'),
    (target_workspace_id, alnoor_id, 'INV-1057', 64000, '2026-05-24', 'open'),
    (target_workspace_id, crescent_id, 'INV-1033', 42000, '2026-04-21', 'paid'),
    (target_workspace_id, alnoor_id, 'INV-1061', 118000, '2026-05-29', 'open'),
    (target_workspace_id, crescent_id, 'INV-1064', 32000, '2026-05-18', 'due'),
    (target_workspace_id, crescent_id, 'INV-1065', 38000, '2026-05-27', 'open');
  get diagnostics inserted_invoices = row_count;

  select id into meridian_invoice_id
  from public.invoices
  where workspace_id = target_workspace_id
    and invoice_number = 'INV-1048'
  limit 1;

  select id into gulfpack_invoice_id
  from public.invoices
  where workspace_id = target_workspace_id
    and invoice_number = 'INV-1052'
  limit 1;

  select id into alnoor_invoice_id
  from public.invoices
  where workspace_id = target_workspace_id
    and invoice_number = 'INV-1057'
  limit 1;

  select id into crescent_split_invoice_a_id
  from public.invoices
  where workspace_id = target_workspace_id
    and invoice_number = 'INV-1064'
  limit 1;

  select id into crescent_split_invoice_b_id
  from public.invoices
  where workspace_id = target_workspace_id
    and invoice_number = 'INV-1065'
  limit 1;

  insert into public.workspace_owner_profiles (workspace_id, created_by, label, display_name, work_email, phone, role_title, preferred_channel, status, metadata)
  values
    (target_workspace_id, auth.uid(), 'Finance owner', 'Finance Control Desk', 'finance@gulf-demo.example', '+971 50 000 4401', 'Collections lead', 'email', 'active', jsonb_build_object('seeded', true)),
    (target_workspace_id, auth.uid(), 'Sales owner', 'Sales Account Desk', 'sales@gulf-demo.example', '+971 50 000 4402', 'Commercial follow-up', 'whatsapp', 'active', jsonb_build_object('seeded', true)),
    (target_workspace_id, auth.uid(), 'Ops owner', 'Operations Desk', 'ops@gulf-demo.example', '+971 50 000 4403', 'Delivery coordination', 'manual', 'active', jsonb_build_object('seeded', true)),
    (target_workspace_id, auth.uid(), 'Dhiraj', 'Dhiraj', 'dhiraj@gulf-demo.example', '+971 50 000 4404', 'Workspace owner', 'email', 'active', jsonb_build_object('seeded', true))
  on conflict (workspace_id, label) do nothing;
  get diagnostics inserted_owners = row_count;

  insert into public.customer_collection_playbooks (
    workspace_id,
    customer_id,
    created_by,
    playbook_name,
    payment_behavior,
    preferred_channel,
    reminder_tone,
    escalation_policy,
    risk_weight,
    days_before_due,
    notes,
    metadata
  )
  values
    (target_workspace_id, alnoor_id, auth.uid(), 'Advance payment follow-up', 'reliable', 'email', 'friendly', 'standard', -4, 5, 'Confirm landed cost and payment split before due date.', jsonb_build_object('seeded', true)),
    (target_workspace_id, meridian_id, auth.uid(), 'Month-end drift recovery', 'slow_payer', 'phone', 'firm', 'owner_review', 14, 2, 'Call before month-end and ask for exact payment date.', jsonb_build_object('seeded', true)),
    (target_workspace_id, crescent_id, auth.uid(), 'Tender documentation path', 'dispute_prone', 'email', 'firm', 'high_touch', 10, 4, 'Attach delivery and tender references before asking for payment.', jsonb_build_object('seeded', true)),
    (target_workspace_id, gulfpack_id, auth.uid(), 'Fast approval path', 'reliable', 'whatsapp', 'friendly', 'standard', -2, 3, 'Use concise WhatsApp reminder with delivery date.', jsonb_build_object('seeded', true))
  on conflict (workspace_id, customer_id) do nothing;
  get diagnostics inserted_playbooks = row_count;

  insert into public.workspace_accounting_connections (
    workspace_id,
    created_by,
    provider,
    connection_name,
    status,
    sync_direction,
    default_currency,
    last_sync_at,
    next_sync_at,
    metadata
  )
  values (
    target_workspace_id,
    auth.uid(),
    'zoho_books',
    'Zoho Books sandbox',
    'sandbox',
    'import_payments',
    'AED',
    now() - interval '1 day',
    now() + interval '1 day',
    jsonb_build_object(
      'seeded', true,
      'mode', 'demo',
      'supported_objects', jsonb_build_array('customers', 'invoices', 'payments')
    )
  )
  on conflict (workspace_id, provider) do update
  set
    connection_name = excluded.connection_name,
    status = excluded.status,
    sync_direction = excluded.sync_direction,
    default_currency = excluded.default_currency,
    last_sync_at = excluded.last_sync_at,
    next_sync_at = excluded.next_sync_at,
    metadata = excluded.metadata
  returning id into accounting_connection_id;
  get diagnostics inserted_accounting_connections = row_count;

  insert into public.accounting_sync_runs (
    workspace_id,
    accounting_connection_id,
    created_by,
    run_type,
    status,
    started_at,
    completed_at,
    records_examined,
    records_matched,
    records_created,
    records_failed,
    summary,
    metadata
  )
  values
    (
      target_workspace_id,
      accounting_connection_id,
      auth.uid(),
      'dry_run',
      'completed',
      now() - interval '1 day',
      now() - interval '1 day' + interval '2 minutes',
      5,
      4,
      0,
      1,
      'Demo dry run matched four invoices and flagged one payment for review.',
      jsonb_build_object('seeded', true, 'provider', 'zoho_books')
    ),
    (
      target_workspace_id,
      accounting_connection_id,
      auth.uid(),
      'manual',
      'needs_review',
      now() - interval '2 hours',
      now() - interval '118 minutes',
      3,
      2,
      0,
      1,
      'One incoming payment needs finance review before invoice status changes.',
      jsonb_build_object('seeded', true, 'provider', 'zoho_books')
    );
  get diagnostics inserted_accounting_runs = row_count;

  insert into public.workspace_bank_accounts (
    workspace_id,
    created_by,
    account_name,
    bank_name,
    account_mask,
    currency,
    status,
    last_import_at,
    metadata
  )
  values (
    target_workspace_id,
    auth.uid(),
    'AED operating account',
    'Emirates NBD',
    '**** 4821',
    'AED',
    'active',
    now() - interval '1 hour',
    jsonb_build_object(
      'seeded', true,
      'mode', 'demo',
      'import_source', 'bank_csv'
    )
  )
  on conflict (workspace_id, account_name) do update
  set
    bank_name = excluded.bank_name,
    account_mask = excluded.account_mask,
    currency = excluded.currency,
    status = excluded.status,
    last_import_at = excluded.last_import_at,
    metadata = excluded.metadata
  returning id into bank_account_id;
  get diagnostics inserted_bank_accounts = row_count;

  insert into public.provider_oauth_requests (
    workspace_id,
    created_by,
    integration_type,
    provider,
    accounting_connection_id,
    bank_account_id,
    status,
    requested_scopes,
    redirect_uri,
    state_nonce_hash,
    code_challenge_method,
    code_challenge_hash,
    expires_at,
    authorized_at,
    metadata
  )
  values
    (
      target_workspace_id,
      auth.uid(),
      'accounting',
      'zoho_books',
      accounting_connection_id,
      null,
      'authorized',
      jsonb_build_array('contacts.read', 'invoices.read', 'payments.read'),
      'https://collectra.example/oauth/callback/accounting/zoho_books',
      'demo_state_hash_zoho_books_20260509',
      'S256',
      'demo_pkce_hash_zoho_books_20260509',
      now() + interval '15 minutes',
      now() - interval '4 minutes',
      jsonb_build_object('seeded', true, 'token_storage', 'server_only', 'mode', 'demo_oauth_request', 'credential_vault', 'active')
    ),
    (
      target_workspace_id,
      auth.uid(),
      'bank',
      'lean',
      null,
      bank_account_id,
      'draft',
      jsonb_build_array('accounts.read', 'transactions.read'),
      'https://collectra.example/oauth/callback/bank/lean',
      'demo_state_hash_lean_20260509',
      'S256',
      'demo_pkce_hash_lean_20260509',
      now() + interval '15 minutes',
      null,
      jsonb_build_object('seeded', true, 'token_storage', 'server_only', 'mode', 'demo_oauth_request')
    );
  get diagnostics inserted_oauth_requests = row_count;

  select id
  into zoho_oauth_request_id
  from public.provider_oauth_requests
  where workspace_id = target_workspace_id
    and integration_type = 'accounting'
    and provider = 'zoho_books'
  order by created_at desc
  limit 1;

  insert into public.provider_oauth_callback_events (
    workspace_id,
    provider_oauth_request_id,
    integration_type,
    provider,
    status,
    state_nonce_hash,
    authorization_code_hash,
    received_at,
    metadata
  )
  values (
    target_workspace_id,
    zoho_oauth_request_id,
    'accounting',
    'zoho_books',
    'authorized',
    'demo_state_hash_zoho_books_20260509',
    'demo_authorization_code_hash_zoho_books_20260509',
    now() - interval '5 minutes',
    jsonb_build_object(
      'seeded', true,
      'raw_authorization_code_stored', false,
      'raw_tokens_stored', false,
      'token_storage', 'server_only',
      'next_step', 'encrypted_vault_rotation'
    )
  )
  returning id into zoho_oauth_callback_event_id;
  get diagnostics inserted_oauth_callback_events = row_count;

  insert into public.provider_credential_vault (
    workspace_id,
    provider_oauth_request_id,
    provider_oauth_callback_event_id,
    accounting_connection_id,
    integration_type,
    provider,
    status,
    credential_ref,
    token_family_hash,
    encryption_key_version,
    scopes,
    token_expires_at,
    last_refreshed_at,
    rotation_due_at,
    metadata
  )
  values (
    target_workspace_id,
    zoho_oauth_request_id,
    zoho_oauth_callback_event_id,
    accounting_connection_id,
    'accounting',
    'zoho_books',
    'active',
    'vault://collectra/demo/zoho_books/gulf_trading',
    'demo_token_family_hash_zoho_books_20260509',
    'edge-vault-demo-v1',
    jsonb_build_array('contacts.read', 'invoices.read', 'payments.read'),
    now() + interval '55 minutes',
    now() - interval '4 minutes',
    now() + interval '45 minutes',
    jsonb_build_object(
      'seeded', true,
      'storage_mode', 'server_vault_reference',
      'raw_tokens_stored_in_workspace_rows', false,
      'ciphertext_exposed_to_browser', false
    )
  )
  on conflict (workspace_id, provider, integration_type) do update
  set
    provider_oauth_request_id = excluded.provider_oauth_request_id,
    provider_oauth_callback_event_id = excluded.provider_oauth_callback_event_id,
    accounting_connection_id = excluded.accounting_connection_id,
    status = excluded.status,
    credential_ref = excluded.credential_ref,
    token_family_hash = excluded.token_family_hash,
    encryption_key_version = excluded.encryption_key_version,
    scopes = excluded.scopes,
    token_expires_at = excluded.token_expires_at,
    last_refreshed_at = excluded.last_refreshed_at,
    rotation_due_at = excluded.rotation_due_at,
    metadata = excluded.metadata
  returning id into zoho_credential_vault_id;
  get diagnostics inserted_credential_vault_entries = row_count;

  insert into public.provider_token_exchange_runs (
    workspace_id,
    provider_oauth_request_id,
    provider_oauth_callback_event_id,
    provider_credential_vault_id,
    integration_type,
    provider,
    exchange_mode,
    status,
    authorization_code_hash,
    code_verifier_hash,
    token_response_hash,
    token_expires_at,
    started_at,
    completed_at,
    metadata
  )
  values (
    target_workspace_id,
    zoho_oauth_request_id,
    zoho_oauth_callback_event_id,
    zoho_credential_vault_id,
    'accounting',
    'zoho_books',
    'authorization_code',
    'vaulted',
    'demo_authorization_code_hash_zoho_books_20260509',
    'demo_code_verifier_hash_zoho_books_20260509',
    'demo_token_response_hash_zoho_books_20260509',
    now() + interval '55 minutes',
    now() - interval '4 minutes',
    now() - interval '3 minutes',
    jsonb_build_object(
      'seeded', true,
      'edge_function', 'exchange-provider-token',
      'raw_authorization_code_stored', false,
      'raw_tokens_stored', false,
      'vault_write_required_before_provider_exchange', true
    )
  );
  get diagnostics inserted_token_exchange_runs = row_count;

  insert into public.bank_transactions (
    workspace_id,
    bank_account_id,
    created_by,
    transaction_date,
    posted_at,
    description,
    counterparty,
    reference,
    direction,
    amount,
    currency,
    status,
    raw_payload
  )
  values (
    target_workspace_id,
    bank_account_id,
    auth.uid(),
    current_date,
    now() - interval '55 minutes',
    'Incoming transfer INV-1048 Meridian',
    'Meridian Food Packaging',
    'BNK-2026-0509-001',
    'credit',
    54000,
    'AED',
    'needs_review',
    jsonb_build_object('seeded', true, 'source', 'bank_csv')
  )
  returning id into meridian_transaction_id;
  inserted_bank_transactions := inserted_bank_transactions + 1;

  insert into public.bank_transactions (
    workspace_id,
    bank_account_id,
    created_by,
    transaction_date,
    posted_at,
    description,
    counterparty,
    reference,
    direction,
    amount,
    currency,
    status,
    raw_payload
  )
  values (
    target_workspace_id,
    bank_account_id,
    auth.uid(),
    current_date + 1,
    now() - interval '42 minutes',
    'Partial incoming transfer GulfPack INV-1052',
    'GulfPack Materials',
    'BNK-2026-0509-002',
    'credit',
    30000,
    'AED',
    'imported',
    jsonb_build_object('seeded', true, 'source', 'bank_csv')
  )
  returning id into gulfpack_transaction_id;
  inserted_bank_transactions := inserted_bank_transactions + 1;

  insert into public.bank_transactions (
    workspace_id,
    bank_account_id,
    created_by,
    transaction_date,
    posted_at,
    description,
    counterparty,
    reference,
    direction,
    amount,
    currency,
    status,
    raw_payload
  )
  values (
    target_workspace_id,
    bank_account_id,
    auth.uid(),
    current_date + 1,
    now() - interval '38 minutes',
    'Overpayment Al Noor INV-1057',
    'Al Noor Components LLC',
    'BNK-2026-0509-003',
    'credit',
    72000,
    'AED',
    'needs_review',
    jsonb_build_object('seeded', true, 'source', 'bank_csv')
  )
  returning id into alnoor_overpay_transaction_id;
  inserted_bank_transactions := inserted_bank_transactions + 1;

  insert into public.bank_transactions (
    workspace_id,
    bank_account_id,
    created_by,
    transaction_date,
    posted_at,
    description,
    counterparty,
    reference,
    direction,
    amount,
    currency,
    status,
    raw_payload
  )
  values (
    target_workspace_id,
    bank_account_id,
    auth.uid(),
    current_date + 1,
    now() - interval '36 minutes',
    'Combined payment Crescent INV-1064 INV-1065',
    'Crescent Marine Services',
    'BNK-2026-0509-004',
    'credit',
    70000,
    'AED',
    'needs_review',
    jsonb_build_object('seeded', true, 'source', 'bank_csv', 'split_payment_candidate', true)
  )
  returning id into crescent_split_transaction_id;
  inserted_bank_transactions := inserted_bank_transactions + 1;

  insert into public.bank_transactions (
    workspace_id,
    bank_account_id,
    created_by,
    transaction_date,
    posted_at,
    description,
    counterparty,
    reference,
    direction,
    amount,
    currency,
    status,
    raw_payload
  )
  values (
    target_workspace_id,
    bank_account_id,
    auth.uid(),
    current_date + 1,
    now() - interval '35 minutes',
    'Advance payment Al Noor project',
    'Al Noor Components LLC',
    'BNK-2026-0509-005',
    'credit',
    128000,
    'AED',
    'needs_review',
    jsonb_build_object('seeded', true, 'source', 'bank_csv')
  )
  returning id into alnoor_transaction_id;
  inserted_bank_transactions := inserted_bank_transactions + 1;

  insert into public.payment_match_suggestions (
    workspace_id,
    bank_transaction_id,
    invoice_id,
    customer_id,
    created_by,
    confidence,
    match_status,
    match_reason,
    review_note,
    metadata
  )
  values
    (
      target_workspace_id,
      meridian_transaction_id,
      meridian_invoice_id,
      meridian_id,
      auth.uid(),
      94,
      'suggested',
      'Exact amount and invoice number found in bank description.',
      'Finance should approve before marking INV-1048 paid.',
      jsonb_build_object('seeded', true, 'signals', jsonb_build_array('invoice_number', 'amount', 'customer_name'))
    ),
    (
      target_workspace_id,
      gulfpack_transaction_id,
      gulfpack_invoice_id,
      gulfpack_id,
      auth.uid(),
      88,
      'suggested',
      'Invoice reference and customer name match, but amount is a partial remittance.',
      'Approve as partial payment and keep the remaining balance open.',
      jsonb_build_object('seeded', true, 'signals', jsonb_build_array('invoice_number', 'customer_name', 'partial_amount'), 'partial_payment_candidate', true)
    ),
    (
      target_workspace_id,
      alnoor_overpay_transaction_id,
      alnoor_invoice_id,
      alnoor_id,
      auth.uid(),
      83,
      'suggested',
      'Invoice reference and customer match, with extra cash above the open balance.',
      'Approve the invoice amount and keep the excess as customer credit.',
      jsonb_build_object('seeded', true, 'signals', jsonb_build_array('invoice_number', 'customer_name', 'overpayment_amount'), 'overpayment_candidate', true)
    ),
    (
      target_workspace_id,
      crescent_split_transaction_id,
      null,
      crescent_id,
      auth.uid(),
      91,
      'suggested',
      'Combined customer remittance maps cleanly to INV-1064 and INV-1065.',
      'Approve as a split payment across both Crescent invoices.',
      jsonb_build_object('seeded', true, 'signals', jsonb_build_array('customer_name', 'two_invoice_total'), 'split_payment_candidate', true)
    ),
    (
      target_workspace_id,
      alnoor_transaction_id,
      null,
      alnoor_id,
      auth.uid(),
      62,
      'needs_review',
      'Amount matches open deal value but no invoice exists yet.',
      'Review as possible advance payment before creating allocation.',
      jsonb_build_object('seeded', true, 'signals', jsonb_build_array('customer_name', 'deal_value'))
    );
  get diagnostics inserted_match_suggestions = row_count;

  select id into crescent_split_match_id
  from public.payment_match_suggestions
  where workspace_id = target_workspace_id
    and bank_transaction_id = crescent_split_transaction_id
  limit 1;

  insert into public.payment_match_split_lines (
    workspace_id,
    payment_match_suggestion_id,
    invoice_id,
    customer_id,
    line_order,
    amount,
    status,
    metadata
  )
  values
    (
      target_workspace_id,
      crescent_split_match_id,
      crescent_split_invoice_a_id,
      crescent_id,
      1,
      32000,
      'suggested',
      jsonb_build_object('seeded', true, 'invoice_number', 'INV-1064')
    ),
    (
      target_workspace_id,
      crescent_split_match_id,
      crescent_split_invoice_b_id,
      crescent_id,
      2,
      38000,
      'suggested',
      jsonb_build_object('seeded', true, 'invoice_number', 'INV-1065')
    );

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, summary, metadata)
  values (
    target_workspace_id,
    auth.uid(),
    'workspace.seeded',
    'workspace',
    target_workspace_id,
    'Demo customers, deals, invoices, owner profiles, collection playbooks, accounting sync records, and bank match suggestions seeded',
    jsonb_build_object(
      'customers', inserted_customers,
      'deals', inserted_deals,
      'invoices', inserted_invoices,
      'owners', inserted_owners,
      'playbooks', inserted_playbooks,
      'accounting_connections', inserted_accounting_connections,
      'accounting_runs', inserted_accounting_runs,
      'oauth_requests', inserted_oauth_requests,
      'oauth_callback_events', inserted_oauth_callback_events,
      'credential_vault_entries', inserted_credential_vault_entries,
      'token_exchange_runs', inserted_token_exchange_runs,
      'bank_accounts', inserted_bank_accounts,
      'bank_transactions', inserted_bank_transactions,
      'match_suggestions', inserted_match_suggestions,
      'method', 'database_rpc'
    )
  );

  return jsonb_build_object(
    'customers', inserted_customers,
    'deals', inserted_deals,
    'invoices', inserted_invoices,
    'owners', inserted_owners,
    'playbooks', inserted_playbooks,
    'accounting_connections', inserted_accounting_connections,
    'accounting_runs', inserted_accounting_runs,
    'oauth_requests', inserted_oauth_requests,
    'oauth_callback_events', inserted_oauth_callback_events,
    'credential_vault_entries', inserted_credential_vault_entries,
    'token_exchange_runs', inserted_token_exchange_runs,
    'bank_accounts', inserted_bank_accounts,
    'bank_transactions', inserted_bank_transactions,
    'match_suggestions', inserted_match_suggestions,
    'method', 'database_rpc'
  );
end;
$$;

revoke execute on function public.seed_demo_workspace(uuid) from anon;
grant execute on function public.seed_demo_workspace(uuid) to authenticated;

create or replace function public.invoice_allocated_amount(
  target_workspace_id uuid,
  target_invoice_id uuid,
  excluded_allocation_id uuid default null,
  excluded_match_id uuid default null
)
returns numeric
language sql
stable
set search_path = public
as $$
  select
    coalesce((
      select sum(amount)
      from public.payment_allocations
      where workspace_id = target_workspace_id
        and invoice_id = target_invoice_id
        and status = 'posted'
        and (excluded_allocation_id is null or id <> excluded_allocation_id)
        and (excluded_match_id is null or payment_match_suggestion_id is distinct from excluded_match_id)
    ), 0)
    +
    coalesce((
      select sum(amount)
      from public.payment_allocation_lines
      where workspace_id = target_workspace_id
        and invoice_id = target_invoice_id
        and status = 'posted'
        and (excluded_allocation_id is null or payment_allocation_id <> excluded_allocation_id)
        and (excluded_match_id is null or payment_match_suggestion_id is distinct from excluded_match_id)
    ), 0);
$$;

create or replace function public.approve_payment_match(
  target_match_id uuid,
  approval_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  match_row public.payment_match_suggestions%rowtype;
  transaction_row public.bank_transactions%rowtype;
  invoice_row public.invoices%rowtype;
  split_line public.payment_match_split_lines%rowtype;
  line_invoice public.invoices%rowtype;
  allocation_id uuid;
  credit_id uuid;
  clean_note text;
  split_line_count integer := 0;
  accepted_split_line_count integer := 0;
  existing_invoice_allocated numeric := 0;
  remaining_invoice_amount numeric := 0;
  applied_amount numeric := 0;
  remaining_after_allocation numeric := 0;
  unallocated_transaction_amount numeric := 0;
  next_invoice_status text := 'paid';
  remaining_transaction_amount numeric := 0;
  line_suggested_amount numeric := 0;
  line_applied_amount numeric := 0;
  line_remaining_after numeric := 0;
  line_next_status text := 'paid';
  split_lines_json jsonb := '[]'::jsonb;
  split_invoice_numbers text[] := array[]::text[];
  credit_customer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into match_row
  from public.payment_match_suggestions
  where id = target_match_id
  for update;

  if not found then
    raise exception 'Payment match suggestion not found';
  end if;

  if not public.is_workspace_member(match_row.workspace_id) then
    raise exception 'Workspace access denied';
  end if;

  if match_row.match_status = 'rejected' then
    raise exception 'Rejected payment match suggestions cannot be approved';
  end if;

  select *
  into transaction_row
  from public.bank_transactions
  where id = match_row.bank_transaction_id
    and workspace_id = match_row.workspace_id
  for update;

  if not found then
    raise exception 'Bank transaction not found';
  end if;

  select count(*)
  into split_line_count
  from public.payment_match_split_lines
  where workspace_id = match_row.workspace_id
    and payment_match_suggestion_id = match_row.id
    and status <> 'rejected';

  if split_line_count = 0 and match_row.invoice_id is null then
    raise exception 'Payment match suggestion is not linked to an invoice or split lines';
  end if;

  clean_note := nullif(trim(coalesce(approval_note, '')), '');
  credit_customer_id := match_row.customer_id;

  update public.payment_match_suggestions
  set
    match_status = 'accepted',
    review_note = coalesce(clean_note, review_note),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    metadata = metadata || jsonb_build_object('approved_by', auth.uid(), 'approved_at', now(), 'split_payment', split_line_count > 0)
  where id = match_row.id;

  update public.bank_transactions
  set status = 'matched'
  where id = transaction_row.id;

  if split_line_count = 0 then
    select *
    into invoice_row
    from public.invoices
    where id = match_row.invoice_id
      and workspace_id = match_row.workspace_id
    for update;

    if not found then
      raise exception 'Invoice not found';
    end if;

    credit_customer_id := coalesce(credit_customer_id, invoice_row.customer_id);

    existing_invoice_allocated := public.invoice_allocated_amount(match_row.workspace_id, invoice_row.id, null, match_row.id);
    remaining_invoice_amount := greatest(invoice_row.amount - existing_invoice_allocated, 0);
    applied_amount := least(transaction_row.amount, remaining_invoice_amount);

    if applied_amount <= 0 then
      raise exception 'Invoice has no remaining balance to allocate';
    end if;

    remaining_after_allocation := greatest(invoice_row.amount - existing_invoice_allocated - applied_amount, 0);
    unallocated_transaction_amount := greatest(transaction_row.amount - applied_amount, 0);
    if remaining_after_allocation > 0 then
      next_invoice_status := 'partial';
    else
      next_invoice_status := 'paid';
    end if;

    update public.invoices
    set status = next_invoice_status
    where id = invoice_row.id;

    insert into public.payment_allocations (
      workspace_id,
      payment_match_suggestion_id,
      bank_transaction_id,
      invoice_id,
      customer_id,
      approved_by,
      amount,
      currency,
      status,
      allocation_note,
      metadata
    )
    values (
      match_row.workspace_id,
      match_row.id,
      transaction_row.id,
      invoice_row.id,
      coalesce(match_row.customer_id, invoice_row.customer_id),
      auth.uid(),
      applied_amount,
      transaction_row.currency,
      'posted',
      coalesce(clean_note, match_row.review_note),
      jsonb_build_object(
        'confidence', match_row.confidence,
        'match_reason', match_row.match_reason,
        'invoice_number', invoice_row.invoice_number,
        'bank_reference', transaction_row.reference,
        'previous_invoice_status', invoice_row.status,
        'previous_bank_status', transaction_row.status,
        'previous_match_status', match_row.match_status,
        'invoice_amount', invoice_row.amount,
        'allocated_before', existing_invoice_allocated,
        'applied_amount', applied_amount,
        'remaining_after', remaining_after_allocation,
        'transaction_amount', transaction_row.amount,
        'unallocated_transaction_amount', unallocated_transaction_amount,
        'invoice_status_after_allocation', next_invoice_status,
        'partial_payment', next_invoice_status = 'partial',
        'split_payment', false
      )
    )
    on conflict (workspace_id, payment_match_suggestion_id) do update
    set
      bank_transaction_id = excluded.bank_transaction_id,
      invoice_id = excluded.invoice_id,
      customer_id = excluded.customer_id,
      approved_by = excluded.approved_by,
      amount = excluded.amount,
      currency = excluded.currency,
      status = 'posted',
      allocation_note = excluded.allocation_note,
      metadata = excluded.metadata
    returning id into allocation_id;
  else
    insert into public.payment_allocations (
      workspace_id,
      payment_match_suggestion_id,
      bank_transaction_id,
      invoice_id,
      customer_id,
      approved_by,
      amount,
      currency,
      status,
      allocation_note,
      metadata
    )
    values (
      match_row.workspace_id,
      match_row.id,
      transaction_row.id,
      null,
      match_row.customer_id,
      auth.uid(),
      0,
      transaction_row.currency,
      'posted',
      coalesce(clean_note, match_row.review_note),
      jsonb_build_object(
        'confidence', match_row.confidence,
        'match_reason', match_row.match_reason,
        'bank_reference', transaction_row.reference,
        'previous_bank_status', transaction_row.status,
        'previous_match_status', match_row.match_status,
        'transaction_amount', transaction_row.amount,
        'split_payment', true
      )
    )
    on conflict (workspace_id, payment_match_suggestion_id) do update
    set
      bank_transaction_id = excluded.bank_transaction_id,
      invoice_id = null,
      customer_id = excluded.customer_id,
      approved_by = excluded.approved_by,
      amount = 0,
      currency = excluded.currency,
      status = 'posted',
      allocation_note = excluded.allocation_note,
      metadata = excluded.metadata
    returning id into allocation_id;

    delete from public.payment_allocation_lines
    where workspace_id = match_row.workspace_id
      and payment_allocation_id = allocation_id;

    for split_line in
      select *
      from public.payment_match_split_lines
      where workspace_id = match_row.workspace_id
        and payment_match_suggestion_id = match_row.id
        and status <> 'rejected'
      order by line_order, created_at
    loop
      remaining_transaction_amount := greatest(transaction_row.amount - applied_amount, 0);
      exit when remaining_transaction_amount <= 0;

      select *
      into line_invoice
      from public.invoices
      where id = split_line.invoice_id
        and workspace_id = match_row.workspace_id
      for update;

      if not found then
        raise exception 'Split invoice not found';
      end if;

      credit_customer_id := coalesce(credit_customer_id, line_invoice.customer_id);
      existing_invoice_allocated := public.invoice_allocated_amount(match_row.workspace_id, line_invoice.id, allocation_id, match_row.id);
      remaining_invoice_amount := greatest(line_invoice.amount - existing_invoice_allocated, 0);
      line_suggested_amount := case when split_line.amount > 0 then split_line.amount else remaining_invoice_amount end;
      line_applied_amount := least(line_suggested_amount, remaining_invoice_amount, remaining_transaction_amount);

      if line_applied_amount > 0 then
        line_remaining_after := greatest(line_invoice.amount - existing_invoice_allocated - line_applied_amount, 0);
        if line_remaining_after > 0 then
          line_next_status := 'partial';
        else
          line_next_status := 'paid';
        end if;

        update public.invoices
        set status = line_next_status
        where id = line_invoice.id;

        insert into public.payment_allocation_lines (
          workspace_id,
          payment_allocation_id,
          payment_match_suggestion_id,
          bank_transaction_id,
          invoice_id,
          customer_id,
          amount,
          currency,
          status,
          previous_invoice_status,
          remaining_after,
          metadata
        )
        values (
          match_row.workspace_id,
          allocation_id,
          match_row.id,
          transaction_row.id,
          line_invoice.id,
          line_invoice.customer_id,
          line_applied_amount,
          transaction_row.currency,
          'posted',
          line_invoice.status,
          line_remaining_after,
          jsonb_build_object(
            'invoice_number', line_invoice.invoice_number,
            'invoice_amount', line_invoice.amount,
            'allocated_before', existing_invoice_allocated,
            'suggested_amount', split_line.amount,
            'applied_amount', line_applied_amount,
            'remaining_after', line_remaining_after,
            'invoice_status_after_allocation', line_next_status,
            'line_order', split_line.line_order
          )
        );

        update public.payment_match_split_lines
        set
          status = 'accepted',
          metadata = metadata || jsonb_build_object('approved_amount', line_applied_amount, 'approved_at', now())
        where id = split_line.id;

        applied_amount := applied_amount + line_applied_amount;
        accepted_split_line_count := accepted_split_line_count + 1;
        split_invoice_numbers := array_append(split_invoice_numbers, line_invoice.invoice_number);
        split_lines_json := split_lines_json || jsonb_build_array(jsonb_build_object(
          'invoice_id', line_invoice.id,
          'invoice_number', line_invoice.invoice_number,
          'customer_id', line_invoice.customer_id,
          'amount', line_applied_amount,
          'remaining_after', line_remaining_after,
          'invoice_status', line_next_status
        ));
      end if;
    end loop;

    if applied_amount <= 0 then
      raise exception 'Split lines did not allocate any payment amount';
    end if;

    unallocated_transaction_amount := greatest(transaction_row.amount - applied_amount, 0);
    remaining_after_allocation := unallocated_transaction_amount;
    next_invoice_status := 'split';

    update public.payment_allocations
    set
      amount = applied_amount,
      customer_id = credit_customer_id,
      metadata = metadata || jsonb_build_object(
        'applied_amount', applied_amount,
        'remaining_after', remaining_after_allocation,
        'unallocated_transaction_amount', unallocated_transaction_amount,
        'split_payment', true,
        'split_line_count', accepted_split_line_count,
        'split_lines', split_lines_json
      )
    where id = allocation_id;
  end if;

  if unallocated_transaction_amount > 0 then
    insert into public.customer_payment_credits (
      workspace_id,
      customer_id,
      source_payment_allocation_id,
      bank_transaction_id,
      payment_match_suggestion_id,
      created_by,
      amount,
      currency,
      status,
      credit_note,
      metadata
    )
    values (
      match_row.workspace_id,
      credit_customer_id,
      allocation_id,
      transaction_row.id,
      match_row.id,
      auth.uid(),
      unallocated_transaction_amount,
      transaction_row.currency,
      'open',
      case when split_line_count > 0 then 'Split payment remainder from ' else 'Overpayment credit from ' end || coalesce(transaction_row.reference, array_to_string(split_invoice_numbers, ', '), invoice_row.invoice_number),
      jsonb_build_object(
        'invoice_id', invoice_row.id,
        'invoice_number', invoice_row.invoice_number,
        'split_payment', split_line_count > 0,
        'split_lines', split_lines_json,
        'bank_reference', transaction_row.reference,
        'transaction_amount', transaction_row.amount,
        'applied_amount', applied_amount,
        'credit_amount', unallocated_transaction_amount,
        'source', case when split_line_count > 0 then 'approve_payment_match_split' else 'approve_payment_match' end
      )
    )
    on conflict (workspace_id, source_payment_allocation_id) do update
    set
      customer_id = excluded.customer_id,
      bank_transaction_id = excluded.bank_transaction_id,
      payment_match_suggestion_id = excluded.payment_match_suggestion_id,
      amount = excluded.amount,
      currency = excluded.currency,
      status = 'open',
      credit_note = excluded.credit_note,
      metadata = excluded.metadata
    returning id into credit_id;

    update public.payment_allocations
    set metadata = metadata || jsonb_build_object('customer_credit_id', credit_id, 'overpayment_credit_amount', unallocated_transaction_amount)
    where id = allocation_id;

    insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, summary, metadata)
    values (
      match_row.workspace_id,
      auth.uid(),
      'customer_payment_credit.created',
      'customer_payment_credit',
      credit_id,
      case when split_line_count > 0 then 'Split payment remainder created as customer credit' else 'Overpayment credit created for invoice ' || invoice_row.invoice_number end,
      jsonb_build_object(
        'invoice_id', invoice_row.id,
        'invoice_number', invoice_row.invoice_number,
        'split_payment', split_line_count > 0,
        'split_lines', split_lines_json,
        'bank_transaction_id', transaction_row.id,
        'bank_reference', transaction_row.reference,
        'allocation_id', allocation_id,
        'amount', unallocated_transaction_amount,
        'currency', transaction_row.currency
      )
    );
  end if;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, summary, metadata)
  values (
    match_row.workspace_id,
    auth.uid(),
    'payment_match.approved',
    'payment_match_suggestion',
    match_row.id,
    case when split_line_count > 0 then 'Payment split approved across ' || accepted_split_line_count || ' invoices' else 'Payment match approved for invoice ' || invoice_row.invoice_number end,
    jsonb_build_object(
      'invoice_id', invoice_row.id,
      'invoice_number', invoice_row.invoice_number,
      'split_payment', split_line_count > 0,
      'split_lines', split_lines_json,
      'bank_transaction_id', transaction_row.id,
      'bank_reference', transaction_row.reference,
      'allocation_id', allocation_id,
      'amount', applied_amount,
      'transaction_amount', transaction_row.amount,
      'remaining_after', remaining_after_allocation,
      'unallocated_transaction_amount', unallocated_transaction_amount,
      'customer_credit_id', credit_id,
      'invoice_status', next_invoice_status,
      'currency', transaction_row.currency,
      'confidence', match_row.confidence
    )
  );

  return jsonb_build_object(
    'match_suggestion_id', match_row.id,
    'allocation_id', allocation_id,
    'invoice_id', invoice_row.id,
    'invoice_number', coalesce(invoice_row.invoice_number, array_to_string(split_invoice_numbers, ', ')),
    'split_payment', split_line_count > 0,
    'split_line_count', accepted_split_line_count,
    'split_lines', split_lines_json,
    'bank_transaction_id', transaction_row.id,
    'amount', applied_amount,
    'transaction_amount', transaction_row.amount,
    'remaining_after', remaining_after_allocation,
    'unallocated_transaction_amount', unallocated_transaction_amount,
    'customer_credit_id', credit_id,
    'invoice_status', next_invoice_status,
    'currency', transaction_row.currency,
    'method', 'database_rpc'
  );
end;
$$;

revoke execute on function public.approve_payment_match(uuid, text) from anon;
grant execute on function public.approve_payment_match(uuid, text) to authenticated;

create or replace function public.reverse_payment_allocation(
  target_allocation_id uuid,
  reversal_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  allocation_row public.payment_allocations%rowtype;
  transaction_row public.bank_transactions%rowtype;
  invoice_row public.invoices%rowtype;
  match_row public.payment_match_suggestions%rowtype;
  line_row public.payment_allocation_lines%rowtype;
  line_invoice_row public.invoices%rowtype;
  clean_note text;
  restored_invoice_status text;
  restored_bank_status text;
  restored_match_status text;
  remaining_invoice_allocated numeric := 0;
  voided_credit_id uuid;
  reversed_split_lines jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into allocation_row
  from public.payment_allocations
  where id = target_allocation_id
  for update;

  if not found then
    raise exception 'Payment allocation not found';
  end if;

  if not public.is_workspace_member(allocation_row.workspace_id) then
    raise exception 'Workspace access denied';
  end if;

  if allocation_row.status = 'reversed' then
    raise exception 'Payment allocation is already reversed';
  end if;

  clean_note := nullif(trim(coalesce(reversal_note, '')), '');

  select *
  into transaction_row
  from public.bank_transactions
  where id = allocation_row.bank_transaction_id
    and workspace_id = allocation_row.workspace_id
  for update;

  if not found then
    raise exception 'Bank transaction not found';
  end if;

  if allocation_row.invoice_id is not null then
    select *
    into invoice_row
    from public.invoices
    where id = allocation_row.invoice_id
      and workspace_id = allocation_row.workspace_id
    for update;

    if not found then
      raise exception 'Invoice not found';
    end if;
  end if;

  if allocation_row.payment_match_suggestion_id is not null then
    select *
    into match_row
    from public.payment_match_suggestions
    where id = allocation_row.payment_match_suggestion_id
      and workspace_id = allocation_row.workspace_id
    for update;

    if not found then
      raise exception 'Payment match suggestion not found';
    end if;
  end if;

  if invoice_row.id is not null then
    remaining_invoice_allocated := public.invoice_allocated_amount(allocation_row.workspace_id, invoice_row.id, allocation_row.id, null);
  end if;

  restored_invoice_status := allocation_row.metadata ->> 'previous_invoice_status';
  if invoice_row.id is not null and remaining_invoice_allocated >= invoice_row.amount and invoice_row.amount > 0 then
    restored_invoice_status := 'paid';
  elsif invoice_row.id is not null and remaining_invoice_allocated > 0 then
    restored_invoice_status := 'partial';
  elsif restored_invoice_status not in ('open', 'due', 'overdue') then
    if invoice_row.id is not null and invoice_row.due_date is not null and invoice_row.due_date < current_date then
      restored_invoice_status := 'overdue';
    elsif invoice_row.id is not null and invoice_row.due_date is not null and invoice_row.due_date <= current_date + 7 then
      restored_invoice_status := 'due';
    else
      restored_invoice_status := 'open';
    end if;
  end if;

  restored_bank_status := allocation_row.metadata ->> 'previous_bank_status';
  if restored_bank_status not in ('imported', 'matched', 'needs_review', 'ignored') or restored_bank_status = 'matched' then
    restored_bank_status := 'needs_review';
  end if;

  restored_match_status := allocation_row.metadata ->> 'previous_match_status';
  if restored_match_status not in ('suggested', 'accepted', 'rejected', 'needs_review') or restored_match_status = 'accepted' then
    restored_match_status := 'needs_review';
  end if;

  update public.payment_allocations
  set
    status = 'reversed',
    reversal_note = coalesce(clean_note, allocation_row.reversal_note, 'Allocation reversed for review'),
    reversed_by = auth.uid(),
    reversed_at = now(),
    metadata = metadata || jsonb_build_object('reversed_by', auth.uid(), 'reversed_at', now())
  where id = allocation_row.id;

  update public.bank_transactions
  set status = restored_bank_status
  where id = transaction_row.id;

  if invoice_row.id is not null then
    update public.invoices
    set status = restored_invoice_status
    where id = invoice_row.id;
  end if;

  if match_row.id is not null then
    update public.payment_match_suggestions
    set
      match_status = restored_match_status,
      review_note = coalesce(clean_note, review_note, 'Allocation reversed; review required'),
      reviewed_by = null,
      reviewed_at = null,
      metadata = metadata || jsonb_build_object('reversed_by', auth.uid(), 'reversed_at', now())
    where id = match_row.id;
  end if;

  for line_row in
    select *
    from public.payment_allocation_lines
    where workspace_id = allocation_row.workspace_id
      and payment_allocation_id = allocation_row.id
      and status = 'posted'
  loop
    select *
    into line_invoice_row
    from public.invoices
    where id = line_row.invoice_id
      and workspace_id = allocation_row.workspace_id
    for update;

    if found then
      remaining_invoice_allocated := public.invoice_allocated_amount(allocation_row.workspace_id, line_invoice_row.id, allocation_row.id, null);
      restored_invoice_status := line_row.previous_invoice_status;

      if remaining_invoice_allocated >= line_invoice_row.amount and line_invoice_row.amount > 0 then
        restored_invoice_status := 'paid';
      elsif remaining_invoice_allocated > 0 then
        restored_invoice_status := 'partial';
      elsif restored_invoice_status not in ('open', 'due', 'overdue') then
        if line_invoice_row.due_date is not null and line_invoice_row.due_date < current_date then
          restored_invoice_status := 'overdue';
        elsif line_invoice_row.due_date is not null and line_invoice_row.due_date <= current_date + 7 then
          restored_invoice_status := 'due';
        else
          restored_invoice_status := 'open';
        end if;
      end if;

      update public.invoices
      set status = restored_invoice_status
      where id = line_invoice_row.id;

      reversed_split_lines := reversed_split_lines || jsonb_build_array(jsonb_build_object(
        'invoice_id', line_invoice_row.id,
        'invoice_number', line_invoice_row.invoice_number,
        'amount', line_row.amount,
        'restored_invoice_status', restored_invoice_status,
        'remaining_invoice_allocated', remaining_invoice_allocated
      ));
    end if;

    update public.payment_allocation_lines
    set
      status = 'reversed',
      metadata = metadata || jsonb_build_object('reversed_by', auth.uid(), 'reversed_at', now())
    where id = line_row.id;
  end loop;

  update public.customer_payment_credits
  set
    status = 'void',
    metadata = metadata || jsonb_build_object('voided_by', auth.uid(), 'voided_at', now(), 'void_reason', 'source allocation reversed')
  where workspace_id = allocation_row.workspace_id
    and source_payment_allocation_id = allocation_row.id
    and status = 'open'
  returning id into voided_credit_id;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, summary, metadata)
  values (
    allocation_row.workspace_id,
    auth.uid(),
    'payment_allocation.reversed',
    'payment_allocation',
    allocation_row.id,
    'Payment allocation reversed for review',
    jsonb_build_object(
      'allocation_id', allocation_row.id,
      'invoice_id', allocation_row.invoice_id,
      'bank_transaction_id', allocation_row.bank_transaction_id,
      'payment_match_suggestion_id', allocation_row.payment_match_suggestion_id,
      'restored_invoice_status', restored_invoice_status,
      'restored_bank_status', restored_bank_status,
      'restored_match_status', restored_match_status,
      'remaining_invoice_allocated', remaining_invoice_allocated,
      'reversed_split_lines', reversed_split_lines,
      'voided_customer_credit_id', voided_credit_id,
      'amount', allocation_row.amount,
      'currency', allocation_row.currency
    )
  );

  return jsonb_build_object(
    'allocation_id', allocation_row.id,
    'invoice_id', allocation_row.invoice_id,
    'bank_transaction_id', allocation_row.bank_transaction_id,
    'payment_match_suggestion_id', allocation_row.payment_match_suggestion_id,
    'restored_invoice_status', restored_invoice_status,
    'restored_bank_status', restored_bank_status,
    'restored_match_status', restored_match_status,
    'reversed_split_lines', reversed_split_lines,
    'voided_customer_credit_id', voided_credit_id,
    'method', 'database_rpc'
  );
end;
$$;

revoke execute on function public.reverse_payment_allocation(uuid, text) from anon;
grant execute on function public.reverse_payment_allocation(uuid, text) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.customers enable row level security;
alter table public.deals enable row level security;
alter table public.invoices enable row level security;
alter table public.ai_followups enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.outbound_message_events enable row level security;
alter table public.workspace_email_settings enable row level security;
alter table public.workspace_whatsapp_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workspace_owner_profiles enable row level security;
alter table public.customer_collection_playbooks enable row level security;
alter table public.workspace_accounting_connections enable row level security;
alter table public.accounting_sync_runs enable row level security;
alter table public.provider_oauth_requests enable row level security;
alter table public.provider_oauth_callback_events enable row level security;
alter table public.provider_credential_vault enable row level security;
alter table public.provider_token_exchange_runs enable row level security;
alter table public.workspace_bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.payment_match_suggestions enable row level security;
alter table public.payment_match_split_lines enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_allocation_lines enable row level security;
alter table public.customer_payment_credits enable row level security;
alter table public.collection_actions enable row level security;
alter table public.owner_digest_runs enable row level security;
alter table public.owner_digest_schedules enable row level security;

drop policy if exists "workspace members can read workspaces" on public.workspaces;
create policy "workspace members can read workspaces"
on public.workspaces
for select
using (public.is_workspace_member(id) or owner_id = auth.uid());

drop policy if exists "authenticated users can create owned workspaces" on public.workspaces;
create policy "authenticated users can create owned workspaces"
on public.workspaces
for insert
with check (auth.uid() = owner_id);

drop policy if exists "workspace admins can update workspaces" on public.workspaces;
create policy "workspace admins can update workspaces"
on public.workspaces
for update
using (public.can_manage_workspace(id))
with check (public.can_manage_workspace(id));

drop policy if exists "members can read workspace membership" on public.workspace_members;
create policy "members can read workspace membership"
on public.workspace_members
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "owners can bootstrap membership" on public.workspace_members;
create policy "owners can bootstrap membership"
on public.workspace_members
for insert
with check (
  (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1
      from public.workspaces
      where id = workspace_id
        and owner_id = auth.uid()
    )
  )
  or public.can_manage_workspace(workspace_id)
);

drop policy if exists "admins can update membership" on public.workspace_members;
create policy "admins can update membership"
on public.workspace_members
for update
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

drop policy if exists "admins can delete membership" on public.workspace_members;
create policy "admins can delete membership"
on public.workspace_members
for delete
using (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read customers" on public.customers;
create policy "members can read customers"
on public.customers
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can write customers" on public.customers;
create policy "members can write customers"
on public.customers
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update customers" on public.customers;
create policy "members can update customers"
on public.customers
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can delete customers" on public.customers;
create policy "members can delete customers"
on public.customers
for delete
using (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read customer playbooks" on public.customer_collection_playbooks;
create policy "members can read customer playbooks"
on public.customer_collection_playbooks
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create customer playbooks" on public.customer_collection_playbooks;
create policy "members can create customer playbooks"
on public.customer_collection_playbooks
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update customer playbooks" on public.customer_collection_playbooks;
create policy "members can update customer playbooks"
on public.customer_collection_playbooks
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read accounting connections" on public.workspace_accounting_connections;
create policy "members can read accounting connections"
on public.workspace_accounting_connections
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create accounting connections" on public.workspace_accounting_connections;
create policy "members can create accounting connections"
on public.workspace_accounting_connections
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update accounting connections" on public.workspace_accounting_connections;
create policy "members can update accounting connections"
on public.workspace_accounting_connections
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read accounting sync runs" on public.accounting_sync_runs;
create policy "members can read accounting sync runs"
on public.accounting_sync_runs
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create accounting sync runs" on public.accounting_sync_runs;
create policy "members can create accounting sync runs"
on public.accounting_sync_runs
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can read provider oauth requests" on public.provider_oauth_requests;
create policy "members can read provider oauth requests"
on public.provider_oauth_requests
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create provider oauth requests" on public.provider_oauth_requests;
create policy "members can create provider oauth requests"
on public.provider_oauth_requests
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update provider oauth requests" on public.provider_oauth_requests;
create policy "members can update provider oauth requests"
on public.provider_oauth_requests
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read provider oauth callback events" on public.provider_oauth_callback_events;
create policy "members can read provider oauth callback events"
on public.provider_oauth_callback_events
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create provider oauth callback events" on public.provider_oauth_callback_events;
create policy "members can create provider oauth callback events"
on public.provider_oauth_callback_events
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update provider oauth callback events" on public.provider_oauth_callback_events;
create policy "members can update provider oauth callback events"
on public.provider_oauth_callback_events
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read provider credential vault metadata" on public.provider_credential_vault;
create policy "members can read provider credential vault metadata"
on public.provider_credential_vault
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create provider credential vault metadata" on public.provider_credential_vault;
create policy "members can create provider credential vault metadata"
on public.provider_credential_vault
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "admins can update provider credential vault metadata" on public.provider_credential_vault;
create policy "admins can update provider credential vault metadata"
on public.provider_credential_vault
for update
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read provider token exchange runs" on public.provider_token_exchange_runs;
create policy "members can read provider token exchange runs"
on public.provider_token_exchange_runs
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create provider token exchange runs" on public.provider_token_exchange_runs;
create policy "members can create provider token exchange runs"
on public.provider_token_exchange_runs
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "admins can update provider token exchange runs" on public.provider_token_exchange_runs;
create policy "admins can update provider token exchange runs"
on public.provider_token_exchange_runs
for update
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read bank accounts" on public.workspace_bank_accounts;
create policy "members can read bank accounts"
on public.workspace_bank_accounts
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create bank accounts" on public.workspace_bank_accounts;
create policy "members can create bank accounts"
on public.workspace_bank_accounts
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update bank accounts" on public.workspace_bank_accounts;
create policy "members can update bank accounts"
on public.workspace_bank_accounts
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read bank transactions" on public.bank_transactions;
create policy "members can read bank transactions"
on public.bank_transactions
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create bank transactions" on public.bank_transactions;
create policy "members can create bank transactions"
on public.bank_transactions
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update bank transactions" on public.bank_transactions;
create policy "members can update bank transactions"
on public.bank_transactions
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read payment match suggestions" on public.payment_match_suggestions;
create policy "members can read payment match suggestions"
on public.payment_match_suggestions
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create payment match suggestions" on public.payment_match_suggestions;
create policy "members can create payment match suggestions"
on public.payment_match_suggestions
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update payment match suggestions" on public.payment_match_suggestions;
create policy "members can update payment match suggestions"
on public.payment_match_suggestions
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read payment match split lines" on public.payment_match_split_lines;
create policy "members can read payment match split lines"
on public.payment_match_split_lines
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create payment match split lines" on public.payment_match_split_lines;
create policy "members can create payment match split lines"
on public.payment_match_split_lines
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update payment match split lines" on public.payment_match_split_lines;
create policy "members can update payment match split lines"
on public.payment_match_split_lines
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read payment allocations" on public.payment_allocations;
create policy "members can read payment allocations"
on public.payment_allocations
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create payment allocations" on public.payment_allocations;
create policy "members can create payment allocations"
on public.payment_allocations
for insert
with check (
  public.is_workspace_member(workspace_id)
  and approved_by = auth.uid()
);

drop policy if exists "members can update payment allocations" on public.payment_allocations;
create policy "members can update payment allocations"
on public.payment_allocations
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read payment allocation lines" on public.payment_allocation_lines;
create policy "members can read payment allocation lines"
on public.payment_allocation_lines
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create payment allocation lines" on public.payment_allocation_lines;
create policy "members can create payment allocation lines"
on public.payment_allocation_lines
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update payment allocation lines" on public.payment_allocation_lines;
create policy "members can update payment allocation lines"
on public.payment_allocation_lines
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read customer payment credits" on public.customer_payment_credits;
create policy "members can read customer payment credits"
on public.customer_payment_credits
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create customer payment credits" on public.customer_payment_credits;
create policy "members can create customer payment credits"
on public.customer_payment_credits
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update customer payment credits" on public.customer_payment_credits;
create policy "members can update customer payment credits"
on public.customer_payment_credits
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read deals" on public.deals;
create policy "members can read deals"
on public.deals
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can write deals" on public.deals;
create policy "members can write deals"
on public.deals
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update deals" on public.deals;
create policy "members can update deals"
on public.deals
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can delete deals" on public.deals;
create policy "members can delete deals"
on public.deals
for delete
using (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read invoices" on public.invoices;
create policy "members can read invoices"
on public.invoices
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can write invoices" on public.invoices;
create policy "members can write invoices"
on public.invoices
for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update invoices" on public.invoices;
create policy "members can update invoices"
on public.invoices
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can delete invoices" on public.invoices;
create policy "members can delete invoices"
on public.invoices
for delete
using (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read ai followups" on public.ai_followups;
create policy "members can read ai followups"
on public.ai_followups
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can write ai followups" on public.ai_followups;
create policy "members can write ai followups"
on public.ai_followups
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "members can read outbound messages" on public.outbound_messages;
create policy "members can read outbound messages"
on public.outbound_messages
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can queue outbound messages" on public.outbound_messages;
create policy "members can queue outbound messages"
on public.outbound_messages
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update outbound messages" on public.outbound_messages;
create policy "members can update outbound messages"
on public.outbound_messages
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read outbound message events" on public.outbound_message_events;
create policy "members can read outbound message events"
on public.outbound_message_events
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can write outbound message events" on public.outbound_message_events;

drop policy if exists "members can read workspace email settings" on public.workspace_email_settings;
create policy "members can read workspace email settings"
on public.workspace_email_settings
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "admins can write workspace email settings" on public.workspace_email_settings;
create policy "admins can write workspace email settings"
on public.workspace_email_settings
for insert
with check (
  public.can_manage_workspace(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "admins can update workspace email settings" on public.workspace_email_settings;
create policy "admins can update workspace email settings"
on public.workspace_email_settings
for update
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read workspace whatsapp settings" on public.workspace_whatsapp_settings;
create policy "members can read workspace whatsapp settings"
on public.workspace_whatsapp_settings
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "admins can write workspace whatsapp settings" on public.workspace_whatsapp_settings;
create policy "admins can write workspace whatsapp settings"
on public.workspace_whatsapp_settings
for insert
with check (
  public.can_manage_workspace(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "admins can update workspace whatsapp settings" on public.workspace_whatsapp_settings;
create policy "admins can update workspace whatsapp settings"
on public.workspace_whatsapp_settings
for update
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

drop policy if exists "members can read audit logs" on public.audit_logs;
create policy "members can read audit logs"
on public.audit_logs
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can write audit logs" on public.audit_logs;
create policy "members can write audit logs"
on public.audit_logs
for insert
with check (
  public.is_workspace_member(workspace_id)
  and actor_id = auth.uid()
);

drop policy if exists "members can read owner profiles" on public.workspace_owner_profiles;
create policy "members can read owner profiles"
on public.workspace_owner_profiles
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create owner profiles" on public.workspace_owner_profiles;
create policy "members can create owner profiles"
on public.workspace_owner_profiles
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update owner profiles" on public.workspace_owner_profiles;
create policy "members can update owner profiles"
on public.workspace_owner_profiles
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read collection actions" on public.collection_actions;
create policy "members can read collection actions"
on public.collection_actions
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create collection actions" on public.collection_actions;
create policy "members can create collection actions"
on public.collection_actions
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update collection actions" on public.collection_actions;
create policy "members can update collection actions"
on public.collection_actions
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read owner digests" on public.owner_digest_runs;
create policy "members can read owner digests"
on public.owner_digest_runs
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create owner digests" on public.owner_digest_runs;
create policy "members can create owner digests"
on public.owner_digest_runs
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update owner digests" on public.owner_digest_runs;
create policy "members can update owner digests"
on public.owner_digest_runs
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read owner digest schedules" on public.owner_digest_schedules;
create policy "members can read owner digest schedules"
on public.owner_digest_schedules
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create owner digest schedules" on public.owner_digest_schedules;
create policy "members can create owner digest schedules"
on public.owner_digest_schedules
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update owner digest schedules" on public.owner_digest_schedules;
create policy "members can update owner digest schedules"
on public.owner_digest_schedules
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
