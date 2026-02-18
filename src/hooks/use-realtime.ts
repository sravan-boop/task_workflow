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

      // Task events
      es.addEventListener("task.created", () => {
        utils.tasks.list.invalidate();
        utils.tasks.myTasks.invalidate();
      });

      es.addEventListener("task.updated", () => {
        utils.tasks.list.invalidate();
        utils.tasks.get.invalidate();
        utils.tasks.myTasks.invalidate();
      });

      es.addEventListener("task.completed", () => {
        utils.tasks.list.invalidate();
        utils.tasks.myTasks.invalidate();
        utils.reporting.getTasksByStatus.invalidate();
        utils.reporting.getProjectStats.invalidate();
      });

      es.addEventListener("task.deleted", () => {
        utils.tasks.list.invalidate();
        utils.tasks.myTasks.invalidate();
      });

      // Comment events
      es.addEventListener("comment.added", () => {
        utils.tasks.get.invalidate();
        utils.comments.list.invalidate();
      });

      es.addEventListener("comment.updated", () => {
        utils.comments.list.invalidate();
        utils.tasks.get.invalidate();
      });

      es.addEventListener("comment.deleted", () => {
        utils.comments.list.invalidate();
        utils.tasks.get.invalidate();
      });

      // Project events
      es.addEventListener("project.created", () => {
        utils.projects.list.invalidate();
        utils.projects.listAll.invalidate();
      });

      es.addEventListener("project.updated", () => {
        utils.projects.list.invalidate();
        utils.projects.listAll.invalidate();
        utils.projects.get.invalidate();
      });

      es.addEventListener("project.deleted", () => {
        utils.projects.list.invalidate();
        utils.projects.listAll.invalidate();
      });

      // Goal events
      es.addEventListener("goal.created", () => {
        utils.goals.list.invalidate();
      });

      es.addEventListener("goal.updated", () => {
        utils.goals.list.invalidate();
        utils.goals.get.invalidate();
      });

      es.addEventListener("goal.deleted", () => {
        utils.goals.list.invalidate();
      });

      // Portfolio events
      es.addEventListener("portfolio.created", () => {
        utils.portfolios.list.invalidate();
      });

      es.addEventListener("portfolio.updated", () => {
        utils.portfolios.list.invalidate();
        utils.portfolios.get.invalidate();
      });

      es.addEventListener("portfolio.deleted", () => {
        utils.portfolios.list.invalidate();
      });

      // Report / dashboard events
      es.addEventListener("report.created", () => {
        utils.savedReports.list.invalidate();
      });

      es.addEventListener("report.updated", () => {
        utils.savedReports.list.invalidate();
      });

      es.addEventListener("report.deleted", () => {
        utils.savedReports.list.invalidate();
      });

      // Section events
      es.addEventListener("section.updated", () => {
        utils.projects.get.invalidate();
        utils.tasks.list.invalidate();
      });

      // Notification events
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
