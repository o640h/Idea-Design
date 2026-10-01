begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.test');

insert into public.workspaces (id, owner_id, title) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Owner workspace'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Other workspace');

insert into public.concepts (id, workspace_id, title) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner concept'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Other concept');

insert into public.components (id, concept_id, title, tag) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Owner goal', 'goal'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Owner mechanism', 'mechanism'),
  ('33333333-3333-4333-8333-333333333333', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Other goal', 'goal'),
  ('44444444-4444-4444-8444-444444444444', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Other mechanism', 'mechanism');

insert into public.relationships (
  id,
  concept_id,
  source_component_id,
  target_component_id,
  relationship_type
) values
  (
    '55555555-5555-4555-8555-555555555555',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'depends on'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    null
  );

insert into public.component_layouts (concept_id, component_id, x, y) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 120, 80),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '33333333-3333-4333-8333-333333333333', 40, 60);

insert into public.concept_viewports (concept_id, x, y, zoom) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 10, 20, 1.25),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 0, 0, 1);

select results_eq(
  'select title_font_weight, description_font_weight, title_opacity, description_opacity
   from public.component_layouts where component_id = ''eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee''',
  $$values (300, 300, 1::double precision, 0.85::double precision)$$,
  'Text format defaults match the editor'
);

select lives_ok(
  $$update public.component_layouts set title_font_weight = 400, title_opacity = 0.5
    where component_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'$$,
  'Layouts accept Medium weight and partial opacity'
);

select throws_ok(
  $$update public.component_layouts set title_font_weight = 600$$,
  '23514', null,
  'Layouts reject unsupported weights'
);

select throws_ok(
  $$update public.component_layouts set description_opacity = 1.1$$,
  '23514', null,
  'Layouts reject opacity outside zero to one'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from public.workspaces',
  array[1::bigint],
  'Owner sees only their workspace'
);

select results_eq(
  'select count(*) from public.concepts',
  array[1::bigint],
  'Owner sees only concepts in their workspace'
);

select results_eq(
  'select count(*) from public.components',
  array[2::bigint],
  'Owner sees only components in their concepts'
);

select results_eq(
  'select count(*) from public.relationships',
  array[1::bigint],
  'Owner sees only relationships in their concepts'
);

select results_eq(
  'select count(*) from public.component_layouts',
  array[1::bigint],
  'Owner sees only layouts in their concepts'
);

select results_eq(
  'select count(*) from public.concept_viewports',
  array[1::bigint],
  'Owner sees only viewports for their concepts'
);

select lives_ok(
  $$insert into public.concepts (workspace_id, title)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'New concept')$$,
  'Owner can add a concept to their workspace'
);

select throws_ok(
  $$insert into public.concepts (workspace_id, title)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Forbidden concept')$$,
  '42501'
);

select lives_ok(
  $$insert into public.components (id, concept_id, title)
    values (
      '77777777-7777-4777-8777-777777777777',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'Untagged component'
    )$$,
  'Owner can add an untagged component to their concept'
);

select throws_ok(
  $$insert into public.components (concept_id, title)
    values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Forbidden component')$$,
  '42501'
);

select throws_ok(
  $$insert into public.components (concept_id, title, parent_id)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'Invalid child',
      '33333333-3333-4333-8333-333333333333'
    )$$,
  '23503'
);

select throws_ok(
  $$insert into public.relationships (
      concept_id,
      source_component_id,
      target_component_id
    ) values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '33333333-3333-4333-8333-333333333333'
    )$$,
  '23503'
);

set local role anon;

select results_eq(
  'select count(*) from public.workspaces',
  array[0::bigint],
  'Anonymous users see no workspaces'
);

select results_eq(
  'select count(*) from public.concepts',
  array[0::bigint],
  'Anonymous users see no concepts'
);

select results_eq(
  'select count(*) from public.components',
  array[0::bigint],
  'Anonymous users see no components'
);

select results_eq(
  'select count(*) from public.relationships',
  array[0::bigint],
  'Anonymous users see no relationships'
);

select results_eq(
  'select count(*) from public.component_layouts',
  array[0::bigint],
  'Anonymous users see no component layouts'
);

select results_eq(
  'select count(*) from public.concept_viewports',
  array[0::bigint],
  'Anonymous users see no concept viewports'
);

select * from finish();
rollback;
