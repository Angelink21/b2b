import type { ReactNode } from "react";

import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import {
  CompareProvider,
  type CompareTrayItem,
} from "@/components/compare/CompareProvider";
import { CompareTray } from "@/components/compare/CompareTray";
import { GlobalSearchMount } from "@/components/search/GlobalSearchMount";
import { getAll } from "@/lib/catalog/queries";
import { getModelImage } from "@/lib/images";

import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileActionBar } from "./MobileActionBar";
import { SiteChromeProvider } from "./SiteChromeContext";
import { SkipLink } from "./SkipLink";

type SiteShellProps = {
  children: ReactNode;
};

export async function SiteShell({ children }: SiteShellProps) {
  const products = await getAll();
  const itemsBySlug: Record<string, CompareTrayItem> = {};
  for (const product of products) {
    const photo = getModelImage(product);
    itemsBySlug[product.slug] = {
      slug: product.slug,
      name: product.name,
      category: product.category,
      thumbSrc: photo?.url ?? null,
      thumbW: photo?.width ?? 40,
      thumbH: photo?.height ?? 40,
    };
  }

  return (
    <SiteChromeProvider>
      <CompareProvider itemsBySlug={itemsBySlug}>
        <SkipLink />
        <Header />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
        <GlobalSearchMount />
        <CompareTray />
        <MobileActionBar />
        <VercelAnalytics />
      </CompareProvider>
    </SiteChromeProvider>
  );
}
