import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

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
});
