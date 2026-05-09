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
  status text not null check (status in ('open', 'due', 'overdue', 'paid')),
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
  approved_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists idx_outbound_messages_invoice_id on public.outbound_messages(invoice_id);
create index if not exists idx_workspace_email_settings_workspace_id on public.workspace_email_settings(workspace_id);
create index if not exists idx_audit_logs_workspace_created_at on public.audit_logs(workspace_id, created_at desc);

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
    (target_workspace_id, alnoor_id, 'INV-1061', 118000, '2026-05-29', 'open');
  get diagnostics inserted_invoices = row_count;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, summary, metadata)
  values (
    target_workspace_id,
    auth.uid(),
    'workspace.seeded',
    'workspace',
    target_workspace_id,
    'Demo customers, deals, and invoices seeded',
    jsonb_build_object(
      'customers', inserted_customers,
      'deals', inserted_deals,
      'invoices', inserted_invoices,
      'method', 'database_rpc'
    )
  );

  return jsonb_build_object(
    'customers', inserted_customers,
    'deals', inserted_deals,
    'invoices', inserted_invoices,
    'method', 'database_rpc'
  );
end;
$$;

revoke execute on function public.seed_demo_workspace(uuid) from anon;
grant execute on function public.seed_demo_workspace(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.customers enable row level security;
alter table public.deals enable row level security;
alter table public.invoices enable row level security;
alter table public.ai_followups enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.workspace_email_settings enable row level security;
alter table public.audit_logs enable row level security;

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
