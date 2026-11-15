# Stage 10 (points 1–2 + step 0) — quality report

Date: 2026-11-15

## Step 0 — Lighthouse mobile (production, 3 runs, median)

Server: `pnpm build` + `pnpm start` on `127.0.0.1:3035`. Chrome system, simulated mobile.

### Before (baseline)

| Path | Perf | LCP | CLS | Notes |
|---|---:|---:|---:|---|
| `/uk` | 100 | 1.2 s | 0.009 | OK |
| `/uk/catalog` | **85** | 1.2 s | **0.281** | Perf fail — footer shift |
| `/uk/catalog/washers` | **89** | 1.2 s | **0.222** | Perf fail — footer shift |
| `/uk/catalog/washers/haier-hcw12cbd` | 98 | 1.2 s | 0.091 | OK (Perf/LCP) |

LCP breakdown (catalog): not the bottleneck. CLS audit: single shift on `footer.site-footer` when Suspense swapped a 6-row skeleton (~336 px) for the ~3600 px explorer.

### Fix (attempt 1/3)

- `CatalogSkeleton`: 60 rows + toolbar placeholder matching `CATALOG_PAGE_SIZE`
- `mt-6` moved outside `<Suspense>` so fallback and explorer share the same offset
- Lineup load scene untouched

### After

| Path | Perf | LCP | CLS |
|---|---:|---:|---:|
| `/uk` | 100 | 1.2 s | 0.008 |
| `/uk/catalog` | 99 | 1.2 s | 0 |
| `/uk/catalog/washers` | 100 | 1.2 s | 0 |
| `/uk/catalog/washers/haier-hcw12cbd` | 98 | 1.2 s | 0.091 |

## Point 1 — Accessibility

- `e2e/a11y-matrix.spec.ts` — axe on 10 page types × uk/en × light/dark (chromium)
- `e2e/a11y-keyboard-viewport.spec.ts` — keyboard path + 320 px + 200% zoom; log in `keyboard-viewport.md`
- `main#main` gets `tabIndex={-1}` so skip-link focus works

## Point 2 — Speed / budgets / bundle

- `pnpm lhci` → `scripts/lighthouse-ci.mjs` (no `@lhci/cli`); budgets Perf≥90, A11y≥95, BP≥95, SEO≥95, LCP≤2.5 s, CLS≤0.1
- Median LHCI (with `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3035` at build): all green — see `lhci/summary.json`
- Bundle: `pnpm next analyze --output` → `.next/diagnostics/analyze`; `pnpm bundle:report`

### Bundle trim

| | Before | After |
|---|---:|---:|
| Largest client chunk | 451 KB raw / **135 KB gz** (`createHmac` / Node streams via leads barrel) | gone |
| New largest | — | react-dom 71 KB gz |
| Total JS gz (all chunks) | — | ~351 KB |

Root cause: client forms imported `@/lib/leads`, which re-exported webhook HMAC. Forms now use `@/lib/leads/client`.

## SEO note for local LH

Without `NEXT_PUBLIC_SITE_URL` matching the listen origin, Lighthouse SEO fails (`canonical` points at `localhost:3000`). Production must set the real HTTPS origin at build time (see RUNBOOK).
