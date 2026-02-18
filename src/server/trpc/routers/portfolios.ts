import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";

export const portfoliosRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.prisma.portfolio.findMany({
        where: {
          workspaceId: input.workspaceId,
          parentPortfolioId: null,
          // User can see portfolios they own, are a member of, or that are PUBLIC
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
            { privacy: "PUBLIC" },
          ],
        },
        include: {
          projects: {
            include: {
              project: {
                include: {
                  _count: { select: { taskProjects: true } },
                  statusUpdates: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
          childPortfolios: {
            include: {
              _count: { select: { projects: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.portfolio.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          projects: {
            include: {
              project: {
                include: {
                  team: true,
                  createdBy: { select: { id: true, name: true, email: true } },
                  _count: { select: { taskProjects: true, sections: true } },
                  statusUpdates: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
          childPortfolios: {
            include: {
              _count: { select: { projects: true } },
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
        privacy: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
        defaultView: z.enum(["LIST", "BOARD", "TIMELINE", "CALENDAR"]).default("LIST"),
        parentPortfolioId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const portfolio = await ctx.prisma.portfolio.create({
        data: {
          name: input.name,
          description: input.description,
          privacy: input.privacy,
          defaultView: input.defaultView,
          workspaceId: input.workspaceId,
          ownerId: ctx.session.user.id,
          parentPortfolioId: input.parentPortfolioId,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.PORTFOLIO_CREATED, workspaceId: input.workspaceId, data: { portfolioId: portfolio.id } });
      return portfolio;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const portfolio = await ctx.prisma.portfolio.update({
        where: { id },
        data,
      });
      realtime.publish({ type: REALTIME_EVENTS.PORTFOLIO_UPDATED, workspaceId: portfolio.workspaceId, data: { portfolioId: portfolio.id } });
      return portfolio;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pf = await ctx.prisma.portfolio.findUnique({ where: { id: input.id }, select: { workspaceId: true } });
      const result = await ctx.prisma.portfolio.delete({
        where: { id: input.id },
      });
      if (pf) {
        realtime.publish({ type: REALTIME_EVENTS.PORTFOLIO_DELETED, workspaceId: pf.workspaceId, data: { portfolioId: input.id } });
      }
      return result;
    }),

  addProject: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.portfolioProject.create({
        data: {
          portfolioId: input.portfolioId,
          projectId: input.projectId,
        },
      });
      const pf = await ctx.prisma.portfolio.findUnique({ where: { id: input.portfolioId }, select: { workspaceId: true } });
      if (pf) {
        realtime.publish({ type: REALTIME_EVENTS.PORTFOLIO_UPDATED, workspaceId: pf.workspaceId, data: { portfolioId: input.portfolioId } });
      }
      return result;
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        userId: z.string(),
        permission: z.enum(["ADMIN", "EDITOR", "COMMENTER", "VIEWER"]).default("EDITOR"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.portfolioMember.upsert({
        where: {
          portfolioId_userId: {
            portfolioId: input.portfolioId,
            userId: input.userId,
          },
        },
        update: {
          permission: input.permission,
        },
        create: {
          portfolioId: input.portfolioId,
          userId: input.userId,
          permission: input.permission,
        },
      });

      // Send inbox notification to the invited user
      if (input.userId !== ctx.session.user.id) {
        const portfolio = await ctx.prisma.portfolio.findUnique({
          where: { id: input.portfolioId },
          select: { name: true },
        });
        const actor = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true },
        });
        await ctx.prisma.notification.create({
          data: {
            userId: input.userId,
            type: "PORTFOLIO_SHARED",
            resourceType: "portfolio",
            resourceId: input.portfolioId,
            actorId: ctx.session.user.id,
            message: `${actor?.name ?? "Someone"} invited you to the portfolio "${portfolio?.name ?? "Untitled"}" as ${input.permission.toLowerCase()}`,
          },
        });
      }

      return member;
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolioMember.deleteMany({
        where: {
          portfolioId: input.portfolioId,
          userId: input.userId,
        },
      });
    }),

  getMembers: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.portfolioMember.findMany({
        where: { portfolioId: input.portfolioId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }),

  removeProject: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolioProject.deleteMany({
        where: {
          portfolioId: input.portfolioId,
          projectId: input.projectId,
        },
      });
    }),

  getGoals: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.portfolioGoal.findMany({
        where: { portfolioId: input.portfolioId },
        include: {
          goal: {
            include: {
              team: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  connectGoal: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        goalId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolioGoal.upsert({
        where: {
          portfolioId_goalId: {
            portfolioId: input.portfolioId,
            goalId: input.goalId,
          },
        },
        update: {},
        create: {
          portfolioId: input.portfolioId,
          goalId: input.goalId,
        },
      });
    }),

  disconnectGoal: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        goalId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolioGoal.deleteMany({
        where: {
          portfolioId: input.portfolioId,
          goalId: input.goalId,
        },
      });
    }),
});
