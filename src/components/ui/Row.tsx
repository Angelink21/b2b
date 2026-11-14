import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type RowProps = {
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  href?: string;
  className?: string;
};

export function Row({ title, body, meta, href, className = "" }: RowProps) {
  const content = (
    <>
      <b className="row-title">{title}</b>
      {body ? <span className="row-body">{body}</span> : <span />}
      {meta ? <i className="row-meta">{meta}</i> : <span />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`row ${className}`.trim()}>
        {content}
      </Link>
    );
  }

  return <div className={`row ${className}`.trim()}>{content}</div>;
}

export function RowList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rows ${className}`.trim()}>{children}</div>;
}
