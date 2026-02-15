import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

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
      return ctx.prisma.goal.findMany({
        where: {
          workspaceId: input.workspaceId,
          parentGoalId: null,
          ...(input.teamId && { teamId: input.teamId }),
          ...(input.status && { status: input.status }),
        },
        include: {
          team: true,
          childGoals: {
            include: {
              team: true,
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
      return ctx.prisma.goal.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          team: true,
          parentGoal: true,
          childGoals: {
            include: {
              team: true,
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
        timePeriodStart: z.string().datetime().optional(),
        timePeriodEnd: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.goal.create({
        data: {
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          teamId: input.teamId,
          ownerId: ctx.session.user.id,
          parentGoalId: input.parentGoalId,
          targetValue: input.targetValue,
          unit: input.unit,
          timePeriodStart: input.timePeriodStart
            ? new Date(input.timePeriodStart)
            : undefined,
          timePeriodEnd: input.timePeriodEnd
            ? new Date(input.timePeriodEnd)
            : undefined,
        },
      });
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, timePeriodStart, timePeriodEnd, ...data } = input;
      return ctx.prisma.goal.update({
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
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.goal.delete({
        where: { id: input.id },
      });
    }),
});
