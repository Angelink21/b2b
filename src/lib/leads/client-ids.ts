"use client";

import { useEffect, useState } from "react";

/** Anti-spam timestamps must not run during prerender (Cache Components). */
export function useLeadClientMeta() {
  const [startedAt, setStartedAt] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    // Defer out of the effect body (lint: set-state-in-effect).
    const frame = window.requestAnimationFrame(() => {
      setStartedAt(String(Date.now()));
      setIdempotencyKey(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return { startedAt, idempotencyKey, ready: Boolean(startedAt && idempotencyKey) };
}
