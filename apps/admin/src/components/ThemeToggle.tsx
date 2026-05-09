"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: "100%",
        padding: "11px 16px",
        borderRadius: 12,
        border: "1px solid var(--color-border-secondary)",
        background: "transparent",
        color: "var(--color-text-secondary)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 500,
        transition: "background 0.15s, color 0.15s",
        marginBottom: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-background-secondary)";
        e.currentTarget.style.color = "var(--color-text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--color-text-secondary)";
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
