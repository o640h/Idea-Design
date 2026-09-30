alter table public.component_layouts
add column title_font_weight integer not null default 400
  check (title_font_weight in (400, 500, 700)),
add column description_font_weight integer not null default 400
  check (description_font_weight in (400, 500, 700)),
add column title_opacity double precision not null default 1
  check (title_opacity between 0 and 1),
add column description_opacity double precision not null default 0.85
  check (description_opacity between 0 and 1);

update public.component_layouts
set title_font_weight = case when title_bold then 700 else 400 end,
    description_font_weight = case when description_bold then 700 else 400 end;

alter table public.component_layouts
drop column title_bold,
drop column description_bold;
