"use client";

import { CompareToggle } from "@/components/compare/CompareToggle";
import { Link } from "@/i18n/navigation";

export type ModelFamilySwitcherMember = {
  slug: string;
  category: string;
  label: string;
  current: boolean;
  diffNote: string | null;
};

type ModelFamilySwitcherProps = {
  members: ModelFamilySwitcherMember[];
  heading: string;
};

export function ModelFamilySwitcher({
  members,
  heading,
}: ModelFamilySwitcherProps) {
  if (members.length <= 1) return null;

  return (
    <section className="model-family" aria-labelledby="model-family-heading">
      <h2 id="model-family-heading">{heading}</h2>
      <ul className="model-family-list">
        {members.map((member) => (
          <li key={member.slug} className="model-family-row">
            <div className="model-family-main">
              {member.current ? (
                <span className="model-family-current" aria-current="page">
                  {member.label}
                </span>
              ) : (
                <Link
                  href={`/catalog/${member.category}/${member.slug}`}
                  className="model-family-link"
                >
                  {member.label}
                </Link>
              )}
              {member.diffNote ? (
                <span className="model-family-diff">{member.diffNote}</span>
              ) : null}
            </div>
            <CompareToggle slug={member.slug} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}
