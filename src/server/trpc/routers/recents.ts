import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const recentsRouter = router({
  track: protectedProcedure
    .input(
      z.object({
        resourceType: z.enum(["project", "task", "portfolio", "goal"]),
        resourceId: z.string(),
        resourceName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.visitHistory.upsert({
        where: {
          userId_resourceType_resourceId: {
            userId: ctx.session.user.id,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
          },
        },
        create: {
          userId: ctx.session.user.id,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          resourceName: input.resourceName,
        },
        update: {
          visitedAt: new Date(),
          resourceName: input.resourceName,
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.visitHistory.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { visitedAt: "desc" },
        take: input.limit,
      });
    }),
});
