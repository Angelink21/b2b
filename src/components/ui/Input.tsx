import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({
  className = "",
  invalid = false,
  ...rest
}: InputProps) {
  return (
    <input
      className={`control ${invalid ? "is-invalid" : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
