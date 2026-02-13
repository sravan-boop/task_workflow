"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export function useRealtime(workspaceId: string | undefined) {
  const utils = trpc.useUtils();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const connect = () => {
      const es = new EventSource(
        `/api/realtime/subscribe?workspaceId=${workspaceId}`
      );

      es.addEventListener("task.created", () => {
        utils.tasks.list.invalidate();
        utils.tasks.myTasks.invalidate();
      });

      es.addEventListener("task.updated", () => {
        utils.tasks.list.invalidate();
        utils.tasks.get.invalidate();
      });

      es.addEventListener("task.completed", () => {
        utils.tasks.list.invalidate();
        utils.tasks.myTasks.invalidate();
      });

      es.addEventListener("comment.added", () => {
        utils.tasks.get.invalidate();
        utils.comments.list.invalidate();
      });

      es.addEventListener("notification.new", () => {
        utils.notifications.list.invalidate();
        utils.notifications.unreadCount.invalidate();
      });

      es.onerror = () => {
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      eventSourceRef.current = es;
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [workspaceId, utils]);
}
