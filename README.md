# Fagor Industrial — сайт

Каталог промышленного прачечного оборудования и заявка на коммерческое предложение (КП).
Языки: украинский (основной) и английский. Стек и этапы — в `AGENTS.md` и `docs/`.

## Требования

- Node.js 22 или 24 LTS (см. `.nvmrc`)
- pnpm 12 (`corepack enable`)

## Запуск

```bash
pnpm install
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000) — редирект на `/uk`.

## Команды

| Команда | Назначение |
|---|---|
| `pnpm dev` | разработка |
| `pnpm build` / `pnpm start` | продакшен-сборка |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Vitest |
| `pnpm e2e` | Playwright (+ axe) |
| `pnpm catalog:build` | CSV → JSON (`src/data/*`, `docs/CATALOG_REPORT.md`) |
| `pnpm verify` | lint + typecheck + test + build |

После смены `data/products_clean.csv` обязательно: `pnpm catalog:build`.

## Документы

- `docs/PLAN.md` — архитектура
- `docs/DESIGN.md` — дизайн-система
- `docs/DATA_CONTRACT.md` — каталог
- `docs/CATALOG_REPORT.md` — отчёт последней сборки каталога
- `docs/ACCEPTANCE.md` — приёмка
- `docs/PROMPTS.md` — этапы работ
- `.env.example` — переменные окружения

## Styleguide

`/[locale]/_styleguide` — внутренний UI-кит. В production нужен `ENABLE_STYLEGUIDE=1` (см. `.env.example`).

## Статус

Этап 3: UI-кит + styleguide. Контент главной/каталога — этапы 4–5.
