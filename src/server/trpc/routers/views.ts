import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const viewsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.savedProjectView.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100),
        config: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.savedProjectView.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          createdById: ctx.session.user.id,
          config: input.config,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        config: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.savedProjectView.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.savedProjectView.delete({ where: { id: input.id } });
    }),
});
