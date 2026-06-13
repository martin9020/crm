# Setup

## Supabase

The CRM can live inside the existing `steelit.site` Supabase project without touching existing website tables. The migration creates only `crm_*` database objects.

1. Link to the Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Apply `supabase/migrations/202606140001_initial_crm.sql`.
5. Import the Monday workbook:

```bash
npm run import:monday
```

The import script reads `../monday_graphql_export.xlsx` and upserts projects into `crm_projects` by `Item ID`.

Every mapped field is inserted into a typed column and the whole original row is kept in `raw_data`.

## Local Generated Data

For local-only debugging, you can generate `src/data/projects-local.generated.json`. Do not publish that file in the static site.

```bash
npm run generate:data
```

## GitHub Pages

The repository includes `.github/workflows/deploy-github-pages.yml`.

Set these GitHub repository variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BASE_PATH
```

Leave `NEXT_PUBLIC_BASE_PATH` empty for a custom domain/root deployment. Set it to `/repo-name` for a project page URL.
