const RETURN_KEY = "fagor:catalog:return";
const SCROLL_KEY = "fagor:catalog:scroll";

export type CatalogReturnState = {
  pathname: string;
  search: string;
  scrollY: number;
};

export function saveCatalogReturn(state: CatalogReturnState): void {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(state));
    sessionStorage.setItem(SCROLL_KEY, String(state.scrollY));
  } catch {
    // ignore quota / private mode
  }
}

export function readCatalogReturn(): CatalogReturnState | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogReturnState;
    if (
      typeof parsed.pathname !== "string" ||
      typeof parsed.search !== "string"
    ) {
      return null;
    }
    return {
      pathname: parsed.pathname,
      search: parsed.search,
      scrollY:
        typeof parsed.scrollY === "number"
          ? parsed.scrollY
          : Number(sessionStorage.getItem(SCROLL_KEY) ?? 0) || 0,
    };
  } catch {
    return null;
  }
}

export function consumeCatalogScroll(): number | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw == null) return null;
    sessionStorage.removeItem(SCROLL_KEY);
    const y = Number(raw);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}
