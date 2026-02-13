import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: ctx.session.user.id },
        },
      },
      include: {
        members: {
          include: { user: true },
          take: 5,
        },
        _count: {
          select: { members: true, projects: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: {
          id: input.id,
          members: {
            some: { userId: ctx.session.user.id },
          },
        },
        include: {
          members: {
            include: { user: true },
          },
          teams: true,
          _count: {
            select: { members: true, projects: true, teams: true },
          },
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      return workspace;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.workspace.create({
        data: {
          name: input.name,
          description: input.description,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "OWNER",
            },
          },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check admin permission
      const membership = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.id,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.workspace.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
        },
      });
    }),

  getMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      });
    }),

  exportAll: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      const members = await ctx.prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: { user: true },
      });

      const projects = await ctx.prisma.project.findMany({
        where: { workspaceId: input.workspaceId },
        include: { sections: true },
      });

      const projectIds = projects.map((p) => p.id);

      const tasks = await ctx.prisma.task.findMany({
        where: {
          taskProjects: { some: { projectId: { in: projectIds } } },
        },
        include: {
          assignee: true,
          taskProjects: {
            include: {
              project: true,
              section: true,
            },
          },
        },
      });

      const taskIds = tasks.map((t) => t.id);

      const comments = await ctx.prisma.comment.findMany({
        where: { taskId: { in: taskIds } },
        include: { author: true },
      });

      return {
        workspaceName: workspace?.name ?? "workspace",
        members: members.map((m) => ({
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
        projects: projects.map((p) => ({
          name: p.name,
          color: p.color,
          isArchived: p.isArchived,
          createdAt: p.createdAt.toISOString(),
          sections: p.sections.map((s) => s.name),
        })),
        tasks: tasks.map((t) => ({
          title: t.title,
          status: t.status,
          assignee: t.assignee?.name ?? "",
          assigneeEmail: t.assignee?.email ?? "",
          dueDate: t.dueDate?.toISOString() ?? "",
          project: t.taskProjects?.[0]?.project?.name ?? "",
          section: t.taskProjects?.[0]?.section?.name ?? "",
          createdAt: t.createdAt.toISOString(),
        })),
        comments: comments.map((c) => ({
          taskId: c.taskId,
          author: c.author?.name ?? "",
          body: typeof c.body === "string" ? c.body : JSON.stringify(c.body),
          createdAt: c.createdAt.toISOString(),
        })),
      };
    }),

  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found. They need to create an account first.",
        });
      }

      const existing = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: user.id,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this workspace",
        });
      }

      return ctx.prisma.workspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: user.id,
          role: input.role,
        },
        include: { user: true },
      });
    }),
});
