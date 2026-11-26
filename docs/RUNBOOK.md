# Runbook

Операційні інструкції для власника сайту (деплой, каталог, заявки, SEO).

## Деплой на Vercel

1. [Vercel](https://vercel.com) → **Add New Project** → Import GitHub `Angelink21/b2b` (гілка `main` або `feat/runtime-catalog` для preview).
2. Framework: **Next.js**. Build: `pnpm build` (або дефолт). Install: `pnpm install`.
3. Увімкніть **Preview Deployments** для PR (за замовчуванням).
4. Заповніть Environment Variables (Production + Preview) — таблиця нижче.
5. Deploy. Перевірте `https://<project>.vercel.app/uk`.
6. Тестова заявка на `/uk/quote` з `LEADS_SINKS=console` → лог функції Vercel (або email/Telegram після налаштування sinks).

### Домен (коли DNS готовий)

1. Vercel → Project → **Domains** → `pralne-obladnannya.com.ua` (+ `www` за бажанням).
2. Додайте DNS-записи, які покаже Vercel.
3. Редирект `www` → apex (або навпаки) налаштуйте в Domains UI.
4. Виставте `NEXT_PUBLIC_SITE_URL=https://pralne-obladnannya.com.ua` і зробіть Redeploy.

### Чек-лист релізу

- [ ] `pnpm verify` і `pnpm e2e` зелені локально / на CI
- [ ] Env на Vercel заповнені (SITE_URL, CATALOG_CSV_URL, LEADS_*, Cloudinary)
- [ ] Preview відкривається; форма КП відправляє заявку
- [ ] `/sitemap.xml`, `/robots.txt`, одна картка моделі з габаритами
- [ ] Analytics у Vercel Dashboard (після першого візиту)

### Відкат

Vercel → **Deployments** → попередній успішний деплой → **Promote to Production**. Знімок і пререндер повернуться до того деплою; рантайм знову читатиме поточну таблицю.

## Змінні середовища

Повний шаблон: `.env.example`.

| Ім’я | Навіщо | Обов’язкова | Приклад |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap, JSON-LD | Так у проді | `https://pralne-obladnannya.com.ua` |
| `CATALOG_CSV_URL` | Published Google Sheet CSV | Так для live-оновлень | `https://docs.google.com/.../pub?output=csv` |
| `CATALOG_CACHE_REVALIDATE_SECONDS` | TTL runtime-каталогу | Ні (300) | `300` |
| `CATALOG_STATUS_SECRET` | Bearer для `/api/catalog-status` | Ні | довгий random |
| `CATALOG_ALLOW_SHRINK` | Дозволити &lt;80% моделей | Лише свідомо | `1` |
| `LEADS_SINKS` | Куди йдуть заявки | Так | `console` або `email,telegram` |
| `LEADS_RATE_SALT` | Сіль rate-limit | Так у проді | random |
| `LEADS_MIN_FILL_MS` | Мін. час заповнення форми | Ні | `3000` |
| `LEADS_RATE_LIMIT_MAX` / `WINDOW_MS` | Ліміт заявок | Ні | `8` / `3600000` |
| `RESEND_API_KEY` / `LEADS_EMAIL_FROM` | Email sink | Якщо sinks містить `email` | FROM з верифікованого домену Resend |
| `LEADS_EMAIL_TO` | Куди слати заявки | Ні (дефолт `siteConfig.email`) | `pkmprofessional@ukr.net` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram sink | Якщо `telegram` | — |
| `LEADS_WEBHOOK_URL` / `LEADS_WEBHOOK_SECRET` | Webhook sink | Якщо `webhook` | — |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Розподілений rate-limit | Ні | — |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Turnstile | Ні (пара) | — |
| `CLOUDINARY_CLOUD_NAME` | Фото моделей | Для фото | `your_cloud` |
| `CLOUDINARY_FOLDER` | Папка public_id | Ні | `fagor` |
| `IMAGES_CACHE_REVALIDATE_SECONDS` | TTL runtime-probe фото | Ні (300) | `300` |
| `ENABLE_STYLEGUIDE` | `/_styleguide` у проді | Ні | `1` |
| `GOOGLE_SITE_VERIFICATION` | Meta для Search Console (HTML-метод) | Ні | токен з GSC |
| `BING_SITE_VERIFICATION` | Meta `msvalidate.01` | Ні | токен з Bing |
| `NEXT_PUBLIC_GTM_ID` | Контейнер GTM (`GTM-…`) | Ні | `GTM-XXXX` |

Без `NEXT_PUBLIC_SITE_URL` збірка падає на `http://localhost:3000` у canonical — для продакшену замініть.

Аналітика: `@vercel/analytics` (без cookie). Події: `quote_open`, `quote_success`, `lineup_use`, `compare_add`, пошу пошуку / mobile bar — також в `dataLayer` для GTM.

### Google Tag Manager / Ads

1. Створіть контейнер GTM → значення `GTM-…` вставте в Vercel env `NEXT_PUBLIC_GTM_ID`.
2. **Google Ads (`AW-…`) і GA4 (`G-…`) не кладіть у env сайту** — додайте теги всередині GTM.
3. Conversion: Custom Event `quote_success` (йде з форми КП).
4. Скрипт GTM на сайті вмикається **лише після marketing consent**. Поки немає cookie-баннера, GTM **не завантажується**, навіть якщо env заповнений. Перед увімкненням реклами потрібен етап баннера + оновлення `/privacy`.

## Каталог (Google Таблиця)

Рантайм (без редеплою): раз на ~5 хвилин сайт підтягує CSV (`CATALOG_CSV_URL`). Знімок `src/data/catalog.generated.json` — запасний на збірці й при збої таблиці.

1. Редагуйте лист **«Каталог»** (22 обов’язкові колонки + до 2 optional EN — `docs/DATA_CONTRACT.md`). Діапазони — **Простой текст**, локаль таблиці **США**.
2. Лист **опублікований у веб** як CSV; у env є `CATALOG_CSV_URL`.
3. Зачекайте ~5 хвилин (або два завантаження сторінки після `revalidate`).
4. Перевірка: `GET /api/catalog-status` з `Authorization: Bearer <CATALOG_STATUS_SECRET>`.
5. Періодично: `pnpm catalog:build` → PR → preview (оновлює знімок, `CATALOG_REPORT`, `TRANSLATION_REPORT`, slug-history / 301).
6. Нова категорія: `docs/ADD_CATEGORY.md`.

### Англійські описи серій (optional)

Заголовки колонок **точно** (регістр/пробіли не важливі для імпорту, але краще так):

- `Short description (EN)`
- `Full description (EN)`

Правила заповнення:

1. Формат комірки — **Простой текст**; переноси рядків всередині комірки дозволені.
2. Маркери списку — символ `•` на початку рядка (як в українському повному описі).
3. Підзаголовки — звичайний регістр (sentence case), не ALL CAPS.
4. Достатньо заповнити **одну рядок моделі на серію** — пайплайн візьме найчастіше непусте значення на всю серію. Порожня EN-комірка не затирає значення серії.
5. Не копіюйте український текст у EN без перекладу; збірка лише попередить (кирилиця / EN=UA / дивна довжина).
6. Після змін: опублікований CSV → ~5 хв runtime, або `pnpm catalog:build` → див. `docs/TRANSLATION_REPORT.md`.

### Червона збірка `catalog:build`

1. Лог → заголовки, дати замість діапазонів, усадка &lt;80%, дубль slug.
2. `docs/CATALOG_REPORT.md` — «Що змінилося».
3. Виправте таблицю; свідомий shrink: `CATALOG_ALLOW_SHRINK=1` на один деплой.

### Фото моделей

1. Завантажте в Cloudinary файл PNG з `public_id` = `imageKey` (пробіли → `_`), опційно в `CLOUDINARY_FOLDER`.
2. На сайті (з `CLOUDINARY_CLOUD_NAME` у env) фото підхоплюється **runtime HEAD-probe** без коміту маніфесту — зазвичай протягом TTL (~5 хв, `IMAGES_CACHE_REVALIDATE_SECONDS`).
3. Періодично/для знімка збірки: `pnpm images:sync` (після `catalog:build`) → `images.generated.json` + `IMAGES_REPORT.md` (офлайн/швидкий hit).
4. Без фото — силует з мм каталогу.

## Заявки КП (отримувачі)

1. `LEADS_SINKS=console` — лише логи (dev / перший preview).
2. Email: `LEADS_SINKS=email` + `RESEND_API_KEY` + `LEADS_EMAIL_FROM`.
   `LEADS_EMAIL_TO` можна не задавати — тоді листа йде на публічний email з `siteConfig` (`pkmprofessional@ukr.net`).
3. Telegram: `telegram` + bot token + chat id.
4. Webhook: `webhook` + URL + HMAC secret.
5. Після зміни env — Redeploy. Не комітьте секрети.

## Контент

| Що | Де | Як |
|---|---|---|
| Кейси на головній | `src/lib/content/cases.ts` | Додайте сценарій; без вигаданих клієнтів |
| Контакти / бренд | `src/config/site.ts` | Порожнє поле = приховано |
| Тексти UI | `messages/uk.json`, `messages/en.json` | Паритет ключів; en може бути needs-review |
| Юридичний privacy | `docs/CONTENT_TODO.md` | Текст юриста — launch blocker |
| Нова мова | `src/i18n/routing.ts` + `messages/*.json` | Потрібна повна локалізація |

## Пошукові системи

### Google Search Console

1. [Search Console](https://search.google.com/search-console) → Domain або URL prefix = `NEXT_PUBLIC_SITE_URL`.
2. Підтвердіть власність:
   - **Domain** → DNS TXT у реєстратора (код у сайт не потрібен).
   - **URL prefix** → HTML-тег: токен у Vercel env `GOOGLE_SITE_VERIFICATION` → редеплой.
3. Sitemaps → `https://<домен>/sitemap.xml`.
4. URL Inspection: canonical + hreflang uk/en/x-default.

### Bing Webmaster Tools

1. [Bing Webmaster](https://www.bing.com/webmasters) → додайте сайт або імпорт з GSC.
2. HTML-meta: токен у `BING_SITE_VERIFICATION` → редеплой.
3. Sitemap + перевірка `/robots.txt` (`/_styleguide`, `/fontcheck` заблоковані).

## JSON-LD

1. [Rich Results Test](https://search.google.com/test/rich-results) / [Schema Validator](https://validator.schema.org/).
2. Головна — `Organization`, `WebSite`; категорія — `BreadcrumbList`, `ItemList`; модель — `Product` без цін/рейтингів.
3. Локально: `pnpm test` — `src/lib/seo/*.test.ts`.

## Швидкі URL після деплою

| Що | URL |
|---|---|
| Sitemap | `/sitemap.xml` |
| Robots | `/robots.txt` |
| OG головної (uk) | `/uk/opengraph-image` |
| OG категорії | `/uk/catalog/washers/opengraph-image` |
| Статус каталогу | `/api/catalog-status` (з Bearer) |
