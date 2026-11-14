import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({
  className = "",
  invalid = false,
  children,
  ...rest
}: SelectProps) {
  return (
    <select
      className={`control ${invalid ? "is-invalid" : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}
