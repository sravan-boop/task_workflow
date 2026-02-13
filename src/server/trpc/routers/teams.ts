import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const teamsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.team.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          members: { include: { user: true } },
          _count: { select: { members: true, projects: true } },
        },
        orderBy: { name: "asc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.team.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          members: { include: { user: true } },
          projects: true,
          _count: { select: { members: true, projects: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.team.create({
        data: {
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "LEAD",
            },
          },
        },
      });
    }),
});
