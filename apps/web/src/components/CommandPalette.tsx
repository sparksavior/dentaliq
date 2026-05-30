"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  type: "page" | "patient" | "code";
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
}

const PAGES: SearchResult[] = [
  {
    id: "p-overview",
    type: "page",
    title: "Overview",
    subtitle: "Dashboard home",
    href: "/dashboard",
    icon: "🏠",
  },
  {
    id: "p-estimates",
    type: "page",
    title: "Estimates",
    subtitle: "Cost estimator",
    href: "/dashboard/estimates",
    icon: "📊",
  },
  {
    id: "p-claims",
    type: "page",
    title: "Claims",
    subtitle: "Claim management",
    href: "/dashboard/claims",
    icon: "📄",
  },
  {
    id: "p-patients",
    type: "page",
    title: "Patients",
    subtitle: "Patient records",
    href: "/dashboard/patients",
    icon: "👥",
  },
  {
    id: "p-analytics",
    type: "page",
    title: "Analytics",
    subtitle: "Practice metrics",
    href: "/dashboard/analytics",
    icon: "📈",
  },
  {
    id: "p-settings",
    type: "page",
    title: "Settings",
    subtitle: "Clinic configuration",
    href: "/dashboard/settings",
    icon: "⚙️",
  },
  {
    id: "p-billing",
    type: "page",
    title: "Billing",
    subtitle: "Subscription & payment",
    href: "/dashboard/billing",
    icon: "💳",
  },
  {
    id: "p-support",
    type: "page",
    title: "Support",
    subtitle: "Help & tickets",
    href: "/dashboard/support",
    icon: "❓",
  },
  {
    id: "p-cortex",
    type: "page",
    title: "Cortex Agents",
    subtitle: "AI command center",
    href: "/dashboard/cortex",
    icon: "🧠",
  },
  {
    id: "p-inbox",
    type: "page",
    title: "Approval Inbox",
    subtitle: "Agent task queue",
    href: "/dashboard/cortex/inbox",
    icon: "📥",
  },
];

interface CommandPaletteProps {
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  }[];
  cdtCodes?: { code: string; description: string; category: string }[];
}

export function CommandPalette({ patients, cdtCodes }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useCallback((): SearchResult[] => {
    if (!query.trim()) return PAGES.slice(0, 6);
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    // Pages
    PAGES.forEach((p) => {
      if (
        p.title.toLowerCase().includes(q) ||
        (p.subtitle ?? "").toLowerCase().includes(q)
      ) {
        items.push(p);
      }
    });

    // Patients
    patients.forEach((p) => {
      const name = `${p.first_name} ${p.last_name}`;
      if (
        name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q)
      ) {
        items.push({
          id: `pt-${p.id}`,
          type: "patient",
          title: name,
          subtitle: p.email || p.phone || undefined,
          href: `/dashboard/patients/${p.id}`,
          icon: "🧑‍⚕️",
        });
      }
    });

    // CDT codes
    if (cdtCodes) {
      cdtCodes.forEach((c) => {
        if (
          c.code.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        ) {
          items.push({
            id: `cdt-${c.code}`,
            type: "code",
            title: c.code,
            subtitle: c.description,
            href: `/dashboard/estimates`,
            icon: "🩺",
          });
        }
      });
    }

    return items.slice(0, 12);
  }, [query, patients, cdtCodes])();

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[selectedIdx]) {
      navigate(results[selectedIdx].href);
    }
  };

  if (!open) return null;

  const TYPE_LABELS: Record<string, string> = {
    page: "Pages",
    patient: "Patients",
    code: "CDT Codes",
  };

  // Group results by type
  const grouped: { type: string; items: SearchResult[] }[] = [];
  results.forEach((r) => {
    const g = grouped.find((g) => g.type === r.type);
    if (g) g.items.push(r);
    else grouped.push({ type: r.type, items: [r] });
  });

  let flatIdx = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--color-background-primary, #1a2332)",
          border:
            "1px solid var(--color-border-secondary, rgba(255,255,255,0.08))",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          animation: "slideIn 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Search input */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom:
              "1px solid var(--color-border-secondary, rgba(255,255,255,0.08))",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="var(--color-text-secondary, #94a3b8)"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, patients, CDT codes..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--color-text-primary, #f1f5f9)",
              fontSize: 15,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 11,
              color: "var(--color-text-tertiary, #64748b)",
              fontFamily: "inherit",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto", padding: "8px 0" }}>
          {results.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--color-text-tertiary, #64748b)",
                fontSize: 13,
              }}
            >
              No results found
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.type}>
                <div
                  style={{
                    padding: "8px 20px 4px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-text-tertiary, #64748b)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {TYPE_LABELS[group.type] || group.type}
                </div>
                {group.items.map((item) => {
                  const thisIdx = flatIdx++;
                  const isSelected = thisIdx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIdx(thisIdx)}
                      style={{
                        width: "100%",
                        padding: "10px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        background: isSelected
                          ? "rgba(20,184,166,0.12)"
                          : "transparent",
                        transition: "background 0.08s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          flexShrink: 0,
                          width: 28,
                          textAlign: "center",
                        }}
                      >
                        {item.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: isSelected
                              ? "var(--color-accent, #14b8a6)"
                              : "var(--color-text-primary, #f1f5f9)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-tertiary, #64748b)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-tertiary, #64748b)",
                          }}
                        >
                          Enter ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop:
              "1px solid var(--color-border-secondary, rgba(255,255,255,0.08))",
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 11,
            color: "var(--color-text-tertiary, #64748b)",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
