import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const attachmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.attachment.findMany({
        where: { taskId: input.taskId },
        include: { uploadedBy: true },
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
      return ctx.prisma.attachment.delete({
        where: { id: input.id },
      });
    }),
});
