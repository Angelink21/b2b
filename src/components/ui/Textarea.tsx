import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({
  className = "",
  invalid = false,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      className={`control control-textarea ${invalid ? "is-invalid" : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
