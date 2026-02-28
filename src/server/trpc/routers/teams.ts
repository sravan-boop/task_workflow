import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

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

      return ctx.prisma.team.update({
        where: { id: input.id },
        data: { name: input.name, description: input.description },
      });
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
});
