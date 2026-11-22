# Fagor Professional — архитектурный план (этап 0)

Дата разведки: 2026-11-14. Код на этом этапе не писался. Источники: `AGENTS.md`, `.cursor/rules`, `docs/DESIGN.md`, `docs/DATA_CONTRACT.md`, `docs/ACCEPTANCE.md`, выборочно `docs/prototype.html`, статистика `data/products_clean.csv`, документация Next.js / next-intl / Tailwind v4 / Motion.

---

## Подтверждённые версии

Проверено по npm registry и официальным docs (2026-11-14).

| Пакет | Версия | Примечание |
|---|---|---|
| Next.js | **16.4.6** | Active LTS; Cache Components (`cacheComponents: true`), `proxy.ts` вместо `middleware.ts` |
| React / react-dom | **19.3.1** | В `package.json` фиксируем 19.3.1; App Router может подтянуть свой canary RSC-рантайм |
| next-intl | **4.15.1** | Locale routing через `proxy.ts`; статика через `next/root-params` |
| Tailwind CSS | **4.3.x** | Latest 4.3.5; `create-next-app` может закрепить 4.3.3 — допустимо в рамках 4.3 |
| Motion | **14.14.0** | Импорт из `motion/react` |
| Zod | **4.6.7** | Zod 4 API; при установке — строка в `docs/DECISIONS.md` |
| nuqs | **2.10.3** | Состояние фильтров в URL; клиентские хуки внутри `<Suspense>` |
| Vitest | **5.1.0** | Unit / jsdom |
| Playwright | **1.65.1** | Chromium, WebKit, mobile viewport + `@axe-core/playwright` |
| Node.js | **24 LTS** | `.nvmrc` → `24`; `engines`: `^22 \|\| ^24` (см. Q10) |
| Пакетный менеджер | **pnpm** | Через Corepack |

TypeScript: `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (этап 1).

---

## (a) Архитектура и дерево каталогов

```
fagor-site/
├── data/
│   └── products_clean.csv          # источник правды каталога (не править сгенерированное)
├── docs/
│   ├── DESIGN.md, DATA_CONTRACT.md, ACCEPTANCE.md, PROMPTS.md
│   ├── PLAN.md                     # этот файл
│   ├── DECISIONS.md, prototype.html
│   └── CATALOG_REPORT.md           # появляется на этапе 2
├── messages/
│   ├── uk.json
│   └── en.json
├── content/
│   └── cases/                      # пусто → секция кейсов скрыта
├── scripts/
│   └── build-catalog.ts            # CSV → JSON
├── src/
│   ├── app/
│   │   └── [locale]/               # root layout здесь (для next/root-params)
│   │       ├── layout.tsx
│   │       ├── page.tsx            # home
│   │       ├── catalog/
│   │       │   ├── page.tsx
│   │       │   └── [category]/
│   │       │       ├── page.tsx
│   │       │       └── [slug]/
│   │       │           ├── page.tsx
│   │       │           └── datasheet/page.tsx
│   │       ├── compare/page.tsx
│   │       ├── quote/page.tsx
│   │       ├── privacy/page.tsx
│   │       ├── _styleguide/page.tsx
│   │       ├── not-found.tsx
│   │       └── error.tsx
│   ├── components/
│   │   ├── ui/                     # примитивы
│   │   ├── sections/               # секции страниц
│   │   ├── motion/                 # анимации
│   │   └── quote/                  # форма КП
│   ├── config/                     # featured.ts, columns.ts, motion.ts
│   ├── data/                       # catalog.generated.json, catalog.index.json
│   ├── i18n/
│   │   ├── routing.ts
│   │   ├── request.ts
│   │   └── navigation.ts
│   ├── lib/
│   │   ├── catalog/                # schema, parse, query, index, lineup
│   │   ├── leads/                  # LeadSink + адаптеры
│   │   └── images.ts               # getModelImage
│   ├── styles/
│   │   ├── tokens.css              # единственное место цветов/размеров
│   │   └── tokens.ts               # дубль для OG
│   ├── env.ts                      # Zod-схема env
│   └── proxy.ts                    # НЕ middleware.ts
├── e2e/
├── tests/                          # или рядом с модулями (*.test.ts)
├── AGENTS.md
├── package.json
└── next.config.ts
```

**Принципы**

- Server Components по умолчанию.
- Клиентские острова маленькие: линейка (ruler), фильтры каталога, compare-tray, форма КП, motion-обёртки.
- Каталог целиком в клиент не отправляется: фильтры работают по `catalog.index.json`.
- Нет `middleware.ts`, нет `next lint` (ESLint напрямую), нет `any`, нет hex/rgb вне токенов, нет выдуманных данных.

---

## (b) Карта маршрутов uk/en и Cache Components

Локали: `uk` (default), `en`. Префиксы обязательны: `/uk/...`, `/en/...`. Корень `/` перенаправляется в `proxy.ts`.

| Маршрут | Локали | Рендер | Примечание |
|---|---|---|---|
| `/[locale]` | uk, en | **статичный** | Главная + линейка; LCP = SVG силуэтов с сервера |
| `/[locale]/catalog` | uk, en | **статичный** + клиентский остров фильтров | `searchParams` только внутри `<Suspense>` + nuqs |
| `/[locale]/catalog/[category]` | 8 × 2 | **статичный** | `generateStaticParams` |
| `/[locale]/catalog/[category]/[slug]` | 303 × 2 | **статичный** | `generateStaticParams`; `notFound()` на неизвестный slug |
| `/[locale]/catalog/.../datasheet` | 303 × 2 | **статичный** | Print CSS; вне sitemap |
| `/[locale]/compare` | uk, en | **статичный** + остров | Состояние `?m=` через nuqs |
| `/[locale]/quote` | uk, en | **статичный** + остров формы | Prefill из URL внутри Suspense |
| `/[locale]/privacy` | uk, en | **статичный** | Слоты `TODO(legal)` |
| `/[locale]/_styleguide` | uk, en | условный | noindex; в production 404 без `ENABLE_STYLEGUIDE=1` |
| `not-found` / `error` / `global-error` | — | — | Этап 1 |

**Cache Components**

- `cacheComponents: true` в `next.config.ts`.
- Кэш через `'use cache'` / `cacheLife` где уместно; без устаревших `dynamic` / `revalidate` / `fetchCache` без сверки с docs 16.4.
- `params` и `searchParams` — Promise: всегда `await`.
- Динамические API (`cookies`, `headers`, `searchParams`) не на уровне page без `<Suspense>` — иначе маршрут станет динамическим.
- Проверка: таблица маршрутов в выводе `next build` — маркетинговые страницы, категории и карточки не должны внезапно стать Dynamic.

---

## (c) Модель данных (по DATA_CONTRACT)

**Источник:** `data/products_clean.csv` (UTF-8, переносы внутри кавычек, возможен BOM).

**Проверка на этапе 0**

| Факт | Значение |
|---|---|
| Строк данных (после header) | 304, из них 1 с пустыми name+category → **303 модели** |
| Категории | 8 (как в контракте) |
| Без нагрева | **25**: тележки 15, water-recovery 7, finishing 3 |
| Имена с `/` | 50 → в CSV `imageKey` уже с `_` |
| Уникальные short / full | ~29 / ~53 (пустоты: short 1–2, full ~13–14 на живых моделях) |
| Sectors | hospitals 302, hospitality 282, social 281, industrial 226, laundries 166 |

**Целевые сущности**

- `Product` — поля по контракту; `loadKg` / `powerKw` / `dimensionsMm` / `noiseDb` как структурированные объекты; `heating` + опциональный `heatingVariant`; `sectors: SectorKey[]`; `voltage: string[]`; `image: null`; `imageKey` без преобразований.
- `Series` — уникальные short/full описания; модель ссылается через `seriesId`.
- `familyId` + `variantLabel` — эвристика хвостовых меток (E, ES, G, HPi, HW, NOMEX, P, R, S, V, XP); смысл меток не толкуем.
- Slug: lower-case, не `a-z0-9` → `-`; коллизия = fail сборки.

**Конвейер (этап 2)**

1. `scripts/build-catalog.ts` (tsx + csv-parse) → Zod (`src/lib/catalog/schema.ts`).
2. Пишет `src/data/catalog.generated.json` и лёгкий `src/data/catalog.index.json`.
3. Fail на: дубль slug, неизвестная категория, неразобранные габариты где обязательны; отброс хвостовой пустой строки / пустого name.
4. API: `getAll`, `getBySlug`, `getByCategory`, `getFamily`, `getRelated`, `facets`; чистые `filter` / `sort` / `search` в `query.ts`.
5. `getModelImage(product)` — единственный источник фото; до этапа 12 возвращает «нет фото».

---

## (d) Схема i18n и next-intl + Cache Components

Рабочая схема по актуальным docs next-intl (routing setup + `next/root-params`, Next.js ≥ 16.3):

1. **Root layout только в** `src/app/[locale]/layout.tsx`. Pass-through `src/app/layout.tsx` **не** создавать — иначе `[locale]` не станет root param.
2. **`cacheComponents: true`** в `next.config.ts` (+ плагин `next-intl`).
3. **`src/proxy.ts`**: `createMiddleware(routing)` из next-intl; matcher исключает `api`, `_next`, статику с точкой. Файла `middleware.ts` нет.
4. **`src/i18n/routing.ts`**: `locales: ['uk','en']`, `defaultLocale: 'uk'`.
5. **`src/i18n/request.ts`**: в `getRequestConfig` читать `await locale()` из `next/root-params`; если нет явного override — валидировать через `hasLocale`, иначе `notFound()`. Возвращать `{ locale, messages }`.
6. **`generateStaticParams`** на layout/pages: все locales; на карточках — category × slug.
7. **Не использовать** legacy `setRequestLocale` (нужен был до root-params и ломает ясность кэша).
8. **Server Actions / Route Handlers**: `next/root-params` пока не работает — передавать `locale` явно в `getTranslations({ locale, namespace })`.
9. **Навигация**: `createNavigation(routing)` → `Link`, `redirect`, `usePathname`, `useRouter`; переключатель языка сохраняет путь.
10. **Сообщения**: неймспейсы из словаря `L` прототипа (`nav`, `home`, `catalog`, `quote`, `spec`, `industries`, …). ICU plural для uk: `one` / `few` / `many` / `other`. Описания из CSV только на uk; на en — `lang="uk"` + пометка или скрыть (без машинного перевода). Черновики en — `messages/en.draft.json` с `needs-review` при появлении.

Подводные камни, учтённые в схеме:

- Root layout выше `[locale]` → root-params не видит locale.
- Вызов next-intl API без locale в Action → нужен явный override.
- `headers()` для locale (старый приём next-intl) → динамический рендер; поэтому root-params, не header.

---

## (e) Состояние фильтров (nuqs) и бюджет payload

**URL-параметры (nuqs, клиент в Suspense)**

| Страница | Параметры | Пример |
|---|---|---|
| Catalog | `kg`, `type`/`category`, `heat`, `q`, `sort` | `?kg=23-53&type=washers&heat=gas&q=LA-&sort=kg:desc` |
| Compare | `m` (до 4 slug через запятую) | `?m=la-22-tp2-e,sr-22-tp2-e` |
| Quote | `kg`, `sector`, `m` | `?kg=53&sector=hospitals&m=la-22-tp2-e` |

Пагинация каталога: «Показати ще» по 60; лимит можно держать в URL или локально (предпочтение — URL для deep link, если не раздувает строку).

**Бюджеты**

- `catalog.index.json` ≤ **40 KB gzip** (ACCEPTANCE D4).
- JS главной ≤ **100 KB gzip** (цель G7).
- Карточка модели не тянет весь каталог — только свою запись + related с сервера.
- Линейка на главной: на клиент — массив `[kgMin, kgMax]` для счётчика; SVG силуэтов с сервера (LCP до гидратации).

---

## (f) Конвейер заявок (адаптеры)

```
Form (client island) → Server Action submitLead
  → Zod validate
  → anti-spam (honeypot, min fill time, IP hash rate limit)
  → optional Turnstile if env set
  → LeadSink[] from LEADS_SINKS
  → success if ≥1 adapter ok; idempotency key
```

**Адаптеры `LeadSink`:** `console` | `email` (Resend) | `telegram` | `webhook` (HMAC). Таймауты и ретраи обязательны. Секреты только через `src/env.ts` (Zod). PII не логировать. `/privacy` — структура со слотами `TODO(legal)`.

**До ответа владельца (Q6):** `LEADS_SINKS=console`. Интерфейс и остальные адаптеры реализуются на этапе 7, включаются env.

---

## (g) Риски, расхождения прототип ↔ данные

### Обязательные расхождения и решения

1. **Счётчики «Для кого»**  
   Прототип: `inds()` считает `D.filter(m => m.a & bitmask)` — почти все модели попадают во все отрасли (в данных hospitals = 302/303).  
   **Решение:** редакционные строки без счётчиков моделей; тексты-заглушки `TODO(copy)` или перенос коротких текстов из `L.indt` без чисел. Sectors — контекст для формы КП и копирайта, не фильтр каталога и не источник цифр на главной.

2. **Повторяющиеся описания**  
   ~30 коротких и ~53 полных на 303 модели.  
   **Решение:** сущность `series`; в списках/таблицах не повторять абзацы; на карточке — short серии + полное списком («•» → list).

3. **Диапазоны кг**  
   Форматы `8-9`, `11.7 x 2 - 10.5 x 2`, `18.3-16.5/18-20`. Смысл неизвестен (Q1).  
   **Решение:** хранить `raw`; для фильтров/сортировки/линейки — `min`/`max` (множители `x 2` убрать из чисел); не подписывать «от–до» как официальную трактовку без ответа заказчика.

4. **25 моделей без нагрева**  
   Тележки (15), регенерация воды (7), часть finishing (3) — ожидаемо.  
   **Решение:** `heating: null`; в UI скрыть или «—»; в фильтре нагрева не показывать фейковый пункт без копирайта; список finishing без нагрева — в `CATALOG_REPORT` / needs-review (Q4).

5. **Фото с `/` в имени**  
   50 моделей: в названии `/`, в `imageKey` уже `_` (например `P-18/100 M E` → `P-18_100 M E.png`).  
   **Решение:** `imageKey` хранить как в CSV; slug строить отдельно (`/` → `-`); файлов в репо нет — только `getModelImage()`.

### Прочие риски

- Регрессии next-intl ↔ Cache Components / root-params при минорных апдейтах Next — пин версий, smoke e2e на `/uk` и `/en`.
- Раздувание `catalog.index.json` при лишних полях — проекция только для фильтров/таблицы; тест размера gzip.
- Motion и CLS — только transform/opacity/stroke/clip-path; `prefers-reduced-motion`.
- Нет юридических текстов, адресов, логотипа, EN-описаний моделей — слоты, не выдумывать (G5, S3).
- EN-названия категорий из прототипа (`TE`) — needs-review у заказчика (Q3).

---

## (h) План этапов 1–12 и критерии ACCEPTANCE

| Этап | Результат | Критерии |
|---|---|---|
| **1** Каркас, токены, темы, i18n, оболочка, CI | Пустой «боевой» сайт | G1–G8 (глобально) |
| **2** CSV → JSON, API каталога, тесты | 303 модели, отчёт | D1–D4; G1, G5, G8 |
| **3** UI-кит + `_styleguide` | Примитивы и визуальная проверка | V1–V6; G1–G8 |
| **4** Главная: линейка и секции | Hero-линейка, без фейковых счётчиков | G1–G8, V1–V5; Lighthouse mobile Perf ≥ 90, CLS 0 |
| **5** Каталог, категории, карточка | Статика locale×category×slug | G1–G8, D4, V1–V5 |
| **6** Сравнение и datasheet | Compare tray, print A4 | G1–G8, V1–V5 |
| **7** Форма КП и LeadSink | Доставка заявок, privacy-слоты | G1–G8, P1–P4 |
| **8** Слой движения | Токены motion, `MOTION_LEVEL` | G1–G8, V6 |
| **9** SEO, OG, JSON-LD | Metadata, sitemap, structured data | G1–G8, S1–S3 |
| **10** a11y, скорость, безопасность | Lighthouse CI, CSP, axe | Весь ACCEPTANCE.md |
| **11** Деплой и передача | Vercel, RUNBOOK, README | G1–G8; превью + тестовая заявка |
| **12** Фото и CMS | ImageSource, PHOTO_SPEC | Когда будет источник фото (Q7) |

Каждый этап: отчёт (сделано / проверка / отклонения / вопросы / commit message) и остановка.

---

## Решения владельца (2026-11-14)

Статус: **приняты** рекомендации плана по Q1–Q10.

| # | Решение |
|---|---|
| Q1 | Диапазоны кг: только `raw` + `min`/`max` для фильтров; смысл не трактовать |
| Q2 | Суффиксы названий: только `variantLabel`, без глоссария в UI |
| Q3 | EN-категории: как в прототипе (`TE`), needs-review |
| Q4 | 25 без нагрева: ок для carts / water-recovery; finishing — в CATALOG_REPORT |
| Q5 | Описания на уровне серии, не per-model |
| Q6 | КП: пока `console`; остальные LeadSink подключаем на этапе 7 |
| Q7 | Фото: силуэты до этапа 12; `image: null` |
| Q8 | EN: uk-описания с `lang="uk"` и пометкой; без машинного перевода |
| Q9 | Legal / контакты / лого: TODO-слоты, ничего не выдумывать |
| Q10 | Node **24** LTS; `engines`: `^22 \|\| ^24` |

---

## Следующий шаг

План утверждён. Этап 1: каркас Next.js 16.4, токены, шрифты, темы, i18n, оболочка, CI.
