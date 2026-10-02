-- A revision names a point in a branch's log: where another branch diverged,
-- or a checkpoint someone saved.
create type public.revision_kind as enum ('branch', 'checkpoint');

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  -- The branch head when the revision was saved, assigned by the server so it
  -- includes every operation the author sent before it.
  seq bigint not null default 0,
  kind public.revision_kind not null,
  title text check (kind <> 'checkpoint' or title is not null),
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index revisions_branch_id_idx on public.revisions (branch_id);

alter table public.revisions enable row level security;

-- A branch other than Main starts as its parent branch at the source revision
-- and records only its own operations after that. Branches are archived
-- rather than deleted, so their history and descendants stay readable.
alter table public.branches
add column source_revision_id uuid references public.revisions (id),
add column archived_at timestamptz,
add constraint branches_source_check check (main = (source_revision_id is null)),
add constraint branches_main_not_archived_check check (
  not (main and archived_at is not null)
);

create index branches_source_revision_id_idx
on public.branches (source_revision_id);

create function private.assign_revision_seq()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select head into new.seq from public.branches where id = new.branch_id;
  return new;
end;
$$;

create trigger assign_revision_seq
before insert on public.revisions
for each row execute function private.assign_revision_seq();

create function private.revision_concept(target uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select branches.concept_id
  from public.revisions
  join public.branches on branches.id = revisions.branch_id
  where revisions.id = target
$$;

drop policy "Editors add branches" on public.branches;

create policy "Editors add branches"
on public.branches
for insert
to authenticated
with check (
  head = 0
  and private.concept_role(concept_id) in ('owner', 'editor')
  and (
    source_revision_id is null
    or private.revision_concept(source_revision_id) = concept_id
  )
);

create policy "Editors rename and archive branches"
on public.branches
for update
to authenticated
using (private.concept_role(concept_id) in ('owner', 'editor'))
with check (private.concept_role(concept_id) in ('owner', 'editor'));

revoke update on public.branches from authenticated;
grant update (title, archived_at) on public.branches to authenticated;

create policy "Members read revisions"
on public.revisions
for select
to authenticated
using (private.branch_role(branch_id) is not null);

create policy "Editors add their own revisions"
on public.revisions
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.branch_role(branch_id) in ('owner', 'editor')
);
