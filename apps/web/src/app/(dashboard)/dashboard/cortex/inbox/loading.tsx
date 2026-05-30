"use client";

import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function CortexInboxLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="180px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* Filter / status pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={30} width="80px" borderRadius={16} />
        ))}
      </div>

      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
