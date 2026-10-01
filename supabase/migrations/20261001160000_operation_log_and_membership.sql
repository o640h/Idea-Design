-- A concept is now what replaying its branch's operation log gives, starting
-- from the latest snapshot, so the content tables are no longer needed.
drop table
  public.component_layouts,
  public.concept_viewports,
  public.relationships,
  public.components;

-- Access is granted through membership rather than a single owner.
create type public.workspace_role as enum ('owner', 'editor', 'commenter', 'viewer');

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

alter table public.workspace_members enable row level security;

insert into public.workspace_members (workspace_id, user_id, role)
select id, owner_id, 'owner' from public.workspaces;

drop policy "Owners manage their workspaces" on public.workspaces;
drop policy "Owners manage concepts in their workspaces" on public.concepts;

alter table public.workspaces drop column owner_id;

-- The title is a copy of Main's latest title for listing concepts; the log
-- holds the description. Concepts in Trash have a deletion time.
alter table public.concepts
drop column description,
alter column title set default '',
add column deleted_at timestamptz;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts (id) on delete cascade,
  title text not null,
  main boolean not null default false,
  -- The sequence number of the branch's latest operation.
  head bigint not null default 0,
  created_at timestamptz not null default now()
);

create index branches_concept_id_idx on public.branches (concept_id);
create unique index branches_one_main_per_concept_idx
on public.branches (concept_id) where main;

alter table public.branches enable row level security;

create table public.operations (
  branch_id uuid not null references public.branches (id) on delete cascade,
  seq bigint not null,
  -- Groups the operations of one change; also makes a retried upload fail
  -- as a duplicate instead of applying twice.
  change_id uuid not null,
  position smallint not null check (position >= 0),
  operation jsonb not null check (jsonb_typeof(operation) = 'object'),
  -- Layout operations change how a concept looks, not what it says, so
  -- comparisons and merges ignore them. Matches lib/concepts/operations.ts.
  layout boolean generated always as (
    operation ->> 'type' in ('component/move', 'component/format')
  ) stored,
  -- Null only once the author's account is deleted.
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (branch_id, seq),
  unique (change_id, position)
);

alter table public.operations enable row level security;

create table public.snapshots (
  branch_id uuid not null references public.branches (id) on delete cascade,
  -- The last operation the document includes.
  seq bigint not null check (seq > 0),
  document jsonb not null,
  created_at timestamptz not null default now(),
  primary key (branch_id, seq)
);

alter table public.snapshots enable row level security;

-- Helpers for policies. They are security definer so a policy can read
-- memberships without recursing through the policies of the tables it reads,
-- and live outside the API's exposed schemas.
create schema private;
grant usage on schema private to authenticated;

create function private.workspace_role(target uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.workspace_members
  where workspace_id = target and user_id = (select auth.uid())
$$;

create function private.concept_role(target uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select private.workspace_role(workspace_id)
  from public.concepts
  where id = target
$$;

create function private.branch_role(target uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select private.concept_role(concept_id)
  from public.branches
  where id = target
$$;

create function private.assign_operation_seq()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Holds the branch row until commit, so writers to one branch commit in
  -- sequence order and reading everything after a known seq never skips one.
  update public.branches
  set head = head + 1
  where id = new.branch_id
  returning head into new.seq;

  return new;
end;
$$;

create trigger assign_operation_seq
before insert on public.operations
for each row execute function private.assign_operation_seq();

create function private.copy_concept_title()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.concepts
  set title = new.operation ->> 'value'
  where id = (
    select concept_id from public.branches where id = new.branch_id and main
  );

  return null;
end;
$$;

create trigger copy_concept_title
after insert on public.operations
for each row
when (
  new.operation ->> 'type' = 'concept/update'
  and new.operation ->> 'field' = 'title'
)
execute function private.copy_concept_title();

create policy "Members read their workspaces"
on public.workspaces
for select
to authenticated
using (private.workspace_role(id) is not null);

create policy "Members read concepts"
on public.concepts
for select
to authenticated
using (private.workspace_role(workspace_id) is not null);

create policy "Editors add concepts"
on public.concepts
for insert
to authenticated
with check (private.workspace_role(workspace_id) in ('owner', 'editor'));

create policy "Editors move concepts to and from Trash"
on public.concepts
for update
to authenticated
using (private.workspace_role(workspace_id) in ('owner', 'editor'))
with check (private.workspace_role(workspace_id) in ('owner', 'editor'));

-- Only Trash is updated directly; the title follows the log.
revoke update on public.concepts from authenticated;
grant update (deleted_at) on public.concepts to authenticated;

create policy "Editors permanently delete concepts in Trash"
on public.concepts
for delete
to authenticated
using (
  deleted_at is not null
  and private.workspace_role(workspace_id) in ('owner', 'editor')
);

create policy "Members read branches"
on public.branches
for select
to authenticated
using (private.concept_role(concept_id) is not null);

create policy "Editors add branches"
on public.branches
for insert
to authenticated
with check (
  head = 0
  and private.concept_role(concept_id) in ('owner', 'editor')
);

create policy "Members read operations"
on public.operations
for select
to authenticated
using (private.branch_role(branch_id) is not null);

-- Without update or delete policies the log is append-only.
create policy "Editors append their own operations"
on public.operations
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.branch_role(branch_id) in ('owner', 'editor')
);

create policy "Members read snapshots"
on public.snapshots
for select
to authenticated
using (private.branch_role(branch_id) is not null);

create policy "Editors add snapshots"
on public.snapshots
for insert
to authenticated
with check (private.branch_role(branch_id) in ('owner', 'editor'));
