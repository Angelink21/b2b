import type { ReactNode } from "react";
import { Container } from "./Container";

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Wrap content in Container (default true). */
  contained?: boolean;
};

export function Section({
  children,
  id,
  className = "",
  contained = true,
}: SectionProps) {
  const inner = contained ? <Container>{children}</Container> : children;
  return (
    <section id={id} className={`section ${className}`.trim()}>
      {inner}
    </section>
  );
}

export { Container } from "./Container";
