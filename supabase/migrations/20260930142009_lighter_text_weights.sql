alter table public.component_layouts
drop constraint component_layouts_title_font_weight_check,
drop constraint component_layouts_description_font_weight_check;

update public.component_layouts
set title_font_weight = case title_font_weight when 400 then 300 when 500 then 400 when 700 then 500 end,
    description_font_weight = case description_font_weight when 400 then 300 when 500 then 400 when 700 then 500 end;

alter table public.component_layouts
alter column title_font_weight set default 300,
alter column description_font_weight set default 300,
add constraint component_layouts_title_font_weight_check check (title_font_weight in (300, 400, 500)),
add constraint component_layouts_description_font_weight_check check (description_font_weight in (300, 400, 500));
