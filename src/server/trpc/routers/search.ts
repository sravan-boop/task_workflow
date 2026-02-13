import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { anthropic } from "../../ai/client";

export const searchRouter = router({
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [tasks, projects] = await Promise.all([
        ctx.prisma.task.findMany({
          where: {
            workspaceId: input.workspaceId,
            title: { contains: input.query, mode: "insensitive" },
            parentTaskId: null,
          },
          include: {
            assignee: true,
            taskProjects: {
              include: { project: true },
              take: 1,
            },
          },
          take: 10,
          orderBy: { updatedAt: "desc" },
        }),
        ctx.prisma.project.findMany({
          where: {
            workspaceId: input.workspaceId,
            name: { contains: input.query, mode: "insensitive" },
            isArchived: false,
          },
          include: {
            team: true,
          },
          take: 5,
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      return { tasks, projects };
    }),

  // Advanced search with filters
  advanced: protectedProcedure
    .input(
      z.object({
        query: z.string().max(200).optional(),
        workspaceId: z.string(),
        projectId: z.string().optional(),
        assigneeId: z.string().optional(),
        status: z.enum(["INCOMPLETE", "COMPLETE"]).optional(),
        dueBefore: z.string().datetime().optional(),
        dueAfter: z.string().datetime().optional(),
        hasNoDueDate: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        workspaceId: input.workspaceId,
        parentTaskId: null,
      };

      if (input.query) {
        where.title = { contains: input.query, mode: "insensitive" };
      }
      if (input.projectId) {
        where.taskProjects = { some: { projectId: input.projectId } };
      }
      if (input.assigneeId) {
        where.assigneeId = input.assigneeId;
      }
      if (input.status) {
        where.status = input.status;
      }
      if (input.hasNoDueDate) {
        where.dueDate = null;
      } else {
        if (input.dueBefore || input.dueAfter) {
          const dueDate: Record<string, Date> = {};
          if (input.dueBefore) dueDate.lte = new Date(input.dueBefore);
          if (input.dueAfter) dueDate.gte = new Date(input.dueAfter);
          where.dueDate = dueDate;
        }
      }
      if (input.tags && input.tags.length > 0) {
        where.tags = { some: { tagId: { in: input.tags } } };
      }

      const tasks = await ctx.prisma.task.findMany({
        where,
        include: {
          assignee: true,
          taskProjects: {
            include: { project: true, section: true },
            take: 1,
          },
          tags: { include: { tag: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (tasks.length > input.limit) {
        const next = tasks.pop();
        nextCursor = next?.id;
      }

      return { tasks, nextCursor };
    }),

  // AI-powered semantic search
  semantic: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use AI to understand the search intent and generate search terms
      const prompt = `Given this natural language search query for a project management tool, extract the key search terms and intent.

Query: "${input.query}"

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "searchTerms": ["term1", "term2"],
  "intent": "finding_tasks" | "finding_projects" | "status_check" | "overdue_tasks" | "unassigned_tasks",
  "filters": {
    "status": "INCOMPLETE" | "COMPLETE" | null,
    "hasAssignee": true | false | null,
    "isOverdue": true | false | null
  }
}`;

      let searchTerms: string[] = [input.query];
      let filters: {
        status?: string | null;
        hasAssignee?: boolean | null;
        isOverdue?: boolean | null;
      } = {};

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        if (textContent?.text) {
          const parsed = JSON.parse(textContent.text);
          searchTerms = parsed.searchTerms || [input.query];
          filters = parsed.filters || {};
        }
      } catch {
        // Fallback: use raw query
      }

      // Build search conditions from AI-parsed terms
      const orConditions = searchTerms.map((term: string) => ({
        title: { contains: term, mode: "insensitive" as const },
      }));

      const where: Record<string, unknown> = {
        workspaceId: input.workspaceId,
        parentTaskId: null,
        OR: orConditions,
      };

      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.hasAssignee === false) {
        where.assigneeId = null;
      }
      if (filters.isOverdue) {
        where.status = "INCOMPLETE";
        where.dueDate = { lt: new Date() };
      }

      const tasks = await ctx.prisma.task.findMany({
        where,
        include: {
          assignee: true,
          taskProjects: {
            include: { project: true },
            take: 1,
          },
          tags: { include: { tag: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
      });

      // Also search projects
      const projects = await ctx.prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          isArchived: false,
          OR: searchTerms.map((term: string) => ({
            name: { contains: term, mode: "insensitive" as const },
          })),
        },
        include: { team: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });

      return {
        tasks,
        projects,
        searchTerms,
        interpretation: `Searched for: ${searchTerms.join(", ")}${filters.status ? ` (status: ${filters.status})` : ""}${filters.isOverdue ? " (overdue)" : ""}`,
      };
    }),
});
