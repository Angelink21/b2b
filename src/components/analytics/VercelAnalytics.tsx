"use client";

import { Analytics } from "@vercel/analytics/react";

/** Cookie-less Vercel Analytics (no consent banner required). */
export function VercelAnalytics() {
  return <Analytics />;
}
