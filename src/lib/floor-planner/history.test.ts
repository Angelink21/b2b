import { describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
  createHistory,
  HISTORY_MAX,
  pushHistory,
  redoHistory,
  undoHistory,
} from "./history";

describe("floor-planner history", () => {
  it("undoes and redoes discrete steps", () => {
    let state = createHistory({ x: 0 });
    state = pushHistory(state, { x: 1 });
    state = pushHistory(state, { x: 2 });
    expect(state.present).toEqual({ x: 2 });
    expect(canUndo(state)).toBe(true);

    state = undoHistory(state);
    expect(state.present).toEqual({ x: 1 });
    expect(canRedo(state)).toBe(true);

    state = redoHistory(state);
    expect(state.present).toEqual({ x: 2 });
  });

  it("caps past stack at HISTORY_MAX", () => {
    let state = createHistory(0);
    for (let i = 1; i <= HISTORY_MAX + 5; i += 1) {
      state = pushHistory(state, i);
    }
    expect(state.past.length).toBe(HISTORY_MAX);
    expect(state.present).toBe(HISTORY_MAX + 5);
    expect(state.past[0]).toBe(5);
  });

  it("clears future on new push after undo", () => {
    let state = createHistory("a");
    state = pushHistory(state, "b");
    state = pushHistory(state, "c");
    state = undoHistory(state);
    state = pushHistory(state, "d");
    expect(state.present).toBe("d");
    expect(canRedo(state)).toBe(false);
    state = undoHistory(state);
    expect(state.present).toBe("b");
  });
});
