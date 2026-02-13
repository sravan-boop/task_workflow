import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const dashboardsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dashboardConfig.findMany({
        where: input.projectId ? { projectId: input.projectId } : { createdById: ctx.session.user.id },
        orderBy: { updatedAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dashboardConfig.findUniqueOrThrow({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        projectId: z.string().optional(),
        layout: z.any(),
        widgets: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dashboardConfig.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          createdById: ctx.session.user.id,
          layout: input.layout,
          widgets: input.widgets,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        layout: z.any().optional(),
        widgets: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.dashboardConfig.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dashboardConfig.delete({ where: { id: input.id } });
    }),
});
