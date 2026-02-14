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

  addMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        email: z.string().email(),
        role: z.enum(["LEAD", "MEMBER"]).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new Error("User not found. They must register first.");
      }
      // Check if already a member
      const existing = await ctx.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: user.id } },
      });
      if (existing) {
        throw new Error("User is already a member of this team.");
      }
      return ctx.prisma.teamMember.create({
        data: {
          teamId: input.teamId,
          userId: user.id,
          role: input.role,
        },
        include: { user: true },
      });
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.teamMember.deleteMany({
        where: {
          teamId: input.teamId,
          userId: input.userId,
        },
      });
    }),
});
