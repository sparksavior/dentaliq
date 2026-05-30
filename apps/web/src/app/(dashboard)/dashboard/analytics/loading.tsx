"use client";

import { Skeleton } from "@/components/Skeleton";

export default function AnalyticsLoading() {
  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Skeleton height={28} width="160px" borderRadius={8} />
        {/* Date picker skeleton */}
        <Skeleton height={38} width="220px" borderRadius={8} />
      </div>

      {/* 3 chart skeletons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 24,
              borderRadius: 12,
              border: "1px solid var(--color-border-primary)",
              background: "var(--color-background-primary)",
            }}
          >
            <Skeleton height={16} width="140px" style={{ marginBottom: 20 }} />
            <Skeleton height={200} borderRadius={8} />
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 24,
          borderRadius: 12,
          border: "1px solid var(--color-border-primary)",
          background: "var(--color-background-primary)",
        }}
      >
        <Skeleton height={16} width="180px" style={{ marginBottom: 20 }} />
        <Skeleton height={200} borderRadius={8} />
      </div>
    </div>
  );
}
