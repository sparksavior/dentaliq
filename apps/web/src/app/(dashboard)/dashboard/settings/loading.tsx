"use client";

import { Skeleton } from "@/components/Skeleton";

export default function SettingsLoading() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton
        height={28}
        width="140px"
        style={{ marginBottom: 24 }}
        borderRadius={8}
      />

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--color-border-primary)",
          paddingBottom: 0,
          marginBottom: 28,
        }}
      >
        {["100px", "80px", "110px", "90px"].map((w, i) => (
          <Skeleton key={i} height={36} width={w} borderRadius="8px 8px 0 0" />
        ))}
      </div>

      {/* Form fields */}
      <div
        style={{
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton height={12} width="120px" style={{ marginBottom: 8 }} />
            <Skeleton height={42} borderRadius={8} />
          </div>
        ))}

        <Skeleton
          height={42}
          width="140px"
          borderRadius={8}
          style={{ marginTop: 8 }}
        />
      </div>
    </div>
  );
}
