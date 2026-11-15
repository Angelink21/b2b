import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { typo } from "@/lib/typo";

function typoNode(node: ReactNode): ReactNode {
  return typeof node === "string" ? typo(node) : node;
}

type RowProps = {
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  media?: ReactNode;
  href?: string;
  className?: string;
};

export function Row({ title, body, meta, media, href, className = "" }: RowProps) {
  const content = (
    <>
      {media ? <span className="row-media">{media}</span> : null}
      <b className="row-title">{typoNode(title)}</b>
      {body ? <span className="row-body">{typoNode(body)}</span> : null}
      {meta ? <i className="row-meta">{typoNode(meta)}</i> : null}
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
  return <div className={`page-grid rows ${className}`.trim()}>{children}</div>;
}
