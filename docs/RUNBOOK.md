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

1. Відредагуйте лист **«Каталог»** (22 колонки за `docs/DATA_CONTRACT.md`). Для діапазонів і складних полів — формат **Простой текст**, локаль таблиці **США**.
2. У меню таблиці: **Сайт → Опублікувати зміни на сайт** (Apps Script викликає Deploy Hook Vercel). Якщо меню ще немає — або налаштуйте скрипт з `docs/PROMPTS_DATA_PHOTOS.md`, або вручну запустіть Deploy Hook / `git push`.
3. Опублікований CSV оновлюється не миттєво (зазвичай кілька хвилин). Потім Vercel збирає сайт: `pnpm catalog:build` читає `CATALOG_CSV_URL`, пише JSON і `docs/CATALOG_REPORT.md`.
4. Через **2–4 хвилини** перевірте прев’ю/прод: головна, категорія, картка моделі, порівняння.

### Якщо збірка червона

1. Лог Vercel → крок `catalog:build`: повідомлення про заголовки, дату замість діапазону, усадку каталогу (&lt;80% від `src/data/catalog.meta.json`), дубль slug тощо.
2. Відкрийте `docs/CATALOG_REPORT.md` у гілці/артефактах останньої успішної збірки — розділ «Що змінилося з прошлої збірки».
3. Виправте дані в таблиці (часто: формат «Простой текст» для `8-9`, десяткова крапка замість коми, не чіпайте рядок заголовків).
4. Обхід навмисного зменшення асортименту: `CATALOG_ALLOW_SHRINK=1` у env Vercel на один деплой, потім приберіть.
5. Без `CATALOG_CSV_URL` локально працює `data/products_clean.csv` (фікстура тестів).

### Як відкотити

У Vercel: **Deployments** → попередній успішний деплой → **Promote to Production**. Каталог і сторінки повернуться до стану того деплою. Після відкату виправте таблицю, щоб наступна збірка знову пройшла.
