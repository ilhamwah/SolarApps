# Solar Apps — Master Architecture & Integration Blueprint

**Product:** Solar Apps — Integrated PV Engineering Studio  
**Target:** EPC commercial & industrial projects first  
**System configurations:** On-Grid, Off-Grid, Hybrid  
**Installation configurations:** Rooftop, Ground-mounted  
**Engineering standards:** Configurable per project  
**Baseline inspected:** `gas.zip` (frontend source snapshot)

## 1. Architecture principles

1. **One project, one source of truth.** Every engineering record belongs to a `project_id`; workspace membership governs access.
2. **Separate electrical topology from installation method.** `system_type` is On-Grid/Off-Grid/Hybrid; `installation_type` is Rooftop/Ground-mounted. Never overload one field for both.
3. **Domain-owned data.** Layout geometry, electrical schedules, structural calculations, drawings, BOQ and reports have explicit owners and schemas. Do not put every domain into one untyped JSON blob.
4. **Reproducible calculations.** Store input snapshot, calculation-engine version, selected standard/edition, assumptions, output, warnings and timestamp for each issued calculation.
5. **Explicit dependencies.** Changes to upstream inputs mark dependent outputs `stale`; do not silently present old calculations as current.
6. **Cloud-first with resilient drafts.** Supabase is authoritative. Local drafts are temporary/offline recovery, scoped by user + project + module and reconciled explicitly.
7. **Security by default.** RLS on every project-scoped table; never expose service-role keys in the browser.
8. **No destructive migration.** Preserve existing tables and local drafts; migrate incrementally with backups and verification.

## 2. Current source audit (observed in gas.zip)

### Stack
- React 18 + TypeScript + Vite 6
- Supabase JS v2 (Auth + Postgres client)
- Three.js for 3D rendering
- Netlify deployment target / PWA assets

### Existing app modules found
Dashboard/Projects, PV Layout 2D, PV Layout 3D, String Calculator, Inverter Configuration, Cable Sizing, Breaker Sizing, Tray Sizing, Protection & Grounding, Structural Design, Mounting Design, CAD & Drawings, BOQ, Survey Report, Engineering Report.

### Confirmed persistence observations
- `App.tsx` reads workspaces and projects from Supabase and inserts/deletes projects.
- Current project model still represents `type` as `Ground-mounted | Rooftop`; project creation writes that value to `projects.project_type`. This is currently installation type, despite UI copy saying “System type”.
- `PVLayout.tsx` persists layout data to `localStorage` scoped by user and project. It does not call Supabase in this snapshot.
- `PVLayout3D.tsx` reads the same scoped localStorage key; it is not loading layout from Supabase.
- `BOQ.tsx` reads PV layout data from localStorage. This is a local integration, not cloud integration.
- `SurveyReport.tsx` maintains form/photo state in component state; no Supabase persistence call was found.
- The inspected modules generally do not call Supabase directly. The app-level workspace/project flow is the primary Supabase integration in this snapshot.
- `supabase.ts` correctly uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; do not put service-role keys in frontend environment variables.

These are source-code observations, not a live production security test or engineering calculation validation.

## 3. Target logical architecture

```text
Workspace / Membership / Roles
            |
       Project Core
  (system + installation + capacity + site + standards)
            |
   Engineering Integration Layer
  |        |         |         |
 PV       Electrical Structural  Site/Survey
  |        |         |         |
  +------ Dependency Graph ------+
            |
 CAD / Drawing Register / BOQ / Reports
            |
 Supabase Postgres + Storage + RLS + Audit + Revisions
```

## 4. Project core contract

A project must carry at minimum:
- `workspace_id`, `created_by`, `name`, `status`
- `system_type`: `On-Grid | Off-Grid | Hybrid`
- `installation_type`: `Rooftop | Ground-mounted`
- `capacity_kwp` (design target, not automatically treated as calculated DC capacity)
- `project_settings`: location, client/site details, currency, design conditions and optional battery/grid settings
- selected engineering standards and editions

Compatibility: retain legacy `project_type` during migration. Backfill it into `installation_type`; only remove/rename legacy fields in a later, separately reviewed migration after every consumer has moved.

## 5. Domain modules and contracts

| Domain | Owns | Publishes to |
|---|---|---|
| Survey/Site | coordinates, roof/soil/site observations, photos, constraints | Layout, structural, reports |
| PV Layout 2D | boundary, module instances, obstacles, spacing, orientation, zones | 3D, strings, structural, BOQ, CAD |
| PV Layout 3D | visualization derived from 2D + terrain/roof surface | visualization/export only; not independent geometry truth |
| Electrical | module/inverter catalog snapshots, string topology, DC/AC schedules, cables, trays, breakers, protection, grounding | CAD, BOQ, reports |
| Structural | mounting family, geometry, material members, loads, checks, assumptions | CAD, BOQ, reports |
| CAD | drawing metadata, generated file, revision, source-data revision | delivery package |
| BOQ | normalized take-off lines, catalog item, quantity formula/source, unit, price snapshot | cost summary, procurement export |
| Reports | report type, source revision IDs, calculation snapshots, generated file | delivery package |
| Project controls | revisions, review/approval, audit events, dependency status | all modules |

### Important data rules
- A PV module instance has stable UUID identity; do not use array index as identity.
- Store physical dimensions in mm or m consistently and store units explicitly at API boundaries.
- Store electrical values with explicit units and DC/AC designation.
- Price records need currency, source, captured date and validity; do not treat a market price as timeless.
- Drawings/reports must reference the exact source revision used to generate them.
- 3D is a derived view of 2D geometry plus surface model; it must not create a second competing panel layout.

## 6. Standards configuration

Standards are selected per project and versioned by publisher, document code, edition/year, scope and source. The standards registry should distinguish:
- mandatory project requirements;
- selected design standards;
- informative guidance;
- internal company design criteria.

Each calculation result records selected standard IDs/editions and the actual clause/parameter mapping implemented by the calculation engine. A dropdown selection alone does not constitute standards compliance. Clause-level implementation and independent engineering review are required before claiming compliance.

## 7. Security model

- Workspace roles: `owner`, `engineer`, `viewer` (existing design).
- Read access: workspace members.
- Write access: owner/engineer.
- Destructive project/domain deletion: owner, with explicit confirmation and audit event.
- Every project-scoped table joins through `projects.workspace_id` in its RLS policy.
- `created_by`/`updated_by` must be tied to `auth.uid()` on writes.
- Audit log should be append-only to ordinary users; trusted database functions/triggers should write events where feasible.
- Supabase Storage buckets need matching path-level policies, not just database RLS.

## 8. Delivery sequence (architecture designed together, implementation gated)

### Gate A — Project core and schema
1. Add `system_type` and `installation_type` while retaining legacy `project_type`.
2. Backfill existing projects.
3. Add standards registry and project-standard selections.
4. Add revision/audit foundations.
5. Verify RLS using two separate test users in different workspaces.

### Gate B — PV cloud persistence
1. Define typed layout JSON contract and schema version.
2. Load by `project_id` from `project_pv_layouts`.
3. Autosave with debounce, conflict handling and visible save state.
4. Keep local recovery draft; do not treat localStorage as cloud success.
5. Verify 2D → 3D → BOQ use the same cloud revision.

### Gate C — Electrical and structural data
Implement typed domain tables and calculation snapshots. Validate input/output contracts and stale dependency propagation.

### Gate D — CAD, BOQ, reports
Generate from pinned domain revisions; retain file metadata and revision history in Postgres, binary files in Storage.

### Gate E — Collaboration and production
Review/approval, audit, backups, performance, accessibility, security testing, deployment.

## 9. Acceptance criteria

- Switching projects never leaks or mixes module data.
- A user in workspace A cannot read/write workspace B project data.
- Cloud save indicator only reports synced after Supabase confirms the write.
- Refresh/login/new device loads the same cloud revision.
- 2D and 3D render the same panel set and dimensions.
- BOQ line items can trace quantity back to source module and revision.
- Calculation outputs expose input snapshot, units, standard edition, assumptions, engine version and warnings.
- Changing an upstream input marks affected downstream outputs stale.
- Existing projects and local drafts remain recoverable through migration.

## 10. Explicit non-goals for the first migration

- Do not claim IEC/PUIL/SNI compliance solely from selecting a standard.
- Do not auto-approve engineering calculations.
- Do not delete `localStorage` drafts until cloud migration is verified.
- Do not replace the existing source tree with the experimental `Seccurity_System.zip`.
- Do not deploy untested migrations directly to production.
