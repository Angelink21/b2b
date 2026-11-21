import metaJson from "@/data/catalog.meta.json";
import { getEnv } from "@/env";
import { getCatalog } from "@/lib/catalog/get-catalog";
import {
  authorizeCatalogStatus,
  buildCatalogStatusPayload,
  type CatalogBuildStatus,
} from "@/lib/catalog/status";

const buildMeta = metaJson as CatalogBuildStatus;

/**
 * Operational catalog health.
 * - No `CATALOG_STATUS_SECRET` → 404 (disabled).
 * - Wrong/missing Bearer → 401.
 * - OK → build snapshot meta + runtime meta from `getCatalog()` (no sheet URL).
 */
export async function GET(request: Request): Promise<Response> {
  const auth = authorizeCatalogStatus(
    request.headers.get("authorization"),
    getEnv().catalogStatusSecret,
  );
  if (!auth.ok) {
    return new Response(null, { status: auth.status });
  }

  const catalog = await getCatalog();
  const payload = buildCatalogStatusPayload(
    {
      builtAt: buildMeta.builtAt,
      modelCount: buildMeta.modelCount,
      source: buildMeta.source,
    },
    catalog,
  );

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
