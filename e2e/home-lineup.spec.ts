import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function setRangeValue(locator: Locator, value: number): Promise<void> {
  await locator.evaluate((el, next) => {
    const input = el as HTMLInputElement & {
      _valueTracker?: { setValue: (v: string) => void };
    };
    const previous = input.value;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, String(next));
    input._valueTracker?.setValue(previous);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function waitForLineup(page: Page): Promise<void> {
  await expect(page.locator(".lineup-stage")).toBeVisible();
  await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });
}

const MODEL_39 = {
  kg: "39",
  path: /\/uk\/catalog\/washers\/la-35c-tp2-e\/?$/,
  name: "LA-35C",
  dims: "1095",
};

test.describe("home lineup", () => {
  test("handles move counter and catalog kg deep link", async ({ page }) => {
    await page.goto("/uk");
    await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible();

    const output = page.locator(".lineup-output");
    await expect(output).toBeVisible();
    const before = (await output.innerText()).trim();

    const ranges = page.locator(".lineup-ruler input[type=range]");
    await expect(ranges).toHaveCount(2);

    // Narrow the window so the model count changes vs the default 330–650 start.
    await setRangeValue(ranges.nth(0), 100);
    await setRangeValue(ranges.nth(1), 200);

    await expect
      .poll(async () => (await output.innerText()).trim(), { timeout: 5000 })
      .not.toBe(before);

    const catalogLink = page.getByRole("link", { name: /Показати в каталозі/i });
    await expect(catalogLink).toHaveAttribute("href", /kg=\d+-\d+/);
    await catalogLink.click();
    await expect(page).toHaveURL(/\/uk\/catalog\?kg=\d+-\d+/);
  });

  test("range strip updates when the load window changes", async ({ page }) => {
    await page.goto("/uk");
    await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible();

    const strip = page.getByTestId("lineup-range-strip");
    const ranges = page.locator(".lineup-ruler input[type=range]");

    await setRangeValue(ranges.nth(0), 450);
    await setRangeValue(ranges.nth(1), 550);

    await expect(strip).toBeVisible({ timeout: 5000 });
    const slugsBefore = await strip
      .locator(".lineup-range-strip-card")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-slug")).filter(Boolean),
      );
    expect(slugsBefore.length).toBeGreaterThan(0);

    await setRangeValue(ranges.nth(0), 50);
    await setRangeValue(ranges.nth(1), 120);

    await expect
      .poll(
        async () =>
          strip
            .locator(".lineup-range-strip-card")
            .evaluateAll((cards) =>
              cards.map((card) => card.getAttribute("data-slug")).join(","),
            ),
        { timeout: 5000 },
      )
      .not.toBe(slugsBefore.join(","));
  });

  test("home is accessible (axe)", async ({ page }) => {
    await page.goto("/uk");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test.describe("machine links @ 1440", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("click, keyboard, hover line, handles, dimmed", async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "desktop once");
      await page.goto("/uk");
      await waitForLineup(page);

      const machines = page.locator(".lineup-machine");
      await expect(machines).toHaveCount(8);
      const machine39 = page.locator(`.lineup-machine[data-kg="${MODEL_39.kg}"]`);
      const note = page.getByTestId("lineup-scale-note");

      await expect(note).toContainText(/Усі машини|масштабі/i);
      const boxBefore = await note.boundingBox();
      expect(boxBefore).toBeTruthy();

      await machine39.hover();
      await expect(note).toContainText(MODEL_39.name);
      await expect(note).toContainText(MODEL_39.dims);
      await expect(note).toContainText(/Відкрити/i);

      const boxAfter = await note.boundingBox();
      expect(boxAfter).toBeTruthy();
      expect(Math.abs((boxAfter?.height ?? 0) - (boxBefore?.height ?? 0))).toBeLessThanOrEqual(
        1,
      );

      await machine39.click();
      await expect(page).toHaveURL(MODEL_39.path);

      await page.goto("/uk");
      await waitForLineup(page);
      const machine39Again = page.locator(
        `.lineup-machine[data-kg="${MODEL_39.kg}"]`,
      );
      await machine39Again.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(MODEL_39.path);

      await page.goto("/uk");
      await waitForLineup(page);
      const urlBeforeHandle = page.url();
      const thumb = page.locator(".lineup-thumb").first();
      const thumbBox = await thumb.boundingBox();
      expect(thumbBox).toBeTruthy();
      await page.mouse.move(
        thumbBox!.x + thumbBox!.width / 2,
        thumbBox!.y + thumbBox!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        thumbBox!.x + thumbBox!.width / 2 + 80,
        thumbBox!.y + thumbBox!.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      await expect(page).toHaveURL(urlBeforeHandle);
      await expect(page).not.toHaveURL(/\/catalog\//);

      const ranges = page.locator(".lineup-ruler input[type=range]");
      await setRangeValue(ranges.nth(0), 0);
      await setRangeValue(ranges.nth(1), 80);
      const dimmed = page.locator(".lineup-machine:not(.is-on)").first();
      await expect(dimmed).toBeVisible();
      const dimmedHref = await dimmed.getAttribute("href");
      expect(dimmedHref).toBeTruthy();
      await dimmed.click();
      await expect(page).toHaveURL(new RegExp(`${dimmedHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`));
    });
  });

  test.describe("machine links @ 390", () => {
    test.use({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });

    test("tap opens model; horizontal scroll does not", async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "touch once");
      await page.goto("/uk");
      await waitForLineup(page);

      const note = page.getByTestId("lineup-scale-note");
      const defaultNote = (await note.innerText()).trim();
      expect(defaultNote.length).toBeGreaterThan(0);

      const machine39 = page.locator(`.lineup-machine[data-kg="${MODEL_39.kg}"]`);
      await machine39.evaluate((el) => {
        el.scrollIntoView({ inline: "center", block: "nearest" });
      });

      const box = await machine39.boundingBox();
      expect(box).toBeTruthy();
      const urlBeforeScroll = page.url();
      // Horizontal drag across the machine — must not navigate.
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await page.mouse.move(box!.x + box!.width / 2 - 90, box!.y + box!.height / 2, {
        steps: 10,
      });
      await page.mouse.up();
      await expect(page).toHaveURL(urlBeforeScroll);
      await expect(note).toHaveText(defaultNote);

      await machine39.tap();
      await expect(page).toHaveURL(MODEL_39.path);
    });
  });
});
