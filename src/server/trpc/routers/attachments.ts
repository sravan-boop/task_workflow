import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { verifyTaskAccess, verifyProjectAccess } from "../../services/authorization";

export const attachmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.attachment.findMany({
        where: { taskId: input.taskId },
        include: { uploadedBy: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.session.user.id);
      return ctx.prisma.attachment.findMany({
        where: {
          task: {
            taskProjects: {
              some: { projectId: input.projectId },
            },
          },
        },
        include: {
          uploadedBy: true,
          task: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.attachment.create({
        data: {
          taskId: input.taskId,
          uploadedById: ctx.session.user.id,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        },
        include: { uploadedBy: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the task this attachment belongs to
      const attachment = await ctx.prisma.attachment.findUniqueOrThrow({
        where: { id: input.id },
        select: { taskId: true },
      });
      await verifyTaskAccess(ctx.prisma, attachment.taskId, ctx.session.user.id);
      return ctx.prisma.attachment.delete({
        where: { id: input.id },
      });
    }),
});
