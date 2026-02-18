import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";

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

      const section = await ctx.prisma.section.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          position,
        },
      });
      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId }, select: { workspaceId: true } });
      if (project) {
        realtime.publish({ type: REALTIME_EVENTS.SECTION_UPDATED, workspaceId: project.workspaceId, data: { projectId: input.projectId } });
      }
      return section;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.prisma.section.update({
        where: { id: input.id },
        data: { name: input.name },
      });
      const project = await ctx.prisma.project.findUnique({ where: { id: section.projectId }, select: { workspaceId: true } });
      if (project) {
        realtime.publish({ type: REALTIME_EVENTS.SECTION_UPDATED, workspaceId: project.workspaceId, data: { projectId: section.projectId } });
      }
      return section;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.prisma.section.findUnique({ where: { id: input.id }, select: { projectId: true } });
      const result = await ctx.prisma.section.delete({
        where: { id: input.id },
      });
      if (section) {
        const project = await ctx.prisma.project.findUnique({ where: { id: section.projectId }, select: { workspaceId: true } });
        if (project) {
          realtime.publish({ type: REALTIME_EVENTS.SECTION_UPDATED, workspaceId: project.workspaceId, data: { projectId: section.projectId } });
        }
      }
      return result;
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
      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId }, select: { workspaceId: true } });
      if (project) {
        realtime.publish({ type: REALTIME_EVENTS.SECTION_UPDATED, workspaceId: project.workspaceId, data: { projectId: input.projectId } });
      }
      return { success: true };
    }),
});
