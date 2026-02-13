import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const reportingRouter = router({
  getProjectStats: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.prisma.project.findMany({
        where: { workspaceId: input.workspaceId },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });

      const stats = await Promise.all(
        projects.map(async (project) => {
          const now = new Date();

          const [total, completed, overdue] = await Promise.all([
            ctx.prisma.taskProject.count({
              where: { projectId: project.id },
            }),
            ctx.prisma.taskProject.count({
              where: {
                projectId: project.id,
                task: { status: "COMPLETE" },
              },
            }),
            ctx.prisma.taskProject.count({
              where: {
                projectId: project.id,
                task: {
                  status: "INCOMPLETE",
                  dueDate: { lt: now },
                },
              },
            }),
          ]);

          return {
            projectId: project.id,
            projectName: project.name,
            color: project.color,
            total,
            completed,
            incomplete: total - completed,
            overdue,
          };
        })
      );

      return stats;
    }),

  getWeeklyActivity: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const completedTasks = await ctx.prisma.task.findMany({
        where: {
          workspaceId: input.workspaceId,
          status: "COMPLETE",
          completedAt: {
            gte: sevenDaysAgo,
            lte: now,
          },
        },
        select: {
          completedAt: true,
        },
      });

      const createdTasks = await ctx.prisma.task.findMany({
        where: {
          workspaceId: input.workspaceId,
          createdAt: {
            gte: sevenDaysAgo,
            lte: now,
          },
        },
        select: {
          createdAt: true,
        },
      });

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const days: {
        day: string;
        date: string;
        completed: number;
        created: number;
      }[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(sevenDaysAgo.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        const completedCount = completedTasks.filter((t) => {
          if (!t.completedAt) return false;
          return t.completedAt.toISOString().split("T")[0] === dateStr;
        }).length;

        const createdCount = createdTasks.filter((t) => {
          return t.createdAt.toISOString().split("T")[0] === dateStr;
        }).length;

        days.push({
          day: dayNames[date.getDay()]!,
          date: dateStr!,
          completed: completedCount,
          created: createdCount,
        });
      }

      return days;
    }),

  getTasksByStatus: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [completed, incomplete] = await Promise.all([
        ctx.prisma.task.count({
          where: {
            workspaceId: input.workspaceId,
            status: "COMPLETE",
          },
        }),
        ctx.prisma.task.count({
          where: {
            workspaceId: input.workspaceId,
            status: "INCOMPLETE",
          },
        }),
      ]);

      const overdue = await ctx.prisma.task.count({
        where: {
          workspaceId: input.workspaceId,
          status: "INCOMPLETE",
          dueDate: { lt: new Date() },
        },
      });

      const onTrack = incomplete - overdue;

      return {
        completed,
        incomplete,
        overdue,
        onTrack: Math.max(0, onTrack),
        total: completed + incomplete,
      };
    }),

  getProjectTasksBySection: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sections = await ctx.prisma.section.findMany({
        where: { projectId: input.projectId },
        include: {
          taskProjects: {
            include: { task: { select: { status: true } } },
          },
        },
        orderBy: { position: "asc" },
      });

      return sections.map((section) => ({
        name: section.name,
        total: section.taskProjects.length,
        completed: section.taskProjects.filter(
          (tp) => tp.task.status === "COMPLETE"
        ).length,
        incomplete: section.taskProjects.filter(
          (tp) => tp.task.status === "INCOMPLETE"
        ).length,
      }));
    }),

  getProjectCompletionTrend: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      startDate.setHours(0, 0, 0, 0);

      const tasks = await ctx.prisma.task.findMany({
        where: {
          taskProjects: { some: { projectId: input.projectId } },
          status: "COMPLETE",
          completedAt: { gte: startDate },
        },
        select: { completedAt: true },
      });

      const trend: { date: string; completed: number; cumulative: number }[] = [];
      let cumulative = 0;

      for (let i = 0; i <= input.days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0]!;

        const dayCount = tasks.filter((t) => {
          if (!t.completedAt) return false;
          return t.completedAt.toISOString().split("T")[0] === dateStr;
        }).length;

        cumulative += dayCount;
        trend.push({ date: dateStr, completed: dayCount, cumulative });
      }

      return trend;
    }),

  getProjectBurnup: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      startDate.setHours(0, 0, 0, 0);

      const allTasks = await ctx.prisma.task.findMany({
        where: {
          taskProjects: { some: { projectId: input.projectId } },
        },
        select: { createdAt: true, completedAt: true, status: true },
      });

      const totalScope = allTasks.length;
      const completedTasks = allTasks.filter(
        (t) => t.status === "COMPLETE" && t.completedAt && t.completedAt >= startDate
      );

      const burnup: { date: string; scope: number; completed: number; ideal: number }[] = [];
      let cumulativeCompleted = allTasks.filter(
        (t) => t.status === "COMPLETE" && t.completedAt && t.completedAt < startDate
      ).length;

      for (let i = 0; i <= input.days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0]!;

        const dayCompleted = completedTasks.filter((t) => {
          return t.completedAt!.toISOString().split("T")[0] === dateStr;
        }).length;

        cumulativeCompleted += dayCompleted;

        burnup.push({
          date: dateStr,
          scope: totalScope,
          completed: cumulativeCompleted,
          ideal: Math.round((totalScope / input.days) * i),
        });
      }

      return burnup;
    }),
});
