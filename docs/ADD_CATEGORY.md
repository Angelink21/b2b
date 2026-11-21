# Adding a catalog category

1. Add one entry to `src/config/categories.ts` (`CATEGORY_DEFS`):
   - `csvName` — exact `Тип обладнання` cell from the Google Sheet / CSV
   - `slug` — URL segment (`/catalog/{slug}`)
   - `menuOrder` — sort key (higher = later in nav)
   - `facets` — explorer filters (`kg`, `heating`, `power`, …)
   - `columns` — table columns
   - `dimensionFilter` — allow Ш×Г×В max filters only when every model has dims
   - `silhouette` — `porthole` (washers) or `generic`
2. Add i18n keys in `messages/uk.json` and `messages/en.json`:
   - `categories.{slug}`
   - `categoryIntros.{slug}` (short neutral intro; en may be `needs-review`)
3. Do **not** invent models. Fill the Sheet, wait for the published CSV, then `pnpm catalog:build` / deploy.
4. `pnpm verify`. Record unexpected decisions in `docs/DECISIONS.md`.

Slugs are derived from model names via `slugify` (Ukrainian → Latin). Existing Latin names keep the same slug.
