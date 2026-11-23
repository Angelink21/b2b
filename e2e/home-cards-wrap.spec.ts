import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [
  360, 390, 600, 768, 1024, 1180, 1280, 1366, 1440, 1536, 1600, 1920,
] as const;

function expectedAdvantageCols(width: number): number {
  if (width < 640) return 1;
  if (width < 1600) return 2;
  return 4;
}

async function advantageColumnCount(page: Page): Promise<number> {
  return page.locator(".advantages-bento").evaluate((el) => {
    const kids = [...el.children] as HTMLElement[];
    if (kids.length === 0) return 0;
    const top0 = kids[0]!.offsetTop;
    return kids.filter((k) => Math.abs(k.offsetTop - top0) <= 1).length;
  });
}

/** Returns a mid-wrapped word if any token spans multiple line boxes. */
async function findMidWordBreak(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.nodeValue ?? "";
      for (const match of value.matchAll(/[\p{L}\p{N}ʼ''-]{4,}/gu)) {
        const start = match.index ?? 0;
        const word = match[0]!;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + word.length);
        const rects = [...range.getClientRects()].filter(
          (r) => r.width > 0.5 && r.height > 0.5,
        );
        const tops = new Set(rects.map((r) => Math.round(r.top)));
        if (tops.size > 1) return word;
      }
      node = walker.nextNode();
    }
    return null;
  });
}

test.describe("home cards wrap and grids", () => {
  for (const width of WIDTHS) {
    test(`advantages + steps @ ${width}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "layout once");
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/uk");
      await expect(page.locator(".advantages-bento")).toBeVisible();
      await expect(page.locator(".process-steps")).toBeVisible();

      const cols = await advantageColumnCount(page);
      expect(cols).toBe(expectedAdvantageCols(width));

      const cards = page.locator(".advantages-card");
      await expect(cards).toHaveCount(4);

      const rowTops = await cards.evaluateAll((els) => {
        const tops = els.map((el) => (el as HTMLElement).offsetTop);
        const groups = new Map<number, number[]>();
        for (let i = 0; i < els.length; i += 1) {
          const t = tops[i]!;
          const key = [...groups.keys()].find((k) => Math.abs(k - t) <= 1) ?? t;
          const list = groups.get(key) ?? [];
          list.push(els[i]!.getBoundingClientRect().height);
          groups.set(key, list);
        }
        return [...groups.values()];
      });
      for (const heights of rowTops) {
        const min = Math.min(...heights);
        const max = Math.max(...heights);
        expect(max - min).toBeLessThanOrEqual(1);
      }

      // 2×2: body text ≥360px once the column is wide enough (≥1024).
      // 4-up keeps card ≥300px, so text naturally stays under 360 — skip there.
      if (cols === 2 && width >= 1024) {
        for (let i = 0; i < 4; i += 1) {
          const textBox = await cards.nth(i).locator("p").boundingBox();
          expect(textBox).toBeTruthy();
          expect(textBox!.width).toBeGreaterThanOrEqual(360);
        }
      }

      for (let i = 0; i < 4; i += 1) {
        const broken = await findMidWordBreak(
          page,
          `.advantages-card:nth-child(${i + 1})`,
        );
        expect(broken, `advantages card ${i} broke “${broken}”`).toBeNull();
      }

      const steps = page.locator(".process-step");
      await expect(steps).toHaveCount(4);
      const indexLefts = await steps.evaluateAll((els) =>
        els.map((el) => {
          const idx = el.querySelector(".process-step-index");
          return idx?.getBoundingClientRect().left ?? -1;
        }),
      );
      const titleLefts = await steps.evaluateAll((els) =>
        els.map((el) => {
          const h = el.querySelector("h3");
          return h?.getBoundingClientRect().left ?? -1;
        }),
      );
      const indexMin = Math.min(...indexLefts);
      const indexMax = Math.max(...indexLefts);
      const titleMin = Math.min(...titleLefts);
      const titleMax = Math.max(...titleLefts);
      expect(indexMax - indexMin).toBeLessThanOrEqual(1);
      expect(titleMax - titleMin).toBeLessThanOrEqual(1);

      for (let i = 0; i < 4; i += 1) {
        const broken = await findMidWordBreak(
          page,
          `.process-step:nth-child(${i + 1})`,
        );
        expect(broken, `process step ${i} broke “${broken}”`).toBeNull();
      }

      const cases = page.locator(".cases-row");
      const caseCount = await cases.count();
      for (let i = 0; i < caseCount; i += 1) {
        const broken = await findMidWordBreak(
          page,
          `.cases-row:nth-child(${i + 1})`,
        );
        expect(broken, `cases row ${i} broke “${broken}”`).toBeNull();
      }

      const flagships = page.locator(".flagship-card");
      const flagCount = await flagships.count();
      for (let i = 0; i < flagCount; i += 1) {
        const broken = await findMidWordBreak(
          page,
          `.flagship-card:nth-child(${i + 1}) h3`,
        );
        // Model codes may use anywhere; still must not hyphenate mid-syllable via hyphens:auto
        const hyphens = await flagships
          .nth(i)
          .locator("h3")
          .evaluate((el) => getComputedStyle(el).hyphens);
        expect(hyphens === "manual" || hyphens === "none").toBe(true);
        if (broken && !/[-/]/.test(broken) && broken.length <= 14) {
          expect(broken, `flagship broke “${broken}”`).toBeNull();
        }
      }
    });
  }
});
