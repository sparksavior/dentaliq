"use client";

import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function BillingLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="120px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* Plan card */}
      <div
        style={{
          padding: 24,
          borderRadius: 12,
          border: "1px solid var(--color-border-primary)",
          background: "var(--color-background-primary)",
          marginBottom: 28,
        }}
      >
        <Skeleton height={14} width="80px" style={{ marginBottom: 12 }} />
        <Skeleton height={28} width="200px" style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="260px" style={{ marginBottom: 18 }} />
        <div style={{ display: "flex", gap: 12 }}>
          <Skeleton height={36} width="130px" borderRadius={8} />
          <Skeleton height={36} width="130px" borderRadius={8} />
        </div>
      </div>

      {/* Invoice table */}
      <Skeleton height={18} width="140px" style={{ marginBottom: 16 }} />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
