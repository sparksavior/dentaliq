"use client";

import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function ClaimsLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="180px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            height={32}
            width={i === 0 ? "60px" : "90px"}
            borderRadius={16}
          />
        ))}
      </div>

      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}
