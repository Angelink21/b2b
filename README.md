# Fagor Industrial — сайт

Каталог промислового прального обладнання та заявка на комерційну пропозицію (КП).
Мови: українська (основна) та англійська.

## Вимоги

- Node.js 22 або 24 LTS (див. `.nvmrc`)
- pnpm 12 (`corepack enable`)

## Швидкий старт

```bash
pnpm install
cp .env.example .env.local   # заповніть CATALOG_CSV_URL / Cloudinary за потреби
pnpm catalog:build           # якщо немає актуального src/data/*
pnpm dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) — редірект на `/uk`.

## Команди

| Команда | Призначення |
|---|---|
| `pnpm dev` | розробка |
| `pnpm build` / `pnpm start` | продакшен-збірка |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | якість |
| `pnpm e2e` | Playwright (+ axe) |
| `pnpm catalog:build` | CSV/Sheet → JSON + звіти |
| `pnpm images:sync` | Cloudinary probe → `images.generated.json` |
| `pnpm verify` | lint + typecheck + test + build |

## Деплой

Див. **[docs/RUNBOOK.md](docs/RUNBOOK.md)** — Vercel, env, каталог з Google Таблиці, заявки, відкат, SEO.

Коротко: Import репозиторію на Vercel → env з `.env.example` → Deploy. Preview на кожен PR.

## Документи

| Файл | Зміст |
|---|---|
| [AGENTS.md](AGENTS.md) | стек і правила для агентів |
| [docs/PLAN.md](docs/PLAN.md) | архітектура |
| [docs/DESIGN.md](docs/DESIGN.md) | дизайн-система |
| [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md) | каталог CSV |
| [docs/ADD_CATEGORY.md](docs/ADD_CATEGORY.md) | нова категорія |
| [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) | приймання |
| [docs/CONTENT_TODO.md](docs/CONTENT_TODO.md) | контент / launch blockers |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | експлуатація |
| [docs/PROMPTS.md](docs/PROMPTS.md) | етапи робіт |
| `.env.example` | змінні середовища |

## Styleguide

`/[locale]/_styleguide` — внутрішній UI-kit. У production потрібен `ENABLE_STYLEGUIDE=1`.

## Статус

Каталог + КП + runtime Sheet (етапи 1–10, 12A/B). Категорія `mobile-laundry`. Етап 11: деплой/передача (див. RUNBOOK). Перед бойовим доменом: privacy-юрист і DNS (`docs/CONTENT_TODO.md`).
