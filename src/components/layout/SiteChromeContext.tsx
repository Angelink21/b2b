"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SiteChromeContextValue = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  formFocused: boolean;
  setFormFocused: (focused: boolean) => void;
};

const SiteChromeContext = createContext<SiteChromeContextValue | null>(null);

export function SiteChromeProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [formFocused, setFormFocused] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const value = useMemo(
    () => ({
      menuOpen,
      setMenuOpen,
      searchOpen,
      openSearch,
      closeSearch,
      formFocused,
      setFormFocused,
    }),
    [closeSearch, formFocused, menuOpen, openSearch, searchOpen],
  );

  return (
    <SiteChromeContext.Provider value={value}>{children}</SiteChromeContext.Provider>
  );
}

export function useSiteChrome(): SiteChromeContextValue {
  const ctx = useContext(SiteChromeContext);
  if (!ctx) {
    throw new Error("useSiteChrome must be used within SiteChromeProvider");
  }
  return ctx;
}