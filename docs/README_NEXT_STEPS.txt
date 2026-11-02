SOLAR APPS MASTER ARCHITECTURE PACKAGE

Contents:
- MASTER_ARCHITECTURE.md: source audit + target architecture + integration contracts + acceptance criteria.
- 001_project_core_additive_draft.sql: additive draft migration. NOT YET APPLIED.

IMPORTANT:
1. Do not run the SQL against production until the current Supabase schema and policies have been exported/reviewed.
2. The migration intentionally preserves projects.project_type and backfills installation_type.
3. Existing projects get system_type = NULL; select On-Grid/Off-Grid/Hybrid explicitly rather than guessing.
4. Existing project_pv_layouts is not recreated or modified by this migration.
5. Security ZIP experiment is excluded from implementation; current Auth/RLS setup remains the baseline to audit separately.
6. Do not delete localStorage drafts until cloud load/save and migration have been verified.
