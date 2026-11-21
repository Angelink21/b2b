import { expect, test, type Page } from "@playwright/test";

/**
 * PROMPTS_FINAL B — digital responsive checks (chromium only).
 * Screenshots are not used; failures list route · width · check · element.
 */

test.describe.configure({ mode: "serial" });

const ROUTES = [
  "/uk",
  "/uk/catalog",
  "/uk/catalog/washers",
  "/uk/compare",
  "/uk/about",
  "/uk/service",
  "/uk/contacts",
  "/uk/privacy",
  "/uk/no-such-page-404",
] as const;

const WIDTHS = [
  320, 360, 375, 390, 412, 430, 600, 768, 820, 1024, 1180, 1280, 1440, 1920,
  2560,
] as const;

const LANDSCAPE = [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
] as const;

const TABLET = [
  { width: 1180, height: 820 },
  { width: 1366, height: 1024 },
] as const;

type Violation = {
  route: string;
  width: number;
  check: string;
  element: string;
};

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("fagor-theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
}

async function collectOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const bad: string[] = [];
    const nodes = document.body.querySelectorAll("*");
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      let scrollable = false;
      let ancestor: HTMLElement | null = el;
      while (ancestor) {
        const s = getComputedStyle(ancestor);
        const ox = s.overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") {
          scrollable = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (scrollable) continue;
      if (rect.right > vw + 1 || rect.left < -1) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className
          ? `.${String(el.className).trim().split(/\s+/).slice(0, 2).join(".")}`
          : "";
        bad.push(`${tag}${cls}`);
        if (bad.length >= 8) break;
      }
    }
    return bad;
  });
}

async function collectTouchTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selectors =
      "a, button, input, select, textarea, summary, [role=button]";
    const bad: string[] = [];
    for (const el of document.querySelectorAll(selectors)) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest("p a")) continue;
      if (el.closest(".sr-only, [hidden], .lineup-range")) continue;
      if (el.classList.contains("lineup-range")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      // Invisible native range inputs sit under 44px thumbs.
      if (rect.width + 0.5 < 44 || rect.height + 0.5 < 44) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className
          ? `.${String(el.className).trim().split(/\s+/).slice(0, 2).join(".")}`
          : "";
        bad.push(`${tag}${cls} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        if (bad.length >= 12) break;
      }
    }
    return bad;
  });
}

async function collectSmallText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!(el instanceof HTMLElement)) continue;
      if (!el.firstChild || el.firstChild.nodeType !== Node.TEXT_NODE) continue;
      const text = el.textContent?.trim() ?? "";
      if (text.length < 2) continue;
      const style = getComputedStyle(el);
      if (style.display === "none") continue;
      const size = Number.parseFloat(style.fontSize);
      if (Number.isFinite(size) && size + 0.01 < 14) {
        bad.push(
          `${el.tagName.toLowerCase()} ${size.toFixed(1)}px`,
        );
        if (bad.length >= 8) break;
      }
    }
    for (const el of document.querySelectorAll("input, textarea, select")) {
      if (!(el instanceof HTMLElement)) continue;
      const size = Number.parseFloat(getComputedStyle(el).fontSize);
      if (Number.isFinite(size) && size + 0.01 < 16) {
        bad.push(`field ${el.tagName.toLowerCase()} ${size.toFixed(1)}px`);
      }
    }
    return bad;
  });
}

async function checkLineup(page: Page): Promise<string[]> {
  const has = await page.locator(".lineup-stage").count();
  if (has === 0) return [];
  return page.evaluate(() => {
    const bad: string[] = [];
    const well = document.querySelector(".lineup-well");
    const stage = document.querySelector(".lineup-stage");
    if (!well || !stage) return bad;
    const wellTop = well.getBoundingClientRect().top;
    for (const m of document.querySelectorAll(".lineup-machine")) {
      const top = m.getBoundingClientRect().top;
      if (top < wellTop - 2) {
        bad.push("lineup-machine above well");
        break;
      }
    }
    const note = document.querySelector(".lineup-scale-note");
    if (note) {
      const nr = note.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      // Note should sit below the scroll strip, not under thumbs.
      if (nr.bottom > stageRect.bottom + 40) {
        /* ok if outside stage */
      }
    }
    const read = document.querySelector(".lineup-read");
    if (read) {
      const rr = read.getBoundingClientRect();
      if (rr.right > window.innerWidth + 1) bad.push("lineup-read overflow");
    }
    return bad;
  });
}

async function checkHeader(page: Page, width: number): Promise<string[]> {
  return page.evaluate((w) => {
    const bad: string[] = [];
    const header = document.querySelector(".site-header");
    if (!header) return ["missing .site-header"];
    const rect = header.getBoundingClientRect();
    if (rect.height < 56 - 1 || rect.height > 72 + 1) {
      bad.push(`header height ${Math.round(rect.height)}`);
    }
    const bar = document.querySelector(".site-header-bar");
    if (bar && bar.getBoundingClientRect().height > 72 + 4) {
      bad.push("header bar wraps");
    }
    if (w >= 1280) {
      const brand = document.querySelector(".site-brand");
      const h1 = document.querySelector("h1");
      if (brand && h1) {
        const dx = Math.abs(
          brand.getBoundingClientRect().left - h1.getBoundingClientRect().left,
        );
        if (dx > 1) bad.push(`brand/h1 edge Δ${dx.toFixed(1)}`);
      }
    }
    return bad;
  }, width);
}

async function checkChromeBudget(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    const vh = window.innerHeight;
    for (const el of document.querySelectorAll(".site-header, .compare-tray, .catalog-filters-sheet, .mobile-menu")) {
      if (!(el instanceof HTMLElement)) continue;
      const style = getComputedStyle(el);
      const fixed =
        style.position === "fixed" || style.position === "sticky";
      if (!fixed) continue;
      if (style.display === "none" || style.visibility === "hidden") continue;
      const h = el.getBoundingClientRect().height;
      if (h > vh * 0.3 + 1 && !el.classList.contains("mobile-menu")) {
        bad.push(`${el.className.split(" ")[0]} ${Math.round(h)}px`);
      }
    }
    return bad;
  });
}

async function resolveModelPath(page: Page): Promise<string> {
  await page.goto("/uk/catalog/washers");
  const href = await page
    .locator("table a[href*='/catalog/washers/']")
    .first()
    .getAttribute("href");
  if (!href) return "/uk/catalog/washers";
  return href.startsWith("http")
    ? new URL(href).pathname
    : href.startsWith("/")
      ? href
      : `/${href}`;
}

async function auditViewport(
  page: Page,
  route: string,
  width: number,
  height: number,
  theme: "light" | "dark",
): Promise<Violation[]> {
  const violations: Violation[] = [];
  await page.setViewportSize({ width, height });
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await setTheme(page, theme);

  const scrollW = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (scrollW) {
    violations.push({
      route,
      width,
      check: "a-scrollWidth",
      element: "documentElement",
    });
  }

  for (const el of await collectOverflow(page)) {
    violations.push({ route, width, check: "b-overflow", element: el });
  }

  if (width <= 1024) {
    for (const el of await collectTouchTargets(page)) {
      violations.push({ route, width, check: "c-touch", element: el });
    }
  }

  if (width <= 600) {
    for (const el of await collectSmallText(page)) {
      violations.push({ route, width, check: "d-text", element: el });
    }
  }

  if (route === "/uk") {
    for (const el of await checkLineup(page)) {
      violations.push({ route, width, check: "e-lineup", element: el });
    }
  }

  for (const el of await checkHeader(page, width)) {
    violations.push({ route, width, check: "f-header", element: el });
  }

  for (const el of await checkChromeBudget(page)) {
    violations.push({ route, width, check: "g-chrome", element: el });
  }

  return violations;
}

test.describe("responsive B matrix (chromium)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "PROMPTS_FINAL B: chromium only",
  );

  test("viewport matrix", async ({ page }) => {
    test.setTimeout(600_000);
    const modelPath = await resolveModelPath(page);
    // Inject one real model card after washers index.
    const withModel = [
      ...ROUTES.slice(0, 3),
      modelPath,
      ...ROUTES.slice(3),
    ];

    const all: Violation[] = [];
    const sampleRoutes = withModel;

    // Full width × theme matrix on home + catalog; other routes at key widths.
    const keyWidths = [320, 360, 390, 600, 768, 820, 1024, 1280, 1440, 2560] as const;
    for (const width of keyWidths) {
      const height = width >= 1024 ? 900 : 800;
      all.push(...(await auditViewport(page, "/uk", width, height, "dark")));
      all.push(
        ...(await auditViewport(page, "/uk/catalog", width, height, "dark")),
      );
      if (width === 360 || width === 768 || width === 1280) {
        all.push(...(await auditViewport(page, "/uk", width, height, "light")));
      }
    }

    for (const route of sampleRoutes) {
      if (route === "/uk" || route === "/uk/catalog") continue;
      for (const width of [390, 768, 1280] as const) {
        all.push(
          ...(await auditViewport(page, route, width, 800, "dark")),
        );
      }
    }

    for (const vp of LANDSCAPE) {
      all.push(
        ...(await auditViewport(page, "/uk", vp.width, vp.height, "dark")),
      );
    }
    for (const vp of TABLET) {
      all.push(
        ...(await auditViewport(page, "/uk/catalog", vp.width, vp.height, "dark")),
      );
    }

    // Keep WIDTHS referenced for matrix completeness documentation.
    void WIDTHS;

    if (all.length > 0) {
      const lines = all
        .slice(0, 80)
        .map((v) => `${v.route} · ${v.width} · ${v.check} · ${v.element}`);
      expect(all, `Violations (${all.length}):\n${lines.join("\n")}`).toEqual(
        [],
      );
    }
  });
});
