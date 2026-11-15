# Fagor Industrial — сайт (промышленное прачечное оборудование)

Главная цель сайта: заявка на коммерческое предложение (КП). Вторая: быстро найти и сравнить модели.
Языки: украинский (основной) и английский. Аудитория: закупщики отелей, больниц, прачечных, HoReCa; решают рационально.
Визуальный язык: «Лінійка» — весь ассортимент на одной линии пола в одном масштабе, под шкалой загрузки (кг).

## Источники правды (по приоритету)

1. `docs/DESIGN.md` — токены, компоненты, принципы, движение.
2. `docs/DATA_CONTRACT.md` — как читать `data/products_clean.csv` (303 модели) и какие в нём ловушки.
3. `docs/ACCEPTANCE.md` — критерии готовности. `docs/PROMPTS.md` — этапы работ. `docs/PLAN.md` — архитектура (создаётся на этапе 0).

## Стек (актуально на ноябрь 2026; точные версии подтверждает этап 0)

Next.js 16.4+ (App Router, Cache Components, Turbopack, `proxy.ts`), React 19.3, TypeScript strict,
Tailwind CSS v4 (токены через `@theme`), next-intl 4, Zod, nuqs, Motion (`motion/react`),
Vitest, Playwright + axe, pnpm, Node 22/24 LTS.

## Команды

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm e2e` ·
`pnpm catalog:build` (CSV → JSON) · `pnpm verify` (lint + typecheck + test + build).

## Структура

- `src/app/[locale]/…` — маршруты (home, catalog, catalog/[category], catalog/[category]/[slug], compare, quote, privacy)
- `src/components/ui` — примитивы · `src/components/sections` — секции страниц · `src/components/motion` — всё про анимацию
- `src/lib/catalog` — схема, парсинг, запросы · `src/lib/leads` — отправка заявок · `src/lib/images.ts` — источник фото
- `src/styles/tokens.css` — единственное место для цветов и размеров · `messages/{uk,en}.json` — все тексты
- `scripts/` — `build-catalog.ts` и прочие · `data/` — исходный CSV (не править руками сгенерированное)

## Жёсткие запреты

Новые цвета · красный не на кнопках-действиях · тени, градиенты, glow · анимация вне токенов движения ·
`middleware.ts` (используем `proxy.ts`) · `next lint` · `any` · hex/rgb вне токенов · тексты не через i18n ·
выдуманные данные (клиенты, сертификаты, цены, адреса, цифры, юридические тексты) · новые зависимости без записи в `docs/DECISIONS.md`.



## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
