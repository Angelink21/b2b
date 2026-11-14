import {
  readThemePreference,
  resolveTheme,
  type ThemePreference,
  writeThemePreference,
} from "./storage";

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getThemePreference(): ThemePreference {
  return readThemePreference();
}

export function getServerThemePreference(): ThemePreference {
  return "system";
}

export function setThemePreference(value: ThemePreference): void {
  writeThemePreference(value);
  applyTheme(value);
  listeners.forEach((listener) => listener());
}

export function applyTheme(preference: ThemePreference = readThemePreference()): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function cycleThemePreference(): ThemePreference {
  const order: ThemePreference[] = ["light", "dark", "system"];
  const current = readThemePreference();
  const idx = order.indexOf(current);
  const next = order[(idx + 1) % order.length] ?? "system";
  setThemePreference(next);
  return next;
}
