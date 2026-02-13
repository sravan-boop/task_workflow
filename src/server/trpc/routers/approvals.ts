import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const approvalsRouter = router({
  request: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        approverId: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Mark task as approval
      await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: { isApproval: true, approvalStatus: "PENDING" },
      });

      const approval = await ctx.prisma.approvalRequest.create({
        data: {
          taskId: input.taskId,
          requesterId: ctx.session.user.id,
          approverId: input.approverId,
          comment: input.comment,
        },
      });

      // Create notification for approver
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { title: true },
      });

      await ctx.prisma.notification.create({
        data: {
          userId: input.approverId,
          type: "APPROVAL_REQUEST",
          resourceType: "task",
          resourceId: input.taskId,
          actorId: ctx.session.user.id,
          message: `Approval requested for "${task?.title}"`,
        },
      });

      return approval;
    }),

  respond: protectedProcedure
    .input(
      z.object({
        approvalId: z.string(),
        status: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approval = await ctx.prisma.approvalRequest.update({
        where: { id: input.approvalId },
        data: {
          status: input.status,
          comment: input.comment,
        },
      });

      // Update task approval status
      await ctx.prisma.task.update({
        where: { id: approval.taskId },
        data: { approvalStatus: input.status },
      });

      // Notify the requester
      const task = await ctx.prisma.task.findUnique({
        where: { id: approval.taskId },
        select: { title: true },
      });

      await ctx.prisma.notification.create({
        data: {
          userId: approval.requesterId,
          type: "APPROVAL_RESPONSE",
          resourceType: "task",
          resourceId: approval.taskId,
          actorId: ctx.session.user.id,
          message: `"${task?.title}" was ${input.status.toLowerCase().replace("_", " ")}`,
        },
      });

      return approval;
    }),

  listForTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.approvalRequest.findMany({
        where: { taskId: input.taskId },
        orderBy: { createdAt: "desc" },
      });
    }),

  listPending: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.approvalRequest.findMany({
      where: {
        approverId: ctx.session.user.id,
        status: "PENDING",
      },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
});
