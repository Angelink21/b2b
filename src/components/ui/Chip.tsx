"use client";

import type { ButtonHTMLAttributes } from "react";

type ChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-pressed" | "type"
> & {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

export function Chip({
  pressed = false,
  onPressedChange,
  onClick,
  className = "",
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      className={`chip ${className}`.trim()}
      aria-pressed={pressed}
      onClick={(event) => {
        onPressedChange?.(!pressed);
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
