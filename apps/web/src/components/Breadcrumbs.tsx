"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  estimates: "Estimates",
  patients: "Patients",
  claims: "Claims",
  analytics: "Analytics",
  settings: "Settings",
  support: "Support",
  billing: "Billing",
  cortex: "Cortex",
  inbox: "Inbox",
  hire: "Hire Agents",
};

function isUuidOrId(segment: string): boolean {
  // Match UUIDs, numeric IDs, or other dynamic-looking segments
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    ) ||
    /^\d+$/.test(segment) ||
    (segment.length > 20 && /^[0-9a-f]+$/i.test(segment))
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show breadcrumbs on the main dashboard overview
  if (!pathname || pathname === "/dashboard") {
    return null;
  }

  // Split the path and filter out empty segments and "dashboard" prefix
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items: skip the first segment if it's "dashboard"
  // since we always start with "Dashboard" as the root
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    let label: string;
    if (isUuidOrId(segment)) {
      label = "Details";
    } else {
      label =
        LABEL_MAP[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
    }

    crumbs.push({ label, href: currentPath });
  }

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
      }}
      aria-label="Breadcrumb"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span
            key={crumb.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {index > 0 && (
              <span
                style={{
                  color: "var(--color-border-primary)",
                  fontWeight: 400,
                  userSelect: "none",
                }}
              >
                /
              </span>
            )}
            {isLast ? (
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontWeight: 600,
                }}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                style={{
                  color: "var(--color-text-tertiary)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-tertiary)")
                }
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
