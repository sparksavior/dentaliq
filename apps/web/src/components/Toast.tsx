"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"], duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const ICONS: Record<Toast["type"], string> = {
  success: "✓",
  error: "✗",
  info: "ⓘ",
  warning: "⚠",
};

const COLORS: Record<
  Toast["type"],
  { bg: string; border: string; text: string }
> = {
  success: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    text: "#10b981",
  },
  error: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    text: "#ef4444",
  },
  info: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    text: "#3b82f6",
  },
  warning: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    text: "#f59e0b",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 250);
    }, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.duration, onDismiss]);

  const c = COLORS[toast.type];
  return (
    <div
      onClick={() => {
        setExiting(true);
        setTimeout(onDismiss, 250);
      }}
      style={{
        padding: "12px 18px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        animation: exiting
          ? "toastOut 0.25s ease-in forwards"
          : "toastIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        minWidth: 240,
        maxWidth: 420,
      }}
    >
      <span
        style={{ fontSize: 16, color: c.text, flexShrink: 0, fontWeight: 700 }}
      >
        {ICONS[toast.type]}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary, #f1f5f9)",
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info", duration = 3500) => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((m: string) => addToast(m, "success"), [addToast]),
    error: useCallback((m: string) => addToast(m, "error"), [addToast]),
    info: useCallback((m: string) => addToast(m, "info"), [addToast]),
    warning: useCallback((m: string) => addToast(m, "warning"), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: 90,
          right: 24,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(40px) scale(0.95); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
