import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type Crumb = {
  label: ReactNode;
  href?: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
  label: string;
  className?: string;
};

export function Breadcrumbs({ items, label, className = "" }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={label} className={`crumbs ${className}`.trim()}>
      <ol className="crumbs-list">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${index}-${typeof item.label === "string" ? item.label : index}`}>
              {item.href && !last ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
              {!last ? (
                <span className="crumbs-sep" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
