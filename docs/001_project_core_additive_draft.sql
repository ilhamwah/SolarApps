-- SOLAR APPS — additive project-core migration (DRAFT)
-- IMPORTANT: review in Supabase staging first. This is intentionally additive.
-- It does NOT remove/rename projects.project_type or existing project tables.

BEGIN;

-- 1) Separate electrical topology from installation method.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS system_type text,
  ADD COLUMN IF NOT EXISTS installation_type text;

-- Backfill legacy project_type into installation_type.
UPDATE public.projects
SET installation_type = CASE
  WHEN lower(coalesce(project_type, '')) = 'rooftop' THEN 'Rooftop'
  WHEN lower(coalesce(project_type, '')) IN ('ground-mounted', 'ground mounted') THEN 'Ground-mounted'
  ELSE 'Ground-mounted'
END
WHERE installation_type IS NULL;

-- Existing projects are not assumed to have a known electrical topology.
-- Keep system_type NULL until the user/engineer explicitly selects it.

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_system_type_check
    CHECK (system_type IS NULL OR system_type IN ('On-Grid', 'Off-Grid', 'Hybrid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_installation_type_check
    CHECK (installation_type IS NULL OR installation_type IN ('Rooftop', 'Ground-mounted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS projects_system_type_idx
  ON public.projects(system_type);
CREATE INDEX IF NOT EXISTS projects_installation_type_idx
  ON public.projects(installation_type);

-- 2) Standards registry. Registry entries should be curated by administrators.
CREATE TABLE IF NOT EXISTS public.engineering_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher text NOT NULL,
  document_code text NOT NULL,
  title text NOT NULL,
  edition text,
  publication_year integer,
  discipline text NOT NULL,
  scope text,
  source_url text,
  status text NOT NULL DEFAULT 'reference'
    CHECK (status IN ('reference', 'active', 'deprecated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publisher, document_code, edition)
);

ALTER TABLE public.engineering_standards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineering_standards FROM anon;
GRANT SELECT ON public.engineering_standards TO authenticated;

DO $$ BEGIN
  CREATE POLICY engineering_standards_authenticated_read
    ON public.engineering_standards
    FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Standards selected for a project. Keep edition/reference pinned per project.
CREATE TABLE IF NOT EXISTS public.project_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  standard_id uuid NOT NULL REFERENCES public.engineering_standards(id),
  requirement_type text NOT NULL DEFAULT 'design'
    CHECK (requirement_type IN ('mandatory', 'design', 'informative', 'internal')),
  project_notes text,
  selected_by uuid REFERENCES auth.users(id),
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, standard_id, requirement_type)
);

ALTER TABLE public.project_standards ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_standards TO authenticated;

DO $$ BEGIN
  CREATE POLICY project_standards_member_read
    ON public.project_standards FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.is_workspace_member(p.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_standards_engineer_insert
    ON public.project_standards FOR INSERT TO authenticated
    WITH CHECK (
      selected_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND public.is_workspace_role(p.workspace_id, ARRAY['owner','engineer']::text[])
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_standards_engineer_update
    ON public.project_standards FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.is_workspace_role(p.workspace_id, ARRAY['owner','engineer']::text[])
    ))
    WITH CHECK (
      selected_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND public.is_workspace_role(p.workspace_id, ARRAY['owner','engineer']::text[])
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_standards_owner_delete
    ON public.project_standards FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.is_workspace_role(p.workspace_id, ARRAY['owner']::text[])
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS project_standards_project_idx
  ON public.project_standards(project_id);

-- 4) Project revision metadata. Snapshots are immutable records; domain payloads
-- will be pinned to revision IDs by each module integration in later migrations.
CREATE TABLE IF NOT EXISTS public.project_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revision_code text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'superseded', 'rejected')),
  change_summary text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision_code)
);

ALTER TABLE public.project_revisions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.project_revisions TO authenticated;

DO $$ BEGIN
  CREATE POLICY project_revisions_member_read
    ON public.project_revisions FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.is_workspace_member(p.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_revisions_engineer_insert
    ON public.project_revisions FOR INSERT TO authenticated
    WITH CHECK (
      created_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND public.is_workspace_role(p.workspace_id, ARRAY['owner','engineer']::text[])
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_revisions_engineer_update
    ON public.project_revisions FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.is_workspace_role(p.workspace_id, ARRAY['owner','engineer']::text[])
    ))
    WITH CHECK (created_by = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS project_revisions_project_created_idx
  ON public.project_revisions(project_id, created_at DESC);

-- 5) Append-oriented audit event table. Ordinary authenticated users may insert
-- events for themselves and read events in their workspace; no UPDATE/DELETE grant.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

DO $$ BEGIN
  CREATE POLICY audit_logs_member_read
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY audit_logs_self_insert
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (
      actor_id = (SELECT auth.uid())
      AND public.is_workspace_member(workspace_id)
      AND (project_id IS NULL OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.workspace_id = workspace_id
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx
  ON public.audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_project_created_idx
  ON public.audit_logs(project_id, created_at DESC);

COMMIT;

-- POST-MIGRATION CHECKS (run separately after applying):
-- SELECT id, name, project_type, installation_type, system_type FROM public.projects;
-- SELECT tablename FROM pg_tables WHERE schemaname='public'
--   AND tablename IN ('engineering_standards','project_standards','project_revisions','audit_logs');
