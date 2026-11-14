import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type ModelBreadcrumbsProps = {
  label: string;
  catalogLabel: string;
  catalogHref: string;
  categoryLabel: string;
  categoryHref: string;
  modelName: string;
};

/** Server breadcrumbs. Filter return uses browser Back + scroll restore. */
export function ModelBreadcrumbs({
  label,
  catalogLabel,
  catalogHref,
  categoryLabel,
  categoryHref,
  modelName,
}: ModelBreadcrumbsProps) {
  return (
    <Breadcrumbs
      label={label}
      items={[
        { label: catalogLabel, href: catalogHref },
        { label: categoryLabel, href: categoryHref },
        { label: modelName },
      ]}
    />
  );
}
