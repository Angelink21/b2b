import { notFound } from "next/navigation";

/** Catch unknown locale paths so the branded `[locale]/not-found` shell renders. */
export default function LocaleCatchAllPage() {
  notFound();
}
