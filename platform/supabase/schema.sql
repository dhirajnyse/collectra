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
  tone text not null,
  message text not null,
  created_at timestamptz not null default now()
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

create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_customers_workspace_id on public.customers(workspace_id);
create index if not exists idx_deals_workspace_id on public.deals(workspace_id);
create index if not exists idx_deals_customer_id on public.deals(customer_id);
create index if not exists idx_invoices_workspace_id on public.invoices(workspace_id);
create index if not exists idx_invoices_customer_id on public.invoices(customer_id);
create index if not exists idx_invoices_due_date on public.invoices(due_date);
create index if not exists idx_ai_followups_workspace_id on public.ai_followups(workspace_id);
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

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.customers enable row level security;
alter table public.deals enable row level security;
alter table public.invoices enable row level security;
alter table public.ai_followups enable row level security;
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
with check (public.is_workspace_member(workspace_id));

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
