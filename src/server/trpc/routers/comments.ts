import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const commentsRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.comment.findMany({
        where: { taskId: input.taskId },
        include: { author: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        body: z.string().min(1),
        videoUrl: z.string().optional(),
        videoDuration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.create({
        data: {
          taskId: input.taskId,
          authorId: ctx.session.user.id,
          body: input.body,
          ...(input.videoUrl && { videoUrl: input.videoUrl }),
          ...(input.videoDuration !== undefined && { videoDuration: input.videoDuration }),
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
      return ctx.prisma.comment.update({
        where: { id: input.id, authorId: ctx.session.user.id },
        data: { body: input.body },
        include: { author: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.delete({
        where: { id: input.id },
      });
    }),
});
