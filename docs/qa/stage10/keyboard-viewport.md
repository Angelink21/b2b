# Keyboard scenario (stage 10)

Date: 2026-11-15
Browser: Playwright Chromium desktop

## Result
- Tab lands on skip link
- Enter on skip moves focus to main
- Theme toggle Enter: light → light
- Lineup range ArrowRight: 94 → 95
- Catalog search control not found (skipped type)
- Space activates a catalog control
- Quote name filled via keyboard

All steps completed without trap; focus remained visible.

## 320px width

- /uk: pageOverflow=0px (intentional scroller)
- /uk/catalog: pageOverflow=0px (intentional scroller)
- /uk/catalog/washers: pageOverflow=0px (intentional scroller)
- /uk/catalog/washers/haier-hcw12cbd: pageOverflow=0px
- /uk/quote: pageOverflow=0px
- /uk/compare?m=haier-hcw12cbd: pageOverflow=0px

## 200% zoom (documentElement.zoom=2 @ 640 CSS px)

- /uk: pageOverflow=0px (intentional scroller)
- /uk/catalog/washers: pageOverflow=0px
- /uk/quote: pageOverflow=0px

## 200% zoom (documentElement.zoom=2 @ 640 CSS px)

- /uk: pageOverflow=0px (intentional scroller)
- /uk/catalog/washers: pageOverflow=0px
- /uk/quote: pageOverflow=0px
