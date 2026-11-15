import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";

type ClsWindow = Window & { __cls: number };

async function waitForNav(page: Page) {
  await expect(page.locator(".site-header")).toHaveAttribute("data-nav-ready", "true");
}

async function installClsProbe(page: Page) {
  await page.addInitScript(() => {
    const target = window as ClsWindow;
    target.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType !== "layout-shift") continue;
        const shift = entry as LayoutShift;
        if (!shift.hadRecentInput) target.__cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

test.describe("header navigation", () => {
  test("keyboard walks the desktop nav and Esc closes the mega menu", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop nav");
    await page.goto("/uk");
    await waitForNav(page);
    const nav = page.locator(".site-nav-desktop");
    const catalog = nav.getByRole("button", { name: "Каталог", exact: true });

    await page.locator(".site-brand").focus();
    await page.keyboard.press("Tab");
    await expect(catalog).toBeFocused();
    const mega = page.locator("#catalog-mega");
    await expect(mega).toBeVisible();

    const megaLinks = mega.locator("a");
    await expect(megaLinks).toHaveCount(9);
    await expect(mega.getByRole("link", { name: /Пральні машини/ })).toContainText(
      "кг",
    );
    await expect(
      mega.getByRole("link", { name: /Прасувальні катки/ }),
    ).not.toContainText("кг");

    // This WebKit build tabs between buttons and skips links.
    if (testInfo.project.name === "webkit") {
      await megaLinks.first().focus();
      await expect(megaLinks.first()).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(catalog).toBeFocused();
      await expect(mega).toBeHidden();
      await catalog.focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: /Тема/ })).toBeFocused();
      return;
    }

    for (let i = 0; i < 9; i += 1) {
      await page.keyboard.press("Tab");
      await expect(megaLinks.nth(i)).toBeFocused();
    }

    await page.keyboard.press("Escape");
    await expect(catalog).toBeFocused();
    await expect(mega).toBeHidden();

    for (const name of ["Галузі", "Сервіс та підтримка", "Про компанію", "Контакти"]) {
      await page.keyboard.press("Tab");
      await expect(nav.getByRole("link", { name, exact: true })).toBeFocused();
    }

    const header = page.locator(".site-header");
    await page.keyboard.press("Tab");
    await expect(header.getByRole("link", { name: "UA", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(header.getByRole("link", { name: "EN", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(header.getByRole("button", { name: /Тема/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      header.getByRole("link", { name: "Отримати КП", exact: true }),
    ).toBeFocused();
  });

  test("catalog button is current on category pages", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop nav");
    await page.goto("/uk/catalog/washers");
    await waitForNav(page);
    await expect(
      page.locator(".site-nav-desktop").getByRole("button", { name: "Каталог" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("stub pages are reachable and mark the current item", async ({
    page,
  }, testInfo) => {
    await page.goto("/uk/contacts");
    await waitForNav(page);
    await expect(page.getByRole("heading", { level: 1, name: "Контакти" })).toBeVisible();
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Меню" }).click();
      await expect(
        page.getByRole("dialog").getByRole("link", { name: "Контакти", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    } else {
      await expect(
        page.locator(".site-nav-desktop").getByRole("link", { name: "Контакти" }),
      ).toHaveAttribute("aria-current", "page");
    }

    for (const path of ["/uk/about", "/uk/service", "/en/about"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("mobile menu traps focus, locks scroll, and Esc returns to the button", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile menu");
    await page.goto("/uk");
    await waitForNav(page);
    const toggle = page.getByRole("button", { name: "Меню" });
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "Меню" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("#main")).toHaveAttribute("inert", "");
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe(
      "hidden",
    );

    await dialog.getByRole("button", { name: "Каталог" }).click();
    await expect(dialog.getByRole("link", { name: /Пральні машини/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Усі моделі" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Прасувальні катки/ })).not.toContainText(
      "кг",
    );

    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const dialogEl = document.getElementById("mobile-menu");
      const toggleEl = document.querySelector(".menu-toggle");
      const active = document.activeElement;
      return Boolean(
        (dialogEl && active && dialogEl.contains(active)) || active === toggleEl,
      );
    });
    expect(inside).toBe(true);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Меню" })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    await expect(page.locator("#main")).not.toHaveAttribute("inert");
  });

  test("mega menu has no axe violations", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop mega menu");
    await page.goto("/uk");
    await waitForNav(page);
    await page.locator(".site-nav-desktop").getByRole("button", { name: "Каталог" }).click();
    await expect(page.locator("#catalog-mega")).toBeVisible();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
  });

  test("header height stays 72px and scroll does not shift layout", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installClsProbe(page);
    await page.goto("/uk");
    await waitForNav(page);
    await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      (window as ClsWindow).__cls = 0;
    });

    const header = page.locator(".site-header");
    const before = await header.boundingBox();
    expect(before).not.toBeNull();
    expect(Math.abs(before!.height - 72)).toBeLessThanOrEqual(0.5);

    const h1Before = await page.locator("h1").boundingBox();
    await page.locator(".quote-teaser").evaluate((el) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - 80));
    });
    await expect(header).toHaveClass(/is-stuck/);

    const after = await header.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.y)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after!.height - 72)).toBeLessThanOrEqual(0.5);

    const h1After = await page.locator("h1").boundingBox();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(
      Math.abs(h1Before!.y - h1After!.y - scrollY),
    ).toBeLessThanOrEqual(1);

    if (testInfo.project.name === "chromium") {
      const cls = await page.evaluate(() => (window as ClsWindow).__cls);
      expect(cls).toBe(0);
    }
  });
});

test.describe("header polish screenshots", () => {
  test("top and scrolled, light and dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "webkit", "chromium and mobile only");
    const width = testInfo.project.name === "mobile" ? 390 : 1440;
    const height = testInfo.project.name === "mobile" ? 844 : 900;
    fs.mkdirSync("docs/qa/p2", { recursive: true });

    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/uk");
      await page.evaluate((value) => {
        localStorage.setItem("fagor-theme", value);
        document.documentElement.setAttribute("data-theme", value);
        document.documentElement.style.colorScheme = value;
      }, theme);
      await page.reload();
      await expect(page.locator(".site-header")).toBeVisible();
      await page.screenshot({
        path: `docs/qa/p2/header-${theme}-${width}-top.png`,
        clip: { x: 0, y: 0, width, height: 160 },
      });

      await page.locator(".quote-teaser").evaluate((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, Math.max(0, top - 72));
      });
      await expect(page.locator(".site-header")).toHaveClass(/is-stuck/);
      await page.screenshot({
        path: `docs/qa/p2/header-${theme}-${width}-scrolled.png`,
        clip: { x: 0, y: 0, width, height: 160 },
      });
    }
  });
});
