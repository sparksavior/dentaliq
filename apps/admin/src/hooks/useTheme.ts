"use client";

import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

function applyThemeClass(t: Theme) {
  const h = document.documentElement;
  h.classList.remove("dark", "light");
  if (t === "dark") h.classList.add("dark");
  else if (t === "light") h.classList.add("light");
}

const STORAGE_KEY = "diq_admin_theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
      setThemeState(saved);
      applyThemeClass(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const compute = () => {
      if (theme === "dark") {
        setIsDark(true);
        return;
      }
      if (theme === "light") {
        setIsDark(false);
        return;
      }
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    compute();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", compute);
    return () => mq.removeEventListener("change", compute);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    applyThemeClass(t);
  }, []);

  const toggle = useCallback(() => {
    const h = document.documentElement;
    const currentlyDark =
      h.classList.contains("dark") ||
      (!h.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(currentlyDark ? "light" : "dark");
  }, [setTheme]);

  return { theme, isDark, setTheme, toggle };
}
