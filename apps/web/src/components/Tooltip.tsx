"use client";

import { useState, type ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

const positionStyles: Record<string, React.CSSProperties> = {
  top: {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: 8,
  },
  bottom: {
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginTop: 8,
  },
  left: {
    right: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    marginRight: 8,
  },
  right: {
    left: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    marginLeft: 8,
  },
};

const arrowStyles: Record<string, React.CSSProperties> = {
  top: {
    bottom: -4,
    left: "50%",
    transform: "translateX(-50%) rotate(45deg)",
  },
  bottom: {
    top: -4,
    left: "50%",
    transform: "translateX(-50%) rotate(45deg)",
  },
  left: {
    right: -4,
    top: "50%",
    transform: "translateY(-50%) rotate(45deg)",
  },
  right: {
    left: -4,
    top: "50%",
    transform: "translateY(-50%) rotate(45deg)",
  },
};

export function Tooltip({ children, content, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <>
          <style>{`@keyframes tooltipFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
          <div
            style={{
              position: "absolute",
              zIndex: 9999,
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              animation: "tooltipFadeIn 0.15s ease",
              ...positionStyles[position],
            }}
          >
            {content}
            <div
              style={{
                position: "absolute",
                width: 8,
                height: 8,
                background: "var(--color-text-primary)",
                ...arrowStyles[position],
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
