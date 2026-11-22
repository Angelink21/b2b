# Content slots waiting on client data

Fill these in `src/config/site.ts` (or dedicated content files) before publishing company claims. Empty values stay hidden on the site.

## Launch blockers

| Item | Status | Notes |
|------|--------|-------|
| Privacy / legal policy | **interim shipped** | Factual notice on `/privacy` (forms, contacts, processors, rights). Lawyer polish still recommended, not a hard launch stop. |
| `NEXT_PUBLIC_SITE_URL` | **blocker for prod** | Set to `https://fagorlaundry.com.ua` when DNS switches (still another site today). Local `.env` stays `localhost`. |

## Contacts (`src/config/site.ts`) — filled 2026-11-15

| Field | Status | Notes |
|-------|--------|-------|
| `phones` | set | `044-501-88-87`, `050-382-48-78` |
| `email` | set | `pkmprofessional@ukr.net` |
| `address` | set | вул. Київська, 27-В, Вишневе, Київська область |
| `hours` | set | uk/en localized strings |
| `logo` / `logoDark` | set | `/brand/fagor-logo.png` (+ dark wordmark); SVG master still welcome |

## Home

| Slot | Status | Notes |
|------|--------|-------|
| Cases | set | Sector scenarios (hotel / healthcare / self-service / central) — not named clients; revise with real stories when available |
| Featured slugs | set | Confirm list with owner if lineup/flagship should change |

## Category intros

| Category slug | Status |
|---------------|--------|
| all 8 | set | Draft copy in `messages/{uk,en}.json` → `categoryIntros`; owner may revise |

## About page

| Slot | Status | Notes |
|------|--------|-------|
| Lead + history (since 1994, FAGOR PROFESSIONAL) | set | Owner wording + draft expansion |
| Expertise / infra / standards | set | Infra mentions Vyshneve warehouse |
| Team | empty | People / roles |
| Certificates | empty | Only real certificates with source docs |

## Service page

| Slot | Status | Notes |
|------|--------|-------|
| Phone / email / hours / address | set | From `siteConfig` |
| Warranty terms | empty | Do not invent coverage or duration |
| Spare parts lead times | empty | Channels, lead times |
| SLA / response times | empty | No invented SLA |

## Catalog data (owner / sheet)

| Item | Status | Notes |
|------|--------|-------|
| DATA_CONTRACT Q1–Q5 | open | See `docs/DATA_CONTRACT.md` |
| Short / full description gaps | open | See `docs/CATALOG_REPORT.md` |
| EN model/series copy | uk-only in UI | EN shows uk text + note, or hide |
| Finishing without heating | needs-review | DES-F, DES-F-GC, MINI-DES |

## Photos / brand assets

| Item | Status | Notes |
|------|--------|-------|
| Logo PNG (header) | set | Prefer SVG master later; OG still uses text brand |
| Favicon / app icons | empty | Optional from same mark |
| Hero lineup photos | constrained | See `docs/IMAGES_REPORT.md` |
