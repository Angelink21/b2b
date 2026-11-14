import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Source_Sans_3, Spectral } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { MOTION_LEVEL } from "@/config/motion";
import { routing } from "@/i18n/routing";
import { metadataBaseUrl } from "@/lib/seo/metadata";
import "../globals.css";

const spectral = Spectral({
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: ["300", "400"],
  variable: "--font-spectral",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
  display: "swap",
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: metadataBaseUrl(),
    title: {
      default: t("siteName"),
      template: `%s · ${t("siteName")}`,
    },
    description: t("homeDescription"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-theme="light"
      data-motion-level={MOTION_LEVEL}
      className={`${spectral.variable} ${sourceSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <NuqsAdapter>
            <SiteShell>{children}</SiteShell>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
