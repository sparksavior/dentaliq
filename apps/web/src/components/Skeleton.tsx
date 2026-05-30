"use client";

import React from "react";

/* ── Shimmer keyframes injected once ── */
const SHIMMER_ID = "skeleton-shimmer-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHIMMER_ID)) return;
  const style = document.createElement("style");
  style.id = SHIMMER_ID;
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ── Base Skeleton ── */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  React.useEffect(() => {
    ensureKeyframes();
  }, []);

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(
          90deg,
          var(--color-background-tertiary) 25%,
          var(--color-background-secondary) 50%,
          var(--color-background-tertiary) 75%
        )`,
        backgroundSize: "800px 100%",
        animation: "skeleton-shimmer 1.6s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/* ── SkeletonText ── */

interface SkeletonTextProps {
  count?: number;
  lineHeight?: number;
  gap?: number;
}

export function SkeletonText({
  count = 3,
  lineHeight = 14,
  gap = 10,
}: SkeletonTextProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === count - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

/* ── SkeletonCard ── */

interface SkeletonCardProps {
  style?: React.CSSProperties;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 12,
        border: "1px solid var(--color-border-primary)",
        background: "var(--color-background-primary)",
        ...style,
      }}
    >
      <Skeleton height={18} width="45%" style={{ marginBottom: 16 }} />
      <SkeletonText count={2} />
    </div>
  );
}

/* ── SkeletonTable ── */

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--color-border-primary)",
        overflow: "hidden",
        background: "var(--color-background-primary)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-secondary)",
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={12} width="70%" />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 16,
            padding: "14px 20px",
            borderBottom:
              r < rows - 1
                ? "1px solid var(--color-border-primary)"
                : undefined,
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={c === 0 ? "80%" : "60%"} />
          ))}
        </div>
      ))}
    </div>
  );
}
