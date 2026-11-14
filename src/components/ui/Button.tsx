import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type ButtonVariant = "primary" | "secondary" | "link";
type ButtonSize = "md" | "sm";

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  disabled?: boolean;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function buttonClassName({
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
}): string {
  const parts = ["btn"];
  if (variant === "primary") parts.push("btn-red");
  if (variant === "link") parts.push("btn-link");
  if (size === "sm") parts.push("btn-sm");
  if (loading) parts.push("is-loading");
  if (className) parts.push(className);
  return parts.join(" ");
}

export function Button(props: ButtonProps) {
  const {
    children,
    variant = "secondary",
    size = "md",
    loading = false,
    className = "",
  } = props;
  const cls = buttonClassName({ variant, size, loading, className });

  if ("href" in props && props.href !== undefined) {
    const { href, disabled } = props;
    if (disabled || loading) {
      return (
        <span className={`${cls} is-disabled`} aria-disabled="true">
          {children}
          {variant === "link" ? (
            <span className="btn-arrow" aria-hidden="true">
              {" "}
              →
            </span>
          ) : null}
        </span>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
        {variant === "link" ? (
          <span className="btn-arrow" aria-hidden="true">
            {" "}
            →
          </span>
        ) : null}
      </Link>
    );
  }

  const {
    disabled,
    type = "button",
    children: _children,
    variant: _variant,
    size: _size,
    loading: _loading,
    className: _className,
    ...rest
  } = props as ButtonAsButton;

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
      {variant === "link" ? (
        <span className="btn-arrow" aria-hidden="true">
          {" "}
          →
        </span>
      ) : null}
    </button>
  );
}
