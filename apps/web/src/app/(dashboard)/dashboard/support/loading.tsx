"use client";

import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function SupportLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="140px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* New ticket button placeholder */}
      <Skeleton
        height={40}
        width="160px"
        borderRadius={8}
        style={{ marginBottom: 24 }}
      />

      <SkeletonTable rows={4} cols={4} />
    </div>
  );
}
