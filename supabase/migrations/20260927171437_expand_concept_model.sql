alter table public.projects
add column document_version integer not null default 1
check (document_version >= 1);

create table public.components (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  title text not null,
  description text not null default '',
  component_type text check (
    component_type in (
      'goal',
      'mechanism',
      'actor',
      'constraint',
      'assumption',
      'unknown',
      'evidence'
    )
  ),
  parent_id uuid,
  created_at timestamptz not null default now(),
  unique (concept_id, id),
  foreign key (concept_id, parent_id)
    references public.components(concept_id, id)
    on delete set null (parent_id)
);

create index components_concept_id_idx on public.components (concept_id);
create index components_parent_id_idx on public.components (parent_id);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  source_component_id uuid not null,
  target_component_id uuid not null,
  relationship_type text,
  created_at timestamptz not null default now(),
  foreign key (concept_id, source_component_id)
    references public.components(concept_id, id)
    on delete cascade,
  foreign key (concept_id, target_component_id)
    references public.components(concept_id, id)
    on delete cascade
);

create index relationships_concept_id_idx on public.relationships (concept_id);
create index relationships_source_component_id_idx
on public.relationships (source_component_id);
create index relationships_target_component_id_idx
on public.relationships (target_component_id);

create table public.component_positions (
  concept_id uuid not null,
  component_id uuid not null,
  x double precision not null,
  y double precision not null,
  primary key (concept_id, component_id),
  foreign key (concept_id, component_id)
    references public.components(concept_id, id)
    on delete cascade
);

create table public.concept_viewports (
  concept_id uuid primary key references public.concepts(id) on delete cascade,
  x double precision not null default 0,
  y double precision not null default 0,
  zoom double precision not null default 1 check (zoom > 0)
);

alter table public.components enable row level security;
alter table public.relationships enable row level security;
alter table public.component_positions enable row level security;
alter table public.concept_viewports enable row level security;

create policy "Owners manage components in their concepts"
on public.components
for all
to authenticated
using (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = components.concept_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = components.concept_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Owners manage relationships in their concepts"
on public.relationships
for all
to authenticated
using (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = relationships.concept_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = relationships.concept_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Owners manage component positions in their concepts"
on public.component_positions
for all
to authenticated
using (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = component_positions.concept_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = component_positions.concept_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Owners manage concept viewports"
on public.concept_viewports
for all
to authenticated
using (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = concept_viewports.concept_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.concepts
    join public.projects on projects.id = concepts.project_id
    where concepts.id = concept_viewports.concept_id
      and projects.owner_id = (select auth.uid())
  )
);
