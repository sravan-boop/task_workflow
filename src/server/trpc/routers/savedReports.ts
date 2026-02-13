import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const savedReportsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.savedReport.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { updatedAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(200),
        config: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.savedReport.create({
        data: {
          name: input.name,
          workspaceId: input.workspaceId,
          createdById: ctx.session.user.id,
          config: input.config,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        config: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.savedReport.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.savedReport.delete({ where: { id: input.id } });
    }),
});
