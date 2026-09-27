create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects (owner_id);

alter table public.projects enable row level security;

create policy "Owners manage their projects"
on public.projects
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index concepts_project_id_idx on public.concepts (project_id);

alter table public.concepts enable row level security;

create policy "Owners manage concepts in their projects"
on public.concepts
for all
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = concepts.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = concepts.project_id
      and projects.owner_id = (select auth.uid())
  )
);