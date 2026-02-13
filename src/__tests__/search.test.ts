import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the AI client to avoid real API calls
vi.mock("@/server/ai/client", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { searchRouter } from "@/server/trpc/routers/search";

// Helper to create a mock Prisma client for search
function createMockPrisma() {
  return {
    task: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

// Helper to create a valid session
function createSession(userId = "user-1") {
  return {
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Search Router", () => {
  describe("global search", () => {
    it("returns tasks and projects matching the query", async () => {
      const mockPrisma = createMockPrisma();
      const mockTasks = [
        {
          id: "task-1",
          title: "Design mockups",
          assignee: { id: "user-1", name: "Test User" },
          taskProjects: [{ project: { id: "project-1", name: "Website" } }],
        },
      ];
      const mockProjects = [
        {
          id: "project-1",
          name: "Website Design",
          team: { id: "team-1", name: "Engineering" },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.global({
        query: "Design",
        workspaceId: "workspace-1",
      });

      expect(result.tasks).toEqual(mockTasks);
      expect(result.projects).toEqual(mockProjects);

      // Verify task search was called with correct parameters
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
            title: { contains: "Design", mode: "insensitive" },
            parentTaskId: null,
          }),
          take: 10,
          orderBy: { updatedAt: "desc" },
        })
      );

      // Verify project search was called with correct parameters
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
            name: { contains: "Design", mode: "insensitive" },
            isArchived: false,
          }),
          take: 5,
          orderBy: { updatedAt: "desc" },
        })
      );
    });

    it("returns empty arrays when no results match", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.project.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.global({
        query: "nonexistent-query-xyz",
        workspaceId: "workspace-1",
      });

      expect(result.tasks).toEqual([]);
      expect(result.projects).toEqual([]);
    });

    it("requires authentication", async () => {
      const mockPrisma = createMockPrisma();

      const caller = searchRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.global({
          query: "test",
          workspaceId: "workspace-1",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.global({
          query: "test",
          workspaceId: "workspace-1",
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("searches tasks and projects in parallel", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.project.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      await caller.global({
        query: "test",
        workspaceId: "workspace-1",
      });

      // Both findMany should have been called
      expect(mockPrisma.task.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.project.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("advanced search", () => {
    it("applies project filter when projectId is provided", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      await caller.advanced({
        workspaceId: "workspace-1",
        projectId: "project-1",
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskProjects: { some: { projectId: "project-1" } },
          }),
        })
      );
    });

    it("applies assignee filter when assigneeId is provided", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      await caller.advanced({
        workspaceId: "workspace-1",
        assigneeId: "user-2",
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: "user-2",
          }),
        })
      );
    });

    it("applies status filter when status is provided", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      await caller.advanced({
        workspaceId: "workspace-1",
        status: "COMPLETE",
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "COMPLETE",
          }),
        })
      );
    });

    it("applies title filter when query is provided", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      await caller.advanced({
        workspaceId: "workspace-1",
        query: "my task",
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: "my task", mode: "insensitive" },
          }),
        })
      );
    });

    it("returns empty results when no tasks match filters", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.advanced({
        workspaceId: "workspace-1",
        assigneeId: "user-nonexistent",
        status: "COMPLETE",
      });

      expect(result.tasks).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it("handles pagination with cursor and returns nextCursor", async () => {
      const mockPrisma = createMockPrisma();
      // Return limit + 1 items to trigger pagination
      const tasks = Array.from({ length: 21 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
      }));
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.advanced({
        workspaceId: "workspace-1",
        limit: 20,
      });

      // The extra item should be popped and used as cursor
      expect(result.tasks).toHaveLength(20);
      expect(result.nextCursor).toBe("task-20");
    });

    it("requires authentication", async () => {
      const mockPrisma = createMockPrisma();

      const caller = searchRouter.createCaller({
        session: null,
        prisma: mockPrisma as any,
      });

      await expect(
        caller.advanced({
          workspaceId: "workspace-1",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.advanced({
          workspaceId: "workspace-1",
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("applies hasNoDueDate filter", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const caller = searchRouter.createCaller({
        session: createSession() as any,
        prisma: mockPrisma as any,
      });

      await caller.advanced({
        workspaceId: "workspace-1",
        hasNoDueDate: true,
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: null,
          }),
        })
      );
    });
  });
});
