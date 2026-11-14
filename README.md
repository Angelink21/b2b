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
| `pnpm catalog:build` | CSV → JSON (полный конвейер — этап 2) |
| `pnpm verify` | lint + typecheck + test + build |

## Документы

- `docs/PLAN.md` — архитектура
- `docs/DESIGN.md` — дизайн-система
- `docs/DATA_CONTRACT.md` — каталог
- `docs/ACCEPTANCE.md` — приёмка
- `docs/PROMPTS.md` — этапы работ
- `.env.example` — переменные окружения

## Этап 1

Каркас: токены, шрифты, темы light/dark/system, i18n uk/en, оболочка, CI. Контент страниц — заглушки.
