import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";
import { verifyTaskAccess } from "../../services/authorization";

export const commentsRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
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
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      const comment = await ctx.prisma.comment.create({
        data: {
          taskId: input.taskId,
          authorId: ctx.session.user.id,
          body: input.body,
          ...(input.videoUrl && { videoUrl: input.videoUrl }),
          ...(input.videoDuration !== undefined && { videoDuration: input.videoDuration }),
        },
        include: { author: true },
      });
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { workspaceId: true, assigneeId: true, createdById: true, title: true },
      });
      if (task) {
        realtime.publish({ type: REALTIME_EVENTS.COMMENT_ADDED, workspaceId: task.workspaceId, data: { taskId: input.taskId, commentId: comment.id } });

        // Send COMMENT_ADDED notifications
        const actor = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true },
        });
        const notifiedIds = new Set<string>();
        // Notify task assignee if not the commenter
        if (task.assigneeId && task.assigneeId !== ctx.session.user.id) {
          await ctx.prisma.notification.create({
            data: {
              userId: task.assigneeId,
              type: "COMMENT_ADDED",
              resourceType: "task",
              resourceId: input.taskId,
              actorId: ctx.session.user.id,
              message: `${actor?.name ?? "Someone"} commented on "${task.title}"`,
            },
          });
          notifiedIds.add(task.assigneeId);
        }
        // Notify task creator if not the commenter and not already notified
        if (
          task.createdById &&
          task.createdById !== ctx.session.user.id &&
          !notifiedIds.has(task.createdById)
        ) {
          await ctx.prisma.notification.create({
            data: {
              userId: task.createdById,
              type: "COMMENT_ADDED",
              resourceType: "task",
              resourceId: input.taskId,
              actorId: ctx.session.user.id,
              message: `${actor?.name ?? "Someone"} commented on "${task.title}"`,
            },
          });
        }
      }
      return comment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.prisma.comment.update({
        where: { id: input.id, authorId: ctx.session.user.id },
        data: { body: input.body },
        include: { author: true },
      });
      const task = await ctx.prisma.task.findUnique({ where: { id: comment.taskId }, select: { workspaceId: true } });
      if (task) {
        realtime.publish({ type: REALTIME_EVENTS.COMMENT_UPDATED, workspaceId: task.workspaceId, data: { taskId: comment.taskId, commentId: comment.id } });
      }
      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only allow deleting own comments
      const comment = await ctx.prisma.comment.findUnique({ where: { id: input.id }, select: { taskId: true, authorId: true } });
      if (!comment) {
        throw new Error("Comment not found");
      }
      if (comment.authorId !== ctx.session.user.id) {
        await verifyTaskAccess(ctx.prisma, comment.taskId, ctx.session.user.id);
      }
      const result = await ctx.prisma.comment.delete({
        where: { id: input.id },
      });
      const task = await ctx.prisma.task.findUnique({ where: { id: comment.taskId }, select: { workspaceId: true } });
      if (task) {
        realtime.publish({ type: REALTIME_EVENTS.COMMENT_DELETED, workspaceId: task.workspaceId, data: { taskId: comment.taskId, commentId: input.id } });
      }
      return result;
    }),
});
