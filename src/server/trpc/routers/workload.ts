import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const workloadRouter = router({
  getTeamWorkload: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      const workloads = await Promise.all(
        members.map(async (member) => {
          const tasks = await ctx.prisma.task.findMany({
            where: {
              assigneeId: member.userId,
              workspaceId: input.workspaceId,
              status: "INCOMPLETE",
            },
            select: {
              id: true,
              title: true,
              dueDate: true,
              estimatedHours: true,
              storyPoints: true,
            },
          });

          const capacity = await ctx.prisma.userCapacity.findUnique({
            where: {
              userId_workspaceId: {
                userId: member.userId,
                workspaceId: input.workspaceId,
              },
            },
          });

          const totalEstimatedHours = tasks.reduce(
            (sum, t) => sum + (t.estimatedHours ?? 0),
            0
          );

          const weeklyCapacity = capacity?.weeklyHours ?? 40;

          return {
            user: member.user,
            taskCount: tasks.length,
            totalEstimatedHours,
            weeklyCapacity,
            utilization:
              weeklyCapacity > 0
                ? Math.round((totalEstimatedHours / weeklyCapacity) * 100)
                : 0,
            tasks,
          };
        })
      );

      return workloads;
    }),

  setCapacity: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        workspaceId: z.string(),
        weeklyHours: z.number().min(0).max(168),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userCapacity.upsert({
        where: {
          userId_workspaceId: {
            userId: input.userId,
            workspaceId: input.workspaceId,
          },
        },
        create: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          weeklyHours: input.weeklyHours,
        },
        update: {
          weeklyHours: input.weeklyHours,
        },
      });
    }),

  getCapacity: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.userCapacity.findUnique({
        where: {
          userId_workspaceId: {
            userId: input.userId,
            workspaceId: input.workspaceId,
          },
        },
      });
    }),
});
