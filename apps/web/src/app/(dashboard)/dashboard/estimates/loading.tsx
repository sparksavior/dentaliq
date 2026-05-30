"use client";

import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function EstimatesLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="160px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* Form skeleton */}
      <div
        style={{
          padding: 24,
          borderRadius: 12,
          border: "1px solid var(--color-border-primary)",
          background: "var(--color-background-primary)",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <Skeleton height={12} width="80px" style={{ marginBottom: 8 }} />
            <Skeleton height={40} borderRadius={8} />
          </div>
          <div>
            <Skeleton height={12} width="100px" style={{ marginBottom: 8 }} />
            <Skeleton height={40} borderRadius={8} />
          </div>
        </div>
        <Skeleton height={40} width="140px" borderRadius={8} />
      </div>

      {/* History table */}
      <Skeleton height={18} width="180px" style={{ marginBottom: 16 }} />
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
