/**
 * Case study ids mapped to `home.cases.*` message keys.
 * Empty list → home cases section stays hidden.
 */
export const CASE_IDS = [
  "hotel",
  "healthcare",
  "selfService",
  "central",
] as const;

export type CaseId = (typeof CASE_IDS)[number];

export function listCaseIds(): readonly CaseId[] {
  return CASE_IDS;
}
