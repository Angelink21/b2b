/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";

import { pushDataLayerEvent } from "./data-layer";

afterEach(() => {
  delete window.dataLayer;
});

describe("pushDataLayerEvent", () => {
  it("creates dataLayer and pushes the event name", () => {
    pushDataLayerEvent("quote_success", { models: 2 });
    expect(window.dataLayer).toEqual([
      { event: "quote_success", models: 2 },
    ]);
  });
});
