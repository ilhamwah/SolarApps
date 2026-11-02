-- Run once in Supabase SQL Editor before deploying the frontend.
-- Adds the project metadata fields used by Solar Apps project dashboard.

alter table public.projects
  add column if not exists project_type text not null default 'Ground-mounted',
  add column if not exists capacity_kwp numeric(14,3) not null default 0,
  add column if not exists status text not null default 'Planning';

alter table public.projects
  drop constraint if exists projects_project_type_check,
  drop constraint if exists projects_capacity_kwp_check,
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_project_type_check
    check (project_type in ('Ground-mounted', 'Rooftop')),
  add constraint projects_capacity_kwp_check
    check (capacity_kwp >= 0),
  add constraint projects_status_check
    check (status in ('Planning', 'In Progress', 'Completed'));

-- Existing project RLS policies remain in force.
