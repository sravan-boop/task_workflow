import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import { router, protectedProcedure, publicProcedure } from "../trpc";
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

  getInviteLink: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: {
          id: input.workspaceId,
          members: { some: { userId: ctx.session.user.id } },
        },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      if (!workspace.inviteToken) {
        const updated = await ctx.prisma.workspace.update({
          where: { id: input.workspaceId },
          data: { inviteToken: crypto.randomUUID() },
        });
        return { token: updated.inviteToken!, role: updated.inviteRole };
      }

      return { token: workspace.inviteToken, role: workspace.inviteRole };
    }),

  regenerateInviteLink: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { inviteToken: crypto.randomUUID() },
      });

      return { token: updated.inviteToken!, role: updated.inviteRole };
    }),

  getWorkspaceByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { inviteToken: input.token },
        select: { id: true, name: true, inviteRole: true },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite link" });
      }

      return workspace;
    }),

  joinByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { inviteToken: input.token },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite link" });
      }

      const existing = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existing) {
        return workspace;
      }

      await ctx.prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: ctx.session.user.id,
          role: workspace.inviteRole,
        },
      });

      return workspace;
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
        // User doesn't have an account — send invite email with join link
        let workspace = await ctx.prisma.workspace.findUnique({
          where: { id: input.workspaceId },
        });

        if (!workspace) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
        }

        if (!workspace.inviteToken) {
          workspace = await ctx.prisma.workspace.update({
            where: { id: input.workspaceId },
            data: { inviteToken: crypto.randomUUID() },
          });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const joinLink = `${appUrl}/join/${workspace.inviteToken}`;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "TaskFlow <onboarding@resend.dev>",
          to: input.email,
          subject: `You've been invited to join ${workspace.name} on TaskFlow`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>You've been invited!</h2>
              <p>You've been invited to join <strong>${workspace.name}</strong> on TaskFlow.</p>
              <a href="${joinLink}" style="display: inline-block; background: #4573D2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                Join workspace
              </a>
              <p style="margin-top: 16px; color: #6d6e6f; font-size: 14px;">
                Or copy this link: ${joinLink}
              </p>
            </div>
          `,
        });

        return { emailSent: true };
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

  // Find user by email and auto-add to workspace if not already a member
  findOrInviteByEmail: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!user) {
        // User doesn't have an account — send invite email
        let workspace = await ctx.prisma.workspace.findUnique({
          where: { id: input.workspaceId },
        });
        if (!workspace) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
        }
        if (!workspace.inviteToken) {
          workspace = await ctx.prisma.workspace.update({
            where: { id: input.workspaceId },
            data: { inviteToken: crypto.randomUUID() },
          });
        }
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const joinLink = `${appUrl}/join/${workspace.inviteToken}`;
        const Resend = (await import("resend")).Resend;
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "TaskFlow <onboarding@resend.dev>",
          to: input.email,
          subject: `You've been invited to join ${workspace.name} on TaskFlow`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>You've been invited!</h2>
              <p>You've been invited to join <strong>${workspace.name}</strong> on TaskFlow.</p>
              <a href="${joinLink}" style="display: inline-block; background: #4573D2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                Join workspace
              </a>
            </div>
          `,
        });
        return { emailSent: true, userId: null };
      }

      // User exists — check if already a workspace member
      const existing = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: user.id,
          },
        },
      });

      if (!existing) {
        // Auto-add them to workspace as MEMBER
        await ctx.prisma.workspaceMember.create({
          data: {
            workspaceId: input.workspaceId,
            userId: user.id,
            role: "MEMBER",
          },
        });
      }

      return { emailSent: false, userId: user.id };
    }),
});
