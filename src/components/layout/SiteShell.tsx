import type { ReactNode } from "react";

import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import {
  CompareProvider,
  type CompareTrayItem,
} from "@/components/compare/CompareProvider";
import { CompareTray } from "@/components/compare/CompareTray";
import { GlobalSearchMount } from "@/components/search/GlobalSearchMount";
import { getAll } from "@/lib/catalog/queries";
import {
  buildCloudinaryUrl,
  getImagesCloudName,
  getModelImage,
} from "@/lib/images";

import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileActionBar } from "./MobileActionBar";
import { SiteChromeProvider } from "./SiteChromeContext";
import { SkipLink } from "./SkipLink";

/** 2× delivery for the ~44px tray thumb well. */
const COMPARE_TRAY_THUMB_WIDTH = 96;

type SiteShellProps = {
  children: ReactNode;
};

export async function SiteShell({ children }: SiteShellProps) {
  const products = await getAll();
  const cloudName = getImagesCloudName();
  const itemsBySlug: Record<string, CompareTrayItem> = {};
  for (const product of products) {
    const photo = getModelImage(product);
    const thumbSrc =
      photo?.publicId && cloudName
        ? buildCloudinaryUrl(cloudName, photo.publicId, COMPARE_TRAY_THUMB_WIDTH, {
            extraTransforms: "e_trim",
          })
        : null;
    itemsBySlug[product.slug] = {
      slug: product.slug,
      name: product.name,
      category: product.category,
      thumbSrc,
      thumbW: photo?.trimWidth ?? photo?.width ?? 44,
      thumbH: photo?.trimHeight ?? photo?.height ?? 44,
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
