# Runbook

Операційні інструкції для власника сайту. Етап 9: пошукова індексація. Розділи про деплой і каталог доповнюються на етапі 11.

## Пошукові системи

### Google Search Console

1. Відкрийте [Google Search Console](https://search.google.com/search-console).
2. Додайте ресурс типу **Domain** (рекомендовано) або **URL prefix** з продакшен-URL з `NEXT_PUBLIC_SITE_URL`.
3. Підтвердіть право власності (DNS TXT для Domain, або HTML-файл / meta-тег для URL prefix).
4. Після підтвердження: **Sitemaps** → додайте `https://<ваш-домен>/sitemap.xml`.
5. Перевірте вибірку сторінок: головна `/uk`, категорія, картка моделі — у звіті **Page indexing**.
6. **URL Inspection** → «Перевірити URL» → «Переглянути протестовану сторінку»: має бути `canonical`, `hreflang` (uk, en, x-default).

### Bing Webmaster Tools

1. Відкрийте [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Додайте сайт і підтвердіть власність (DNS або файл), або імпортуйте з Search Console.
3. Надішліть sitemap: `https://<ваш-домен>/sitemap.xml`.
4. У **URL Inspection** переконайтесь, що `/robots.txt` дозволяє публічні шляхи й блокує `/_styleguide` та `/fontcheck`.

## Перевірка структурованих даних (JSON-LD)

1. Відкрийте [Google Rich Results Test](https://search.google.com/test/rich-results) або [Schema Markup Validator](https://validator.schema.org/).
2. Перевірте:
   - головну `/uk` — `Organization`, `WebSite`;
   - категорію `/uk/catalog/washers` — `BreadcrumbList`, `ItemList`;
   - модель `/uk/catalog/washers/<slug>` — `BreadcrumbList`, `Product`.
3. У `Product` не повинно бути цін, рейтингів і адрес. Поле `image` з’являється лише коли є реальне фото (етап 12).
4. Локально: `pnpm test` — тести `src/lib/seo/*.test.ts` (унікальність title/description, валідність JSON-LD, склад sitemap).

## Швидкі URL для перевірки після деплою

| Що | URL |
|---|---|
| Sitemap | `/sitemap.xml` |
| Robots | `/robots.txt` |
| OG головної (uk) | `/uk/opengraph-image` |
| OG категорії | `/uk/catalog/washers/opengraph-image` |
| OG моделі | `/uk/catalog/washers/<slug>/opengraph-image` |

## Змінні середовища (SEO)

| Ім’я | Навіщо | Обов’язкова | Приклад |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap, абсолютні посилання в JSON-LD | Так у продакшені | `https://example.com` |

Без `NEXT_PUBLIC_SITE_URL` збірка використовує `http://localhost:3000` — для продакшену замініть на реальний HTTPS-домен.

## Як оновити каталог з Google Таблиці

Рантайм (без редеплою): сайт раз на ~5 хвилин підтягує опублікований CSV (`CATALOG_CSV_URL`) через `'use cache'` / `cacheLife`. Знімок `catalog.generated.json` лишається запасним на збірці й при збої таблиці.

1. Відредагуйте лист **«Каталог»** (22 колонки за `docs/DATA_CONTRACT.md`). Для діапазонів і складних полів — формат **Простой текст**, локаль таблиці **США**.
2. Переконайтесь, що лист **опублікований у веб** як CSV (File → Share → Publish to web), а в env є `CATALOG_CSV_URL`.
3. Зачекайте **~5 хвилин** (або відкрийте сторінку двічі після вікна `revalidate`: перший запит може ще віддати старе, другий — нове).
4. Перевірка: `GET /api/catalog-status` з заголовком `Authorization: Bearer <CATALOG_STATUS_SECRET>`:
   - `runtime.runtimeSource`: `"sheet"` — дані з таблиці; `"snapshot"` — віддається знімок збірки;
   - `runtime.runtimeModelCount`, `runtime.lastErrors`, `runtime.lastFetchAt`;
   - `build.*` — метадані останнього `pnpm catalog:build`.
   - Адресу таблиці статус **не** показує. Без `CATALOG_STATUS_SECRET` маршрут відповідає **404**.

Нові моделі з таблиці відкриваються при першому запиті (не треба чекати збірку). Видалені зі знімка/таблиці дають 404. Пререндер на збірці бере лише знімок (`generateStaticParams`).

Періодично (або в CI) все одно запускайте `pnpm catalog:build`, щоб оновити знімок, `docs/CATALOG_REPORT.md` і slug-history / редіректи.

### Якщо таблиця недоступна

Сайт лишається живим: відвідувач бачить останній успішний кэш або знімок збірки. У логах сервера — попередження без URL і без персональних даних. `/api/catalog-status` → `runtimeSource: "snapshot"` і заповнений `lastErrors`.

Фонова ревалідація Next.js при помилці **зберігає** попередній успішний кэш; знімок підставляється, коли немає валідного запису (холодний старт / expire). Поки віддається знімок або старий кэш, правки з таблиці й нові моделі можуть бути невидимі до наступного успішного fetch (≤ вікна кэшу).

Після збою мережі повторні запити до таблиці паузяться **60 с** (захист від лавини).

### Якщо збірка червона (`pnpm catalog:build`)

1. Лог → повідомлення про заголовки, дату замість діапазону, усадку каталогу (&lt;80% від `src/data/catalog.meta.json`), дубль slug тощо.
2. Відкрийте `docs/CATALOG_REPORT.md` — розділ «Що змінилося з прошлої збірки».
3. Виправте дані в таблиці (часто: «Простой текст» для `8-9`, десяткова крапка, не чіпайте рядок заголовків).
4. Обхід навмисного зменшення асортименту: `CATALOG_ALLOW_SHRINK=1` на один деплой, потім приберіть.
5. Без `CATALOG_CSV_URL` збірка читає `data/products_clean.csv` (фікстура тестів).

### Змінні каталогу

| Ім’я | Навіщо | Обов’язкова |
|---|---|---|
| `CATALOG_CSV_URL` | Опублікований CSV Google Таблиці (рантайм + build) | Так у проді для автооновлення |
| `CATALOG_CACHE_REVALIDATE_SECONDS` | Інтервал кэшу `getCatalog()` (за замовч. 300) | Ні |
| `CATALOG_STATUS_SECRET` | Bearer для `/api/catalog-status` (без нього → 404) | Ні |
| `CATALOG_ALLOW_SHRINK` | Дозволити &lt;80% моделей від знімка | Лише свідомо |

### Як відкотити

У Vercel: **Deployments** → попередній успішний деплой → **Promote to Production**. Знімок і пререндер повернуться до того деплою; рантайм знову читатиме поточну таблицю.
