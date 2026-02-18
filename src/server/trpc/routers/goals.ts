import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";

export const goalsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        teamId: z.string().optional(),
        status: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK", "CLOSED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get team IDs the user belongs to
      const userTeams = await ctx.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const userTeamIds = userTeams.map((t) => t.teamId);

      return ctx.prisma.goal.findMany({
        where: {
          workspaceId: input.workspaceId,
          parentGoalId: null,
          ...(input.teamId && { teamId: input.teamId }),
          ...(input.status && { status: input.status }),
          // User can see goals they own, PUBLIC goals, or TEAM_ONLY goals for their teams
          OR: [
            { ownerId: userId },
            { privacy: "PUBLIC" },
            ...(userTeamIds.length > 0
              ? [{ privacy: "TEAM_ONLY" as const, teamId: { in: userTeamIds } }]
              : []),
          ],
        },
        include: {
          team: true,
          owner: { select: { id: true, name: true, email: true } },
          childGoals: {
            include: {
              team: true,
              owner: { select: { id: true, name: true, email: true } },
              _count: { select: { childGoals: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access: owner, PUBLIC, or TEAM_ONLY for user's teams
      const userId = ctx.session.user.id;
      const userTeams = await ctx.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const userTeamIds = userTeams.map((t) => t.teamId);
      const accessCheck = await ctx.prisma.goal.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
            { privacy: "PUBLIC" },
            ...(userTeamIds.length > 0
              ? [{ privacy: "TEAM_ONLY" as const, teamId: { in: userTeamIds } }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (!accessCheck) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this goal" });
      }
      return ctx.prisma.goal.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          team: true,
          owner: { select: { id: true, name: true, email: true } },
          parentGoal: true,
          childGoals: {
            include: {
              team: true,
              owner: { select: { id: true, name: true, email: true } },
              childGoals: true,
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        teamId: z.string().optional(),
        parentGoalId: z.string().optional(),
        targetValue: z.number().default(100),
        unit: z.string().default("percent"),
        privacy: z.enum(["PUBLIC", "PRIVATE", "TEAM_ONLY"]).default("PUBLIC"),
        timePeriodStart: z.string().datetime().optional(),
        timePeriodEnd: z.string().datetime().optional(),
        ownerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.create({
        data: {
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          teamId: input.teamId,
          ownerId: input.ownerId || ctx.session.user.id,
          parentGoalId: input.parentGoalId,
          targetValue: input.targetValue,
          unit: input.unit,
          privacy: input.privacy,
          timePeriodStart: input.timePeriodStart
            ? new Date(input.timePeriodStart)
            : undefined,
          timePeriodEnd: input.timePeriodEnd
            ? new Date(input.timePeriodEnd)
            : undefined,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.GOAL_CREATED, workspaceId: input.workspaceId, data: { goalId: goal.id } });
      return goal;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        status: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK", "CLOSED"]).optional(),
        currentValue: z.number().optional(),
        targetValue: z.number().optional(),
        timePeriodStart: z.string().datetime().optional(),
        timePeriodEnd: z.string().datetime().optional(),
        ownerId: z.string().optional(),
        teamId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, timePeriodStart, timePeriodEnd, ...data } = input;
      const goal = await ctx.prisma.goal.update({
        where: { id },
        data: {
          ...data,
          ...(timePeriodStart !== undefined && {
            timePeriodStart: new Date(timePeriodStart),
          }),
          ...(timePeriodEnd !== undefined && {
            timePeriodEnd: new Date(timePeriodEnd),
          }),
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.GOAL_UPDATED, workspaceId: goal.workspaceId, data: { goalId: goal.id } });
      return goal;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findUnique({ where: { id: input.id }, select: { workspaceId: true } });
      const result = await ctx.prisma.goal.delete({
        where: { id: input.id },
      });
      if (goal) {
        realtime.publish({ type: REALTIME_EVENTS.GOAL_DELETED, workspaceId: goal.workspaceId, data: { goalId: input.id } });
      }
      return result;
    }),
});
