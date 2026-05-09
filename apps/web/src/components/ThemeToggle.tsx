"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  /** localStorage key — use 'diq_pub_theme' for public pages, 'diq_dash_theme' for dashboard */
  storageKey: string;
  /** 'icon' = square icon button | 'pill' = icon + label | 'sidebar' = compact sidebar style */
  variant?: "icon" | "pill" | "sidebar";
}

export function ThemeToggle({
  storageKey,
  variant = "icon",
}: ThemeToggleProps) {
  const { isDark, toggle } = useTheme(storageKey);

  if (variant === "sidebar") {
    return (
      <button
        onClick={toggle}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--color-text-tertiary)",
          cursor: "pointer",
          transition: "color 0.15s, background 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-text-primary)";
          e.currentTarget.style.background =
            "var(--color-background-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--color-text-tertiary)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 13px",
          borderRadius: 20,
          border: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border-primary)";
          e.currentTarget.style.color = "var(--color-text-primary)";
          e.currentTarget.style.background = "var(--color-background-tertiary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border-secondary)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
          e.currentTarget.style.background =
            "var(--color-background-secondary)";
        }}
      >
        {isDark ? <Sun size={13} /> : <Moon size={13} />}
        {isDark ? "Light" : "Dark"}
      </button>
    );
  }

  // Default: icon square button
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 9,
        border: "1px solid var(--color-border-secondary)",
        background: "var(--color-background-secondary)",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-primary)";
        e.currentTarget.style.color = "var(--color-text-primary)";
        e.currentTarget.style.background = "var(--color-background-tertiary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-secondary)";
        e.currentTarget.style.color = "var(--color-text-secondary)";
        e.currentTarget.style.background = "var(--color-background-secondary)";
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
