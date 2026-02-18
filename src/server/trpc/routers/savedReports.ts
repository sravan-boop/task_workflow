import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";

export const savedReportsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Only show reports created by the current user
      return ctx.prisma.savedReport.findMany({
        where: {
          workspaceId: input.workspaceId,
          createdById: ctx.session.user.id,
        },
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
      const report = await ctx.prisma.savedReport.create({
        data: {
          name: input.name,
          workspaceId: input.workspaceId,
          createdById: ctx.session.user.id,
          config: input.config,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.REPORT_CREATED, workspaceId: input.workspaceId, data: { reportId: report.id } });
      return report;
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
      // Only allow updating own reports
      const existing = await ctx.prisma.savedReport.findUniqueOrThrow({ where: { id: input.id } });
      if (existing.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own reports" });
      }
      const { id, ...data } = input;
      const report = await ctx.prisma.savedReport.update({ where: { id }, data });
      realtime.publish({ type: REALTIME_EVENTS.REPORT_UPDATED, workspaceId: report.workspaceId, data: { reportId: report.id } });
      return report;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only allow deleting own reports
      const report = await ctx.prisma.savedReport.findUniqueOrThrow({ where: { id: input.id } });
      if (report.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own reports" });
      }
      const result = await ctx.prisma.savedReport.delete({ where: { id: input.id } });
      realtime.publish({ type: REALTIME_EVENTS.REPORT_DELETED, workspaceId: report.workspaceId, data: { reportId: input.id } });
      return result;
    }),
});
