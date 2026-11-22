/** Query keys that turn catalog / compare / quote into filter or selection URLs. */
export const INDEX_BLOCKING_QUERY_KEYS = [
  "kg",
  "type",
  "heat",
  "w",
  "d",
  "h",
  "m",
  "sector",
  "sort",
] as const;

export type SearchParamsLike = Record<
  string,
  string | string[] | undefined
>;

export function hasIndexBlockingParams(
  searchParams: SearchParamsLike | undefined,
): boolean {
  if (!searchParams) return false;
  for (const key of INDEX_BLOCKING_QUERY_KEYS) {
    const value = searchParams[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.some((item) => item.trim().length > 0)) return true;
      continue;
    }
    if (value.trim().length > 0) return true;
  }
  return false;
}

export const NOINDEX_FOLLOW = {
  index: false,
  follow: true,
} as const;
