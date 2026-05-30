"use client";

import { Skeleton, SkeletonText } from "@/components/Skeleton";

export default function CortexLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="120px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* 4 agent cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 24,
              borderRadius: 12,
              border: "1px solid var(--color-border-primary)",
              background: "var(--color-background-primary)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <Skeleton height={44} width={44} borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <Skeleton height={16} width="60%" style={{ marginBottom: 6 }} />
                <Skeleton height={11} width="40%" />
              </div>
            </div>
            <SkeletonText count={2} lineHeight={12} gap={8} />
            <Skeleton
              height={34}
              width="100px"
              borderRadius={8}
              style={{ marginTop: 16 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
