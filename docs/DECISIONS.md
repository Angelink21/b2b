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
