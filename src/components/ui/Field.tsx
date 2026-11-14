import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  id,
  label,
  hint,
  error,
  className = "",
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field ${error ? "is-invalid" : ""} ${className}`.trim()}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div data-describedby={describedBy}>{children}</div>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Pass describedBy from Field via cloning — helpers for controls. */
export function fieldAria(
  id: string,
  opts: { hint?: string; error?: string },
): {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
} {
  const ids = [
    opts.hint ? `${id}-hint` : null,
    opts.error ? `${id}-error` : null,
  ].filter(Boolean) as string[];
  return {
    id,
    ...(opts.error ? { "aria-invalid": true as const } : {}),
    ...(ids.length > 0 ? { "aria-describedby": ids.join(" ") } : {}),
  };
}
