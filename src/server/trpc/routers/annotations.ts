import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const annotationsRouter = router({
  list: protectedProcedure
    .input(z.object({ attachmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.annotation.findMany({
        where: { attachmentId: input.attachmentId },
        include: { author: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        attachmentId: z.string(),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.annotation.create({
        data: {
          attachmentId: input.attachmentId,
          authorId: ctx.session.user.id,
          x: input.x,
          y: input.y,
          body: input.body,
        },
        include: { author: true },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.annotation.update({
        where: { id: input.id },
        data: { body: input.body },
        include: { author: true },
      });
    }),

  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.annotation.update({
        where: { id: input.id },
        data: { resolved: true },
        include: { author: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.annotation.delete({
        where: { id: input.id },
      });
    }),
});
