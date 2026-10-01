-- Every account gets a Personal workspace, where its concepts go by default.
alter table public.workspaces
add column personal boolean not null default false;

create function private.create_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_id uuid;
begin
  insert into public.workspaces (title, personal)
  values ('Personal', true)
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger create_personal_workspace
after insert on auth.users
for each row execute function private.create_personal_workspace();
