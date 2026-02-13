import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const sectionsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.section.findMany({
        where: { projectId: input.projectId },
        orderBy: { position: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the max position to append at the end
      const lastSection = await ctx.prisma.section.findFirst({
        where: { projectId: input.projectId },
        orderBy: { position: "desc" },
      });

      const position = (lastSection?.position ?? 0) + 1;

      return ctx.prisma.section.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          position,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.section.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.section.delete({
        where: { id: input.id },
      });
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sectionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.sectionIds.map((id, index) =>
        ctx.prisma.section.update({
          where: { id },
          data: { position: index + 1 },
        })
      );

      await ctx.prisma.$transaction(updates);
      return { success: true };
    }),
});
