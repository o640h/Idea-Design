begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'viewer@example.test');

insert into public.workspaces (id, title) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Workspace');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'viewer');

insert into public.concepts (id, workspace_id, title) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Concept'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Other Concept');

insert into public.branches (id, concept_id, title, main) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Main', true),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Main', true);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.operations (branch_id, change_id, position, operation) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', gen_random_uuid(), 0,
   '{"type": "concept/update", "field": "description", "value": "First"}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', gen_random_uuid(), 0,
   '{"type": "concept/update", "field": "description", "value": "Second"}');

insert into public.revisions (id, branch_id, seq, kind, title) values
  ('99999999-9999-4999-8999-999999999999', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 50, 'checkpoint', 'Before Pricing'),
  ('88888888-8888-4888-8888-888888888888', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 0, 'branch', null);

select results_eq(
  $$select seq from public.revisions
    where id = '99999999-9999-4999-8999-999999999999'$$,
  array[2::bigint],
  'A revision is placed at the branch head, ignoring the client''s value'
);

select lives_ok(
  $$insert into public.branches (id, concept_id, title, source_revision_id)
    values (
      '77777777-7777-4777-8777-777777777777',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Alternative',
      '99999999-9999-4999-8999-999999999999'
    )$$,
  'Editors can branch from a revision'
);

select throws_ok(
  $$insert into public.branches (concept_id, title)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Sourceless')$$,
  '23514', null,
  'A branch other than Main needs a source revision'
);

select throws_ok(
  $$insert into public.branches (concept_id, title, source_revision_id)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Crossed',
      '88888888-8888-4888-8888-888888888888'
    )$$,
  '42501', null,
  'A branch cannot start from another concept''s revision'
);

select throws_ok(
  $$insert into public.revisions (branch_id, kind)
    values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'checkpoint')$$,
  '23514', null,
  'A checkpoint needs a name'
);

update public.branches
set title = 'Team Product', archived_at = now()
where id = '77777777-7777-4777-8777-777777777777';

select results_eq(
  $$select title, archived_at is not null from public.branches
    where id = '77777777-7777-4777-8777-777777777777'$$,
  $$values ('Team Product', true)$$,
  'Editors can rename and archive a branch'
);

select throws_ok(
  $$update public.branches set archived_at = now()
    where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'$$,
  '23514', null,
  'Main cannot be archived'
);

select throws_ok(
  $$update public.branches set head = 0
    where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'$$,
  '42501', null,
  'Branch heads move only with the log'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select throws_ok(
  $$insert into public.revisions (branch_id, kind, title)
    values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'checkpoint', 'Viewer')$$,
  '42501', null,
  'Viewers cannot save checkpoints'
);

reset role;

update public.concepts set deleted_at = now()
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
delete from public.concepts where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is_empty(
  $$select from public.revisions
    where id = '99999999-9999-4999-8999-999999999999'$$,
  'Deleting a concept removes its branches and their revisions'
);

select * from finish();
rollback;
