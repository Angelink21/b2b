/** Undo/redo stack for floor-planner plan edits (pure, unit-tested). */

export const HISTORY_MAX = 30;

export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

export function pushHistory<T>(
  state: HistoryState<T>,
  next: T,
  max: number = HISTORY_MAX,
): HistoryState<T> {
  if (Object.is(state.present, next)) return state;
  const past = [...state.past, state.present];
  while (past.length > max) {
    past.shift();
  }
  return { past, present: next, future: [] };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const previous = state.past[state.past.length - 1];
  if (previous === undefined) return state;
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const next = state.future[0];
  if (next === undefined) return state;
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}

export function canUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0;
}
