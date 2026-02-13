import { describe, it, expect, vi } from "vitest";
import { realtime, REALTIME_EVENTS } from "@/server/services/realtime";

describe("RealtimeService", () => {
  describe("subscribe", () => {
    it("returns an unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = realtime.subscribe("workspace-1", callback);
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });

    it("receives published events for the subscribed workspace", () => {
      const callback = vi.fn();
      const unsubscribe = realtime.subscribe("workspace-sub-1", callback);

      const event = {
        type: REALTIME_EVENTS.TASK_CREATED,
        workspaceId: "workspace-sub-1",
        data: { taskId: "task-1", title: "New Task" },
      };

      realtime.publish(event);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(event);

      unsubscribe();
    });

    it("does not receive events for a different workspace", () => {
      const callback = vi.fn();
      const unsubscribe = realtime.subscribe("workspace-a", callback);

      realtime.publish({
        type: REALTIME_EVENTS.TASK_UPDATED,
        workspaceId: "workspace-b",
        data: { taskId: "task-2" },
      });

      expect(callback).not.toHaveBeenCalled();

      unsubscribe();
    });

    it("supports multiple subscribers for the same workspace", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const unsubscribe1 = realtime.subscribe("workspace-multi", callback1);
      const unsubscribe2 = realtime.subscribe("workspace-multi", callback2);

      const event = {
        type: REALTIME_EVENTS.COMMENT_ADDED,
        workspaceId: "workspace-multi",
        data: { commentId: "comment-1" },
      };

      realtime.publish(event);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith(event);

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe("publish", () => {
    it("delivers events to subscribers", () => {
      const callback = vi.fn();
      const unsubscribe = realtime.subscribe("workspace-pub", callback);

      realtime.publish({
        type: REALTIME_EVENTS.PROJECT_UPDATED,
        workspaceId: "workspace-pub",
        data: { projectId: "project-1" },
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it("delivers multiple events in order", () => {
      const receivedEvents: string[] = [];
      const callback = vi.fn((event) => {
        receivedEvents.push(event.type);
      });
      const unsubscribe = realtime.subscribe("workspace-order", callback);

      realtime.publish({
        type: REALTIME_EVENTS.TASK_CREATED,
        workspaceId: "workspace-order",
        data: { taskId: "task-1" },
      });

      realtime.publish({
        type: REALTIME_EVENTS.TASK_UPDATED,
        workspaceId: "workspace-order",
        data: { taskId: "task-1" },
      });

      realtime.publish({
        type: REALTIME_EVENTS.TASK_COMPLETED,
        workspaceId: "workspace-order",
        data: { taskId: "task-1" },
      });

      expect(callback).toHaveBeenCalledTimes(3);
      expect(receivedEvents).toEqual([
        REALTIME_EVENTS.TASK_CREATED,
        REALTIME_EVENTS.TASK_UPDATED,
        REALTIME_EVENTS.TASK_COMPLETED,
      ]);

      unsubscribe();
    });

    it("does nothing if there are no subscribers", () => {
      // Should not throw
      expect(() => {
        realtime.publish({
          type: REALTIME_EVENTS.NOTIFICATION_NEW,
          workspaceId: "workspace-no-subs",
          data: { notificationId: "n-1" },
        });
      }).not.toThrow();
    });
  });

  describe("unsubscribe", () => {
    it("stops receiving events after unsubscribing", () => {
      const callback = vi.fn();
      const unsubscribe = realtime.subscribe("workspace-unsub", callback);

      realtime.publish({
        type: REALTIME_EVENTS.TASK_CREATED,
        workspaceId: "workspace-unsub",
        data: { taskId: "task-1" },
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      realtime.publish({
        type: REALTIME_EVENTS.TASK_UPDATED,
        workspaceId: "workspace-unsub",
        data: { taskId: "task-1" },
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("only unsubscribes the specific subscriber, not others", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const unsubscribe1 = realtime.subscribe("workspace-partial", callback1);
      const unsubscribe2 = realtime.subscribe("workspace-partial", callback2);

      unsubscribe1();

      realtime.publish({
        type: REALTIME_EVENTS.TASK_DELETED,
        workspaceId: "workspace-partial",
        data: { taskId: "task-1" },
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);

      unsubscribe2();
    });

    it("can be called multiple times without error", () => {
      const callback = vi.fn();
      const unsubscribe = realtime.subscribe("workspace-double-unsub", callback);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe("REALTIME_EVENTS", () => {
    it("has the expected event types", () => {
      expect(REALTIME_EVENTS.TASK_CREATED).toBe("task.created");
      expect(REALTIME_EVENTS.TASK_UPDATED).toBe("task.updated");
      expect(REALTIME_EVENTS.TASK_COMPLETED).toBe("task.completed");
      expect(REALTIME_EVENTS.TASK_DELETED).toBe("task.deleted");
      expect(REALTIME_EVENTS.COMMENT_ADDED).toBe("comment.added");
      expect(REALTIME_EVENTS.PROJECT_UPDATED).toBe("project.updated");
      expect(REALTIME_EVENTS.NOTIFICATION_NEW).toBe("notification.new");
    });
  });
});
