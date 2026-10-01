alter table public.projects rename to workspaces;

alter table public.workspaces
rename constraint projects_pkey to workspaces_pkey;

alter table public.workspaces
rename constraint projects_owner_id_fkey to workspaces_owner_id_fkey;

alter table public.workspaces
rename constraint projects_document_version_check
to workspaces_document_version_check;

alter index public.projects_owner_id_idx rename to workspaces_owner_id_idx;

alter policy "Owners manage their projects"
on public.workspaces
rename to "Owners manage their workspaces";

alter table public.concepts rename column project_id to workspace_id;

alter table public.concepts
rename constraint concepts_project_id_fkey to concepts_workspace_id_fkey;

alter index public.concepts_project_id_idx rename to concepts_workspace_id_idx;

alter policy "Owners manage concepts in their projects"
on public.concepts
rename to "Owners manage concepts in their workspaces";
