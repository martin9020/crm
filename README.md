# Steelit CRM

Fresh Next.js CRM built from:

- `../monday_graphql_export.xlsx` as the source database export
- `../Projects_Summary_September.xlsx` as the spreadsheet-style design reference

Email sending is intentionally excluded until the final sending domain is chosen.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres/Auth
- Excel import via `exceljs`
- GitHub Pages static export

## Local Development

```bash
npm install
npm run generate:data
npm run dev
```

Open `http://localhost:3000`.

The dashboard does not ship real workbook data in the static bundle. Project data loads from Supabase after a user signs in.

## Supabase

The CRM is isolated inside the existing `steelit.site` Supabase project with `crm_*` tables. It does not use or overwrite generic tables like `projects` or `profiles`.

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Apply the migration:

```sql
supabase/migrations/202606140001_initial_crm.sql
```

Import the workbook after the schema exists:

```bash
npm run import:monday
```

The import upserts projects by Monday `Item ID`.

The original Excel row is preserved in `crm_projects.raw_data`, so unmapped workbook columns are not lost.

## GitHub Pages

The app is built as a static export into `out/`.

GitHub repository variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BASE_PATH
```

Use `NEXT_PUBLIC_BASE_PATH` only if the site is served under a repository path, for example `/steelit-crm`. Leave it empty for a custom domain or root GitHub Pages site.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run import:dry-run
npm run import:monday
```
