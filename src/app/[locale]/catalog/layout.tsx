import { Suspense, type ReactNode } from "react";

import { CompareTray } from "@/components/compare/CompareTray";
import { getIndex } from "@/lib/catalog";

type CatalogLayoutProps = {
  children: ReactNode;
};

export default function CatalogLayout({ children }: CatalogLayoutProps) {
  const itemsBySlug = Object.fromEntries(
    getIndex().map((item) => [
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
