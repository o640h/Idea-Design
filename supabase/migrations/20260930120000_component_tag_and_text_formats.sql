-- Component types become a single optional, free-form tag.
alter table public.components
rename column component_type to tag;

alter table public.components
drop constraint components_component_type_check;

-- Positions become layouts that also hold the title and description formats.
alter table public.component_positions
rename to component_layouts;

alter table public.component_layouts
add column title_font_size double precision not null default 13
  check (title_font_size > 0),
add column title_bold boolean not null default false,
add column title_italic boolean not null default false,
add column description_font_size double precision not null default 10
  check (description_font_size > 0),
add column description_bold boolean not null default false,
add column description_italic boolean not null default false;

alter policy "Owners manage component positions in their concepts"
on public.component_layouts
rename to "Owners manage component layouts in their concepts";
