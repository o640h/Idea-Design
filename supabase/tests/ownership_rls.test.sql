begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.test');

insert into public.projects (id, owner_id, title) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Owner project'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Other project');

insert into public.concepts (id, project_id, title) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner concept'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Other concept');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from public.projects',
  array[1::bigint],
  'Owner sees only their project'
);

select results_eq(
  'select count(*) from public.concepts',
  array[1::bigint],
  'Owner sees only concepts in their project'
);

select lives_ok(
  $$insert into public.concepts (project_id, title)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'New concept')$$,
  'Owner can add a concept to their project'
);

select throws_ok(
  $$insert into public.concepts (project_id, title)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Forbidden concept')$$,
  '42501'
);

set local role anon;

select results_eq(
  'select count(*) from public.projects',
  array[0::bigint],
  'Anonymous users see no projects'
);

select results_eq(
  'select count(*) from public.concepts',
  array[0::bigint],
  'Anonymous users see no concepts'
);

select * from finish();
rollback;
