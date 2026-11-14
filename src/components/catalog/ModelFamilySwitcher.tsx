import { Link } from "@/i18n/navigation";
import type { FamilyMemberSummary } from "@/lib/catalog/family-diff";

type ModelFamilySwitcherProps = {
  currentSlug: string;
  members: FamilyMemberSummary[];
  heading: string;
  differsIn: (fields: string) => string;
  fieldLabels: Record<string, string>;
};

export function ModelFamilySwitcher({
  currentSlug,
  members,
  heading,
  differsIn,
  fieldLabels,
}: ModelFamilySwitcherProps) {
  if (members.length <= 1) return null;

  return (
    <section className="model-family" aria-labelledby="model-family-heading">
      <h2 id="model-family-heading">{heading}</h2>
      <ul className="model-family-list">
        {members.map((member) => {
          const current = member.slug === currentSlug;
          const label = member.variantLabel?.trim() || member.name;
          const diffNote =
            !current && member.differingFields.length > 0
              ? differsIn(
                  member.differingFields
                    .map((f) => fieldLabels[f] ?? f)
                    .join(", "),
                )
              : null;

          return (
            <li key={member.slug}>
              {current ? (
                <span className="model-family-current" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={`/catalog/${member.category}/${member.slug}`}
                  className="model-family-link"
                >
                  {label}
                </Link>
              )}
              {diffNote ? (
                <span className="model-family-diff">{diffNote}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
