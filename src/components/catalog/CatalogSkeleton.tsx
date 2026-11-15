/** Keep in sync with `CATALOG_PAGE_SIZE` in `src/lib/catalog/search-params.ts`. */
const SKELETON_ROW_COUNT = 60;

/**
 * Static shell for the catalog Suspense boundary. Height must match the
 * hydrated explorer (~60 table rows + toolbar) so the footer does not shift
 * when the client island streams in (Lighthouse CLS on /catalog).
 */
export function CatalogSkeleton() {
  return (
    <div className="catalog-skeleton" aria-busy="true">
      <div className="catalog-skeleton-toolbar" aria-hidden="true">
        <span className="catalog-skeleton-chip" />
        <span className="catalog-skeleton-chip catalog-skeleton-chip--wide" />
      </div>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div key={index} className="catalog-skeleton-row">
          <span />
        </div>
      ))}
    </div>
  );
}
