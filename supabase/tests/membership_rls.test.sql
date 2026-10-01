begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'viewer@example.test');

insert into public.workspaces (id, title) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner workspace'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Other workspace');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'viewer'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner');

insert into public.concepts (id, workspace_id, title) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner concept'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Other concept');

insert into public.branches (id, concept_id, title, main) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Main', true),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Main', true);

insert into public.operations (branch_id, change_id, position, operation) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', gen_random_uuid(), 0,
   '{"type": "concept/update", "field": "description", "value": "Mine"}'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', gen_random_uuid(), 0,
   '{"type": "concept/update", "field": "description", "value": "Theirs"}');

insert into public.snapshots (branch_id, seq, document) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1, '{}'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 1, '{}');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select
      (select count(*) from public.workspaces where not personal),
      (select count(*) from public.concepts),
      (select count(*) from public.branches),
      (select count(*) from public.operations),
      (select count(*) from public.snapshots)$$,
  $$values (1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint)$$,
  'Members see only their workspace and its concepts, branches, operations and snapshots'
);

select results_eq(
  $$select title, personal from public.workspaces where personal$$,
  $$values ('Personal', true)$$,
  'New accounts get a Personal workspace of their own'
);

select is_empty(
  'select * from public.workspace_members',
  'Memberships are not readable through the API yet'
);

select lives_ok(
  $$insert into public.concepts (workspace_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'Owners can add a concept to their workspace'
);

select throws_ok(
  $$insert into public.concepts (workspace_id)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'Members cannot add a concept to another workspace'
);

select throws_ok(
  $$update public.concepts set title = 'Renamed'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  '42501', null,
  'Concept titles change only through the log'
);

select lives_ok(
  $$insert into public.operations (branch_id, change_id, position, operation)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', gen_random_uuid(), 0,
      '{"type": "concept/update", "field": "title", "value": "Renamed"}'
    )$$,
  'Owners can append operations to their branches'
);

select results_eq(
  $$select author_id from public.operations
    where operation ->> 'value' = 'Renamed'$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid)$$,
  'Operations record their author'
);

select throws_ok(
  $$insert into public.operations (branch_id, change_id, position, operation, author_id)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', gen_random_uuid(), 0, '{}',
      '22222222-2222-4222-8222-222222222222'
    )$$,
  '42501', null,
  'Operations cannot be recorded under another author'
);

select throws_ok(
  $$insert into public.operations (branch_id, change_id, position, operation)
    values ('ffffffff-ffff-4fff-8fff-ffffffffffff', gen_random_uuid(), 0, '{}')$$,
  '42501', null,
  'Members cannot append operations to another workspace''s branches'
);

update public.operations set operation = '{}';
delete from public.operations;

select results_eq(
  $$select count(*) from public.operations where operation <> '{}'$$,
  array[2::bigint],
  'The log is append-only'
);

select throws_ok(
  $$insert into public.branches (concept_id, title, head)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Alternative', 5)$$,
  '42501', null,
  'New branches start with an empty log'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select results_eq(
  'select count(*) from public.workspaces where not personal',
  array[1::bigint],
  'Viewers see the workspace they belong to'
);

select throws_ok(
  $$insert into public.concepts (workspace_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '42501', null,
  'Viewers cannot add concepts'
);

select throws_ok(
  $$insert into public.operations (branch_id, change_id, position, operation)
    values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', gen_random_uuid(), 0, '{}')$$,
  '42501', null,
  'Viewers cannot append operations'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

delete from public.concepts where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select isnt_empty(
  $$select * from public.concepts where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'Concepts outside Trash cannot be deleted'
);

update public.concepts set deleted_at = now()
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select isnt_empty(
  $$select * from public.concepts
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and deleted_at is not null$$,
  'Trashed concepts stay readable so they can be restored'
);

delete from public.concepts where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is_empty(
  $$select * from public.concepts where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'Concepts in Trash can be deleted permanently'
);

set local role anon;

select is_empty('select * from public.workspaces', 'Anonymous users see no workspaces');
select is_empty('select * from public.concepts', 'Anonymous users see no concepts');
select is_empty('select * from public.branches', 'Anonymous users see no branches');
select is_empty('select * from public.operations', 'Anonymous users see no operations');
select is_empty('select * from public.snapshots', 'Anonymous users see no snapshots');

select * from finish();
rollback;
