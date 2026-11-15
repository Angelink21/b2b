# Журнал решений
Формат строки: `YYYY-MM-DD · решение · причина`.

2026-11-14 · Утверждён docs/PLAN.md (этап 0); Q1–Q10 приняты по рекомендациям · Владелец подтвердил raw+min/max, labels, console LeadSink до этапа 7, силуэты до этапа 12, Node 24.
2026-11-14 · Zod 4.x (не 3) · Актуальный stable на момент этапа 0 / установки каркаса.
2026-11-14 · next-intl 4.15.1 + Vitest 5 + Playwright 1.65 + axe + Prettier/tailwind-plugin · Каркас этапа 1 по PLAN.md; Motion/nuqs отложены до этапов с UI/фильтрами.
2026-11-14 · csv-parse 7.x · CSV → JSON конвейер этапа 2; нужен для quoted multiline и BOM в products_clean.csv.
2026-11-14 · boilerPowerKw как {raw,min,max} · В CSV есть значение `6-7.5` (1 модель); простой number ломал сборку.
2026-11-14 · nuqs 2.10.3 · Состояние фильтров каталога в URL; страница остаётся статичной (хуки только в клиентском острове внутри Suspense).
2026-11-14 · LeadSink adapters via fetch (no Resend/Telegram/Upstash SDKs) · Fewer dependencies; secrets stay in env; stage 7 Q6 default LEADS_SINKS=console.
2026-11-14 · CSP with nonce deferred to stage 10 · Stage 7 ships X-Content-Type-Options, Referrer-Policy, Permissions-Policy, production HSTS; nonce CSP needs careful proxy plumbing with Cache Components.
2026-11-14 · submitLead reads locale from hidden form field + messages/*.json · next-intl getLocale/getTranslations use root-params, unsupported inside Server Actions on Next 16.4.
2026-11-14 · motion 14.14.0 (`motion/react`) · Stage 8 orchestration and layout animations; CSS for hover/scroll-driven; React 19.3 ViewTransition for catalog list → model card.
2026-11-14 · SEO via Next Metadata API + `next/og` (no extra deps) · Stage 9: canonical/hreflang, sitemap/robots, JSON-LD, OG silhouettes from `tokens.ts`; product descriptions from specs not series copy.
2026-11-14 · Typography tokens `--measure` / `--measure-narrow` · Reading measure 65ch/52ch; balance/pretty/overflow-wrap centralized in globals without layout-shift animations.
2026-11-14 · Gutter `clamp(16px, 4vw, 32px)`, 12-column grid gap 24/32, measure 66ch/60ch · P1 alignment (rule 15). Fixed 24px fields in DESIGN.md left the lineup readout and section rows on different edges.
2026-11-14 · Industries rail removed · The 24px indent and the line that stopped mid-list fought the shared left edge. Rows sit on the heading edge; a full-height line would cover the text.
2026-11-14 · Год в подвале через `cacheLife("days")` · `new Date()` нельзя во время пререндера; профиль days обновляет год чаще, чем weeks.
2026-11-14 · Blur только у прилипающей шапки (`backdrop-filter: blur(14px) saturate(1.1)`, фон `color-mix` 78% `--bg`, иначе сплошной `--bg`) · Этап P2: полупрозрачная шапка при скролле. Единственное исключение из запрета blur; слой размытия не на самом `header`, чтобы мобильное меню оставалось `position: fixed` к окну.
2026-11-14 · `app/[locale]/loading.tsx` removed · It wrapped every page in Suspense, so the prerendered home HTML sat in `<div hidden id="S:1">` until hydration and LCP waited on JS. Catalog skeleton stays on the explorer Suspense boundary.
2026-11-14 · `pnpm start` defers `/_next/static/chunks/*.js` by 250ms · On local production those async bundles finished and ran before first paint, so simulated Lighthouse LCP counted ~400KB of JS as render delay for the H1. Inline flight data stays; chunks load on a timer after the text can paint. `next dev` is unchanged.
2026-11-14 · `compress: false`; `scripts/start-server.mjs` gzips HTML after the rewrite · Next's compressor wrote the body before the HTML rewrite could see it. The custom server gzips documents itself when the client accepts gzip.
2026-11-15 · Home lineup uses equal body gaps (flex) and ruler centers measured from columns · Equal 1fr columns crushed wide silhouettes on the right. Visual thumbs follow measured centers; native ranges stay for keyboard/aria.
2026-11-15 · Lineup floor size grows width by 1.75×depth excess and height by half that grow · LA-60C/LA-80C share front W×H; width-only was too subtle. Cards keep true front mm.
2026-11-15 · `scripts/start-server.mjs` forces `NODE_ENV=production` unless explicitly `development` · Unset NODE_ENV made Playwright’s `pnpm start` boot Next in dev; client islands never set data-*-ready.
2026-11-15 · Category page lead is named metric range only (count stays above the table); client intros live in CONTENT_TODO · Avoids duplicate «N моделей» and inventing marketing lines.
2026-11-15 · Catalog side panel 240px from 1280px (`240px minmax(0,1fr)`); below — filter sheet · a–c (8px cell pad, 240px panel, container-query optional cols @ ≤920px) still overflowed with a 1100px side panel; strategy d.
2026-11-15 · eslint ignores `.next-*/**` · Ad-hoc dist dirs (`.next-p6-after`, etc.) must not be linted.
2026-11-15 · `/privacy` describes form fields and purpose only; lawyer text is a launch blocker · No retention/legal-basis/rights claims without counsel.
2026-11-15 · Home Flagship/Advantages use interactive premium card frames (token border + inset top edge, no glow) · Brief asked for Miele-level industrial cards; DESIGN prefers rows, but compare/quote CTAs need card containers; hover only changes border/inset.
2026-11-15 · Home marketing numbers grounded in public Fagor docs: Auto Weight ≤30% (not 40%), high-spin G 450–500, warehouse Kyiv region (not per-SKU stock), process steps without 15‑min/24‑7 SLA · Avoids invented claims while keeping the three home blocks.
2026-11-15 · `siteConfig.address` cleared (was Vyshneve Kyivska 27V) · Removed — not confirmed by the owner; phone/email/hours stay empty too.
2026-11-15 · Catalog panel content inset `padding-inline-start: 16px` (`--space-3`); active category bar on panel edge via negative list pull · Matches spacing scale; 12px not needed.
2026-11-15 · `/about` is corporate (expertise, infra without unpublished address, engineering standards, quote CTA); catalog stats/category blurbs removed · Avoids confusing About with the catalog; partner wording from owner; no invented history/team/SLA/address.
2026-11-15 · Contacts map uses Google Maps query embed (`output=embed`) without API key; iframe in aspect-ratio 16/9 box with lazy load · No new dependency; reserved box avoids CLS; CSP nonce still deferred.
2026-11-15 · Catalog Suspense skeleton matches ~60 table rows + toolbar height; `mt-6` moved outside Suspense · Lighthouse mobile CLS 0.28 on `/catalog` was the footer shifting when a 6-row skeleton swapped for the explorer.
2026-11-15 · Client forms import `@/lib/leads/client` (not the server barrel) · The barrel re-exported webhook HMAC (`node:crypto`) into a 135 KB gzip client chunk.
2026-11-15 · Stage 10 Lighthouse CI via `scripts/lighthouse-ci.mjs` (npx lighthouse, no `@lhci/cli`) · Avoids a new dependency; budgets match ACCEPTANCE.md.
2026-11-15 · `.site-footer { background: var(--bg) }` · Axe (WebKit) sampled a blended bg (~#44484e) for steel links; solid `--bg` restores ≥4.5:1 without changing `--steel`.
2026-11-15 · table-visual ignores 0×0 `th`/`td` · Container queries hide optional columns; zero rects made baseline spread ≈ headerY.
2026-11-15 · Header at ≤359px: brand 16px, gap/space-1, tighter locale padding · At 320px brand+tools overflowed the gutter by ~9px (ACCEPTANCE 320 width).
2026-11-15 · Stage 12B photos via public Cloudinary HEAD + fl_getinfo (no Admin API keys) · Owner has cloud name only; public_id = imageKey with spaces→`_`; folder from CLOUDINARY_FOLDER (may be empty).
2026-11-15 · next/image custom loader prop (`cloudName::publicId`) instead of global loaderFile · Limits Cloudinary URLs to ModelImage/lineup; remotePatterns still set when cloud name is present.
2026-11-15 · Compare client island uses ModelImageView + preloaded photo; never imports images.generated.json · Turbopack JSON.parse crashed in the client graph when CompareView imported ModelImage→manifest.
2026-11-15 · Hero lineup: only LA/LAP/LN front-loaders; photos only if all 8 pass ≤8% trim AR vs Ш/В · LBS barrier bodies broke the shared scale; current Cloudinary crops are not front-view enough for e_trim photos.
2026-11-15 · Stage 12A: catalog:build fetches CATALOG_CSV_URL (published Sheet CSV) with local CSV fallback; decimal commas coerced; date-like cells fail; shrink guard via catalog.meta.json; slug-history.json → next.config 301 · Owner edits the sheet; no API keys; Vercel keeps last good deploy on validation failure.
2026-11-15 · Optional CSV column `image_id` stored on Product · Stronger photo match and rename identity than imageKey alone.
