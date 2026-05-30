"use client";

import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function PatientsLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="140px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* Search bar */}
      <Skeleton height={44} borderRadius={10} style={{ marginBottom: 24 }} />

      {/* Patient table */}
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
