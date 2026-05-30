"use client";

import { useEffect, useRef, useCallback } from "react";

const AGENT_MANAGER_URL =
  process.env.NEXT_PUBLIC_AGENT_MANAGER_URL ?? "http://localhost:3006";

interface AgentEvent {
  type: "task_created" | "task_approved" | "task_rejected" | "scan_complete";
  data: any;
  timestamp: string;
}

/**
 * Hook that connects to the agent-manager SSE stream.
 * Calls onEvent whenever a new agent event arrives.
 */
export function useAgentEvents(
  onEvent: (event: AgentEvent) => void,
  enabled = true,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        eventSource = new EventSource(`${AGENT_MANAGER_URL}/events`);

        eventSource.onmessage = (e) => {
          try {
            const event: AgentEvent = JSON.parse(e.data);
            onEventRef.current(event);
          } catch {
            // ignore malformed events
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          // Retry in 10 seconds
          retryTimeout = setTimeout(connect, 10_000);
        };
      } catch {
        retryTimeout = setTimeout(connect, 10_000);
      }
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [enabled]);
}
