# Solar Apps — Supabase integration (Phase 1)

## What this patch connects
- Supabase email/password sign-up and sign-in.
- Loads the signed-in user's first Personal workspace.
- Calls `public.create_workspace('My Solar Workspace', 'personal')` when no Personal workspace exists.
- Loads, creates, and deletes project records in `public.projects`.
- Scopes existing PV Layout local drafts by Supabase user ID to prevent different accounts in the same browser from reading the same layout draft.

## Important limitations
- PV Layout 2D/3D geometry and other engineering-module working data are still browser-local; they are not yet synchronized to Supabase or selected per project.
- BOQ calculations/material edits are not yet stored in Supabase.
- Company workspace creation and invitations are not exposed in the UI.
- This is an integration foundation, not a completed security certification. Test with separate accounts before using company data.

## 1. Database migration
Run `SUPABASE_MIGRATION_PROJECT_FIELDS.sql` in the Supabase SQL Editor. It adds `project_type`, `capacity_kwp`, and `status` columns used by the project dashboard. It does not drop project data.

The previously created tables, RLS policies, and `create_workspace` function must already exist.

## 2. Install dependency
In the frontend folder run:

```bash
npm install
```

This updates `package-lock.json` for the new `@supabase/supabase-js` dependency. If npm reports a dependency error, stop and share the full error.

## 3. Configure local environment
Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL`: Project URL from Supabase Project Settings → API.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable key from Supabase Project Settings → API Keys.

Never put the `service_role` key or a secret key in a Vite `VITE_` variable or frontend code.

## 4. Supabase Auth URL settings
In Supabase Authentication → URL Configuration:
- Set Site URL to your Netlify site URL.
- Add your Netlify URL to the Redirect URLs list.
- For local testing, also add `http://localhost:5173/**`.

If email confirmation is enabled, users must confirm their email before they can sign in.

## 5. Run and deploy
```bash
npm run build
```
Set the same two environment variables in Netlify → Site configuration → Environment variables, then trigger a fresh deploy.

## 6. First test
- Register/sign in with a test account.
- Confirm a Personal workspace is created.
- Create a test project and verify it appears after refresh.
- Register a second test account and verify it cannot see the first account's workspace or projects.
- Do not use real company project data until these checks pass and module data has been moved to user/project-scoped cloud storage.
