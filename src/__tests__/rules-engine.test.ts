import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeRules } from "@/server/services/rules-engine";

// Mock PrismaClient
const mockPrisma = {
  rule: {
    findMany: vi.fn(),
  },
  task: {
    update: vi.fn(),
  },
  taskProject: {
    updateMany: vi.fn(),
  },
  comment: {
    create: vi.fn(),
  },
};

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
  return () => {
    console.error = originalConsoleError;
  };
});

const baseContext = {
  projectId: "project-1",
  taskId: "task-1",
  userId: "user-1",
};

describe("executeRules", () => {
  it("finds and executes matching rules for a trigger type", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        trigger: { type: "TASK_COMPLETED" },
        actions: [{ type: "SET_ASSIGNEE", config: "user-2" }],
        isActive: true,
      },
    ]);
    mockPrisma.task.update.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_COMPLETED", baseContext);

    expect(mockPrisma.rule.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        isActive: true,
      },
    });
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { assigneeId: "user-2" },
    });
  });

  it("skips rules that do not match the trigger type", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        trigger: { type: "TASK_ADDED" },
        actions: [{ type: "COMPLETE_TASK" }],
        isActive: true,
      },
    ]);

    await executeRules(mockPrisma as any, "TASK_COMPLETED", baseContext);

    expect(mockPrisma.rule.findMany).toHaveBeenCalled();
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it("skips inactive rules (only active rules are queried)", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([]);

    await executeRules(mockPrisma as any, "TASK_COMPLETED", baseContext);

    expect(mockPrisma.rule.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        isActive: true,
      },
    });
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it("executes COMPLETE_TASK action", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        trigger: { type: "TASK_MOVED" },
        actions: [{ type: "COMPLETE_TASK" }],
        isActive: true,
      },
    ]);
    mockPrisma.task.update.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_MOVED", baseContext);

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { status: "COMPLETE", completedAt: expect.any(Date) },
    });
  });

  it("executes SET_ASSIGNEE action with config", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-2",
        trigger: { type: "TASK_ADDED" },
        actions: [{ type: "SET_ASSIGNEE", config: "user-99" }],
        isActive: true,
      },
    ]);
    mockPrisma.task.update.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_ADDED", baseContext);

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { assigneeId: "user-99" },
    });
  });

  it("executes MOVE_TO_SECTION action with config", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-3",
        trigger: { type: "TASK_COMPLETED" },
        actions: [{ type: "MOVE_TO_SECTION", config: "section-5" }],
        isActive: true,
      },
    ]);
    mockPrisma.taskProject.updateMany.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_COMPLETED", baseContext);

    expect(mockPrisma.taskProject.updateMany).toHaveBeenCalledWith({
      where: { taskId: "task-1", projectId: "project-1" },
      data: { sectionId: "section-5" },
    });
  });

  it("executes ADD_COMMENT action with config", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-4",
        trigger: { type: "FIELD_CHANGED" },
        actions: [{ type: "ADD_COMMENT", config: "Auto-comment from rule" }],
        isActive: true,
      },
    ]);
    mockPrisma.comment.create.mockResolvedValue({});

    await executeRules(mockPrisma as any, "FIELD_CHANGED", baseContext);

    expect(mockPrisma.comment.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        authorId: "user-1",
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Auto-comment from rule" }],
            },
          ],
        },
      },
    });
  });

  it("executes SET_DUE_DATE action with config", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-5",
        trigger: { type: "TASK_ADDED" },
        actions: [{ type: "SET_DUE_DATE", config: "7" }],
        isActive: true,
      },
    ]);
    mockPrisma.task.update.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_ADDED", baseContext);

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { dueDate: expect.any(Date) },
    });

    // Verify the due date is approximately 7 days from now
    const callArgs = mockPrisma.task.update.mock.calls[0][0];
    const dueDate = callArgs.data.dueDate as Date;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 7);
    // Allow 5 seconds of tolerance
    expect(Math.abs(dueDate.getTime() - expectedDate.getTime())).toBeLessThan(5000);
  });

  it("handles action failure gracefully without throwing", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-6",
        trigger: { type: "TASK_COMPLETED" },
        actions: [{ type: "COMPLETE_TASK" }],
        isActive: true,
      },
    ]);
    mockPrisma.task.update.mockRejectedValue(new Error("DB connection lost"));

    // Should not throw
    await expect(
      executeRules(mockPrisma as any, "TASK_COMPLETED", baseContext)
    ).resolves.not.toThrow();

    expect(console.error).toHaveBeenCalled();
  });

  it("executes multiple actions for a single rule", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-7",
        trigger: { type: "TASK_ADDED" },
        actions: [
          { type: "SET_ASSIGNEE", config: "user-10" },
          { type: "ADD_COMMENT", config: "Task auto-assigned" },
        ],
        isActive: true,
      },
    ]);
    mockPrisma.task.update.mockResolvedValue({});
    mockPrisma.comment.create.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_ADDED", baseContext);

    expect(mockPrisma.task.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.comment.create).toHaveBeenCalledTimes(1);
  });

  it("executes multiple matching rules", async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      {
        id: "rule-a",
        trigger: { type: "TASK_COMPLETED" },
        actions: [{ type: "ADD_COMMENT", config: "Task done!" }],
        isActive: true,
      },
      {
        id: "rule-b",
        trigger: { type: "TASK_COMPLETED" },
        actions: [{ type: "MOVE_TO_SECTION", config: "section-done" }],
        isActive: true,
      },
    ]);
    mockPrisma.comment.create.mockResolvedValue({});
    mockPrisma.taskProject.updateMany.mockResolvedValue({});

    await executeRules(mockPrisma as any, "TASK_COMPLETED", baseContext);

    expect(mockPrisma.comment.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.taskProject.updateMany).toHaveBeenCalledTimes(1);
  });
});
