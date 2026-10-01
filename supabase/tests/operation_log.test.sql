begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.workspaces (id, title) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Workspace');

insert into public.concepts (id, workspace_id, title) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Original');

insert into public.branches (id, concept_id, title, main) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Main', true),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Alternative', false);

insert into public.operations (branch_id, seq, change_id, position, operation) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 100, '99999999-9999-4999-8999-999999999999', 0,
   '{"type": "component/move", "id": "a", "position": {"x": 1, "y": 2}}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 100, '99999999-9999-4999-8999-999999999999', 1,
   '{"type": "component/update", "id": "a", "field": "title", "value": "Goal"}'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 100, gen_random_uuid(), 0,
   '{"type": "concept/update", "field": "title", "value": "Alternative Title"}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 100, gen_random_uuid(), 0,
   '{"type": "concept/update", "field": "title", "value": "Main Title"}');

select results_eq(
  $$select branch_id, seq from public.operations
    where branch_id in (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      'ffffffff-ffff-4fff-8fff-ffffffffffff'
    )
    order by branch_id, seq$$,
  $$values
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 1::bigint),
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 2::bigint),
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 3::bigint),
      ('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid, 1::bigint)$$,
  'The server numbers each branch''s operations in order, ignoring client values'
);

select results_eq(
  $$select head from public.branches
    where concept_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    order by id$$,
  $$values (3::bigint), (1::bigint)$$,
  'Each branch head points at its latest operation'
);

select results_eq(
  $$select operation ->> 'type', layout from public.operations
    where branch_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' order by seq$$,
  $$values
      ('component/move', true),
      ('component/update', false),
      ('concept/update', false)$$,
  'Position and formatting operations are marked as layout'
);

select results_eq(
  $$select title from public.concepts
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  array['Main Title'],
  'The concept title follows Main''s title operations, not other branches'''
);

select throws_ok(
  $$insert into public.operations (branch_id, change_id, position, operation)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '99999999-9999-4999-8999-999999999999', 0, '{}'
    )$$,
  '23505', null,
  'Uploading the same change twice is rejected as a duplicate'
);

select throws_ok(
  $$insert into public.branches (concept_id, title, main)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Second Main', true)$$,
  '23505', null,
  'A concept has one Main branch'
);

select * from finish();
rollback;
