import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { deferAsyncChunks, PAINT_GAP_MS } = require("./defer-chunks.cjs") as {
  deferAsyncChunks: (html: string) => string;
  PAINT_GAP_MS: number;
};

describe("deferAsyncChunks", () => {
  it("moves async framework chunks to after the first paint", () => {
    const html = `<!DOCTYPE html><html><head></head><body><script src="/_next/static/chunks/app.js" async=""></script><h1>Hi</h1><script>self.__next_f.push([0])</script></body></html>`;
    const out = deferAsyncChunks(html);
    expect(out).not.toContain('<script src="/_next/static/chunks/app.js" async="">');
    expect(out.indexOf("setTimeout(load,")).toBeLessThan(out.indexOf("<h1>"));
    expect(out).toContain("self.__next_f.push([0])");
    expect(out).toContain(`setTimeout(load,${PAINT_GAP_MS})`);
    expect(out).toContain("/_next/static/chunks/app.js");
  });

  it("leaves documents without async chunks unchanged", () => {
    const html = "<html><body><h1>Hi</h1></body></html>";
    expect(deferAsyncChunks(html)).toBe(html);
  });
});
