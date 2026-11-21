import { Suspense, type ReactNode } from "react";

import { CompareTray } from "@/components/compare/CompareTray";
import { getIndex } from "@/lib/catalog/queries";

type CatalogLayoutProps = {
  children: ReactNode;
};

export default async function CatalogLayout({ children }: CatalogLayoutProps) {
  const index = await getIndex();
  const itemsBySlug = Object.fromEntries(
    index.map((item) => [
      item.slug,
      { slug: item.slug, name: item.name, category: item.category },
    ]),
  );

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <CompareTray itemsBySlug={itemsBySlug} />
      </Suspense>
    </>
  );
}
