export type CaseEntry = {
  slug: string;
  title: string;
};

/**
 * Case studies live under content/cases.
 * Empty directory → home cases section stays hidden.
 */
export function listCases(): CaseEntry[] {
  return [];
}
