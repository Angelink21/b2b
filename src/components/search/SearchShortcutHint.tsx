"use client";

import { useSyncExternalStore } from "react";

function detectShortcut(): string {
  if (typeof navigator === "undefined") return "Ctrl+K";
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  const isApple =
    /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/i.test(ua);
  return isApple ? "⌘K" : "Ctrl+K";
}

function subscribeNoop(): () => void {
  return () => undefined;
}

/**
 * Platform shortcut after mount (avoids hydration mismatch).
 * Server snapshot is empty; client snapshot is ⌘K / Ctrl+K.
 */
export function SearchShortcutHint({ className = "" }: { className?: string }) {
  const shortcut = useSyncExternalStore(
    subscribeNoop,
    detectShortcut,
    () => "",
  );

  if (!shortcut) {
    return (
      <span className={className} aria-hidden="true">
        {"\u00a0"}
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {shortcut}
    </span>
  );
}

export function useSearchShortcutLabel(): string {
  return useSyncExternalStore(subscribeNoop, detectShortcut, () => "Ctrl+K");
}
