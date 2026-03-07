import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";

export const teamsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.team.findMany({
        where: {
          workspaceId: input.workspaceId,
          members: {
            some: { userId: ctx.session.user.id },
          },
        },
        include: {
          members: { include: { user: true } },
          _count: { select: { members: true, projects: true } },
        },
        orderBy: { name: "asc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.team.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          members: { include: { user: true } },
          projects: true,
          workspace: {
            include: { members: { select: { userId: true, role: true } } }
          },
          _count: { select: { members: true, projects: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.team.create({
        data: {
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "LEAD",
            },
          },
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.id, userId: ctx.session.user.id } },
      });

      const team = await ctx.prisma.team.findUnique({ where: { id: input.id } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const workspaceMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } }
      });

      const isLead = membership?.role === "LEAD";
      const isOwner = workspaceMembership?.role === "OWNER";

      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead or workspace owner can update the team." });
      }

      const updated = await ctx.prisma.team.update({
        where: { id: input.id },
        data: { name: input.name, description: input.description },
      });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.id } });

      return updated;
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        email: z.string().email(),
        role: z.enum(["LEAD", "MEMBER"]).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        // User doesn't exist – send email invite
        let team = await ctx.prisma.team.findUnique({
          where: { id: input.teamId },
          include: { workspace: true },
        });

        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        if (!team.inviteToken) {
          team = await ctx.prisma.team.update({
            where: { id: input.teamId },
            data: { inviteToken: crypto.randomUUID() },
            include: { workspace: true },
          });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const joinLink = `${appUrl}/join-team/${team.inviteToken}`;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "TaskFlow <onboarding@resend.dev>",
          to: input.email,
          subject: `You've been invited to join ${team.name} on TaskFlow`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>You've been invited!</h2>
              <p>You've been invited to join <strong>${team.name}</strong> on TaskFlow.</p>
              <a href="${joinLink}" style="display: inline-block; background: #4573D2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                Join team
              </a>
              <p style="margin-top: 16px; color: #6d6e6f; font-size: 14px;">
                Or copy this link: ${joinLink}
              </p>
            </div>
          `,
        });

        return { emailSent: true };
      }

      // Check if already a member of the team
      const existing = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: user.id } },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this team." });
      }

      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // Ensure they actally belong to the workspace before joining team
      const workspaceMembership = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: team.workspaceId, userId: user.id }
        }
      });

      if (!workspaceMembership) {
        // Auto-add to workspace as MEMBER
        await ctx.prisma.workspaceMember.create({
          data: {
            workspaceId: team.workspaceId,
            userId: user.id,
            role: "MEMBER",
          }
        });
      }

      return ctx.prisma.teamMember.create({
        data: {
          teamId: input.teamId,
          userId: user.id,
          role: input.role,
        },
        include: { user: true },
      });
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.teamMember.deleteMany({
        where: {
          teamId: input.teamId,
          userId: input.userId,
        },
      });
    }),

  makeLead: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        newLeadId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      // Determine if current user is LEAD or WORKSPACE OWNER
      const currentMembership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: currentUserId } },
      });

      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const workspaceMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: currentUserId } }
      });

      const isLead = currentMembership?.role === "LEAD";
      const isOwner = workspaceMembership?.role === "OWNER";

      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead or workspace owner can transfer leadership." });
      }

      // Verify target is a team member
      const targetMembership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: input.newLeadId } },
      });

      if (!targetMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user is not a member of this team." });
      }

      // Demote current lead(s)
      const currentLeads = await ctx.prisma.teamMember.findMany({
        where: { teamId: input.teamId, role: "LEAD" }
      });

      // Get target user details to update team name
      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: input.newLeadId },
      });

      const newTeamName = targetUser?.name ? `${targetUser.name.toUpperCase()}'s Team` : "Team";

      // Do the swap in a transaction
      await ctx.prisma.$transaction([
        // Demote any existing leads
        ...currentLeads.map((lead) =>
          ctx.prisma.teamMember.update({
            where: { teamId_userId: { teamId: input.teamId, userId: lead.userId } },
            data: { role: "MEMBER" },
          })
        ),
        // Promote the new lead
        ctx.prisma.teamMember.update({
          where: { teamId_userId: { teamId: input.teamId, userId: input.newLeadId } },
          data: { role: "LEAD" },
        }),
        // Update the team name
        ctx.prisma.team.update({
          where: { id: input.teamId },
          data: { name: newTeamName },
        }),
      ]);

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.teamId } });

      return { success: true };
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      let team = await ctx.prisma.team.findUnique({
        where: { id: input.teamId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } }
      });

      if (!membership || membership.role !== "LEAD") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a team lead to generate invite link." });
      }

      if (!team.inviteToken) {
        team = await ctx.prisma.team.update({
          where: { id: input.teamId },
          data: { inviteToken: crypto.randomUUID() },
        });
      }

      return { token: team.inviteToken! };
    }),

  regenerateInviteLink: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } }
      });

      if (!membership || membership.role !== "LEAD") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a team lead to generate invite link." });
      }

      const team = await ctx.prisma.team.update({
        where: { id: input.teamId },
        data: { inviteToken: crypto.randomUUID() },
      });

      return { token: team.inviteToken! };
    }),

  getTeamByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({
        where: { inviteToken: input.token },
        select: { id: true, name: true, workspace: { select: { name: true } } },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite link" });
      }

      return team;
    }),

  joinByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({
        where: { inviteToken: input.token },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite link" });
      }

      // Check if user is already a team member
      const existingTeamMember = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: ctx.session.user.id } },
      });

      if (existingTeamMember) {
        return team;
      }

      // Ensure user is in the workspace
      const existingWorkspaceMember = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });

      if (!existingWorkspaceMember) {
        await ctx.prisma.workspaceMember.create({
          data: {
            workspaceId: team.workspaceId,
            userId: ctx.session.user.id,
            role: "MEMBER",
          }
        });
      }

      await ctx.prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: ctx.session.user.id,
          role: "MEMBER", // Default role for joining
        },
      });

      return team;
    }),

  assignManager: protectedProcedure
    .input(z.object({ teamId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } },
      });
      const wsMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });
      const isLead = membership?.role === "LEAD";
      const isOwner = wsMembership?.role === "OWNER";
      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead can manage managers." });
      }

      const targetMembership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
      });
      if (!targetMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User is not a member of this team." });
      }

      const updated = await ctx.prisma.teamMember.update({
        where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
        data: { role: "MANAGER" },
      });

      // Notify the user they've been made a manager
      const actor = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } });
      await ctx.prisma.notification.create({
        data: {
          userId: input.userId,
          type: "TASK_ASSIGNED",
          resourceType: "team",
          resourceId: input.teamId,
          actorId: ctx.session.user.id,
          message: `${actor?.name ?? "Someone"} made you a Manager in ${team.name}`,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.NOTIFICATION_NEW, workspaceId: team.workspaceId, data: {} });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.teamId } });

      return updated;
    }),

  removeManager: protectedProcedure
    .input(z.object({ teamId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } },
      });
      const wsMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });
      const isLead = membership?.role === "LEAD";
      const isOwner = wsMembership?.role === "OWNER";
      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead can manage managers." });
      }

      const targetMembership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
      });
      if (!targetMembership || targetMembership.role !== "MANAGER") {
        throw new TRPCError({ code: "NOT_FOUND", message: "User is not a manager in this team." });
      }

      // Clear managerId from all team members who had this manager
      await ctx.prisma.teamMember.updateMany({
        where: { teamId: input.teamId, managerId: input.userId },
        data: { managerId: null },
      });

      // Demote back to MEMBER
      const updated = await ctx.prisma.teamMember.update({
        where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
        data: { role: "MEMBER" },
      });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.teamId } });

      return updated;
    }),

  assignManagerToMember: protectedProcedure
    .input(z.object({ teamId: z.string(), memberId: z.string(), managerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } },
      });
      const wsMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });
      const isLead = membership?.role === "LEAD";
      const isOwner = wsMembership?.role === "OWNER";
      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead can manage managers." });
      }

      // Verify the managerId user actually has MANAGER role in the team
      const managerMembership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: input.managerId } },
      });
      if (!managerMembership || managerMembership.role !== "MANAGER") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The specified user is not a manager in this team." });
      }

      const updated = await ctx.prisma.teamMember.update({
        where: { teamId_userId: { teamId: input.teamId, userId: input.memberId } },
        data: { managerId: input.managerId },
      });

      const actor = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } });
      const managerUser = await ctx.prisma.user.findUnique({ where: { id: input.managerId }, select: { name: true } });
      await ctx.prisma.notification.create({
        data: {
          userId: input.memberId,
          type: "TASK_ASSIGNED",
          resourceType: "team",
          resourceId: input.teamId,
          actorId: ctx.session.user.id,
          message: `${actor?.name ?? "Someone"} assigned ${managerUser?.name ?? "a manager"} as your manager`,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.NOTIFICATION_NEW, workspaceId: team.workspaceId, data: {} });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.teamId } });

      return updated;
    }),

  removeManagerFromMember: protectedProcedure
    .input(z.object({ teamId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } },
      });
      const wsMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });
      const isLead = membership?.role === "LEAD";
      const isOwner = wsMembership?.role === "OWNER";
      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead can manage managers." });
      }

      const updated = await ctx.prisma.teamMember.update({
        where: { teamId_userId: { teamId: input.teamId, userId: input.memberId } },
        data: { managerId: null },
      });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.teamId } });

      return updated;
    }),

  assignManagerToProject: protectedProcedure
    .input(z.object({ projectId: z.string(), managerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      if (!project.teamId) throw new TRPCError({ code: "BAD_REQUEST", message: "Project is not associated with a team." });

      const team = await ctx.prisma.team.findUnique({ where: { id: project.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: project.teamId, userId: ctx.session.user.id } },
      });
      const wsMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });
      const isLead = membership?.role === "LEAD";
      const isOwner = wsMembership?.role === "OWNER";
      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead can manage managers." });
      }

      // Verify the manager is a MANAGER in the project's team
      const managerMembership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: project.teamId, userId: input.managerId } },
      });
      if (!managerMembership || managerMembership.role !== "MANAGER") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The specified user is not a manager in this team." });
      }

      const updated = await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { managerId: input.managerId },
      });

      const actor = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } });
      await ctx.prisma.notification.create({
        data: {
          userId: input.managerId,
          type: "TASK_ASSIGNED",
          resourceType: "project",
          resourceId: input.projectId,
          actorId: ctx.session.user.id,
          message: `${actor?.name ?? "Someone"} assigned you to manage project "${project.name}"`,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.NOTIFICATION_NEW, workspaceId: team.workspaceId, data: {} });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: project.teamId } });

      return updated;
    }),

  removeManagerFromProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      if (!project.teamId) throw new TRPCError({ code: "BAD_REQUEST", message: "Project is not associated with a team." });

      const team = await ctx.prisma.team.findUnique({ where: { id: project.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: project.teamId, userId: ctx.session.user.id } },
      });
      const wsMembership = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: team.workspaceId, userId: ctx.session.user.id } },
      });
      const isLead = membership?.role === "LEAD";
      const isOwner = wsMembership?.role === "OWNER";
      if (!isLead && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team lead can manage managers." });
      }

      const updated = await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { managerId: null },
      });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: project.teamId } });

      return updated;
    }),

  updateManagerTeamName: protectedProcedure
    .input(z.object({ teamId: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const membership = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } },
      });

      if (!membership || membership.role !== "MANAGER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only managers can set their sub-team name." });
      }

      const updated = await ctx.prisma.teamMember.update({
        where: { teamId_userId: { teamId: input.teamId, userId: ctx.session.user.id } },
        data: { managerTeamName: input.name },
      });

      realtime.publish({ type: REALTIME_EVENTS.TEAM_UPDATED, workspaceId: team.workspaceId, data: { teamId: input.teamId } });

      return updated;
    }),

  getManagers: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const managers = await ctx.prisma.teamMember.findMany({
        where: { teamId: input.teamId, role: "MANAGER" },
        include: { user: true },
      });

      const managersWithCounts = await Promise.all(
        managers.map(async (manager) => {
          const membersManaged = await ctx.prisma.teamMember.count({
            where: { teamId: input.teamId, managerId: manager.userId },
          });
          const projectsManaged = await ctx.prisma.project.count({
            where: { teamId: input.teamId, managerId: manager.userId },
          });
          return {
            ...manager,
            _count: {
              membersManaged,
              projectsManaged,
            },
          };
        })
      );

      return managersWithCounts;
    }),
});
