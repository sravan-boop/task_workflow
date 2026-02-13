import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const portfoliosRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.portfolio.findMany({
        where: {
          workspaceId: input.workspaceId,
          parentPortfolioId: null,
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
        parentPortfolioId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolio.create({
        data: {
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          ownerId: ctx.session.user.id,
          parentPortfolioId: input.parentPortfolioId,
        },
      });
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
      return ctx.prisma.portfolio.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolio.delete({
        where: { id: input.id },
      });
    }),

  addProject: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.portfolioProject.create({
        data: {
          portfolioId: input.portfolioId,
          projectId: input.projectId,
        },
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
});
