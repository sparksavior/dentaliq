"use client";

import { Skeleton, SkeletonText } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="180px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* 3 stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          marginBottom: 32,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRadius: 12,
              border: "1px solid var(--color-border-primary)",
              background: "var(--color-background-primary)",
            }}
          >
            <Skeleton height={12} width="40%" style={{ marginBottom: 12 }} />
            <Skeleton height={32} width="55%" style={{ marginBottom: 10 }} />
            <Skeleton height={10} width="30%" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div
        style={{
          padding: 24,
          borderRadius: 12,
          border: "1px solid var(--color-border-primary)",
          background: "var(--color-background-primary)",
        }}
      >
        <Skeleton height={18} width="160px" style={{ marginBottom: 20 }} />
        <Skeleton height={240} borderRadius={8} />
      </div>
    </div>
  );
}
