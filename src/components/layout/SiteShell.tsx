import type { ReactNode } from "react";
import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import { GlobalSearchMount } from "@/components/search/GlobalSearchMount";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileActionBar } from "./MobileActionBar";
import { SiteChromeProvider } from "./SiteChromeContext";
import { SkipLink } from "./SkipLink";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <SiteChromeProvider>
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
      <GlobalSearchMount />
      <MobileActionBar />
      <VercelAnalytics />
    </SiteChromeProvider>
  );
}
