import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

const VALID_EMOJIS = ["thumbsUp", "heart", "celebration", "clap", "fire"] as const;

export const reactionsRouter = router({
  toggle: protectedProcedure
    .input(
      z.object({
        emoji: z.enum(VALID_EMOJIS),
        taskId: z.string().optional(),
        commentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.taskId && !input.commentId) {
        throw new Error("Must provide either taskId or commentId");
      }

      if (input.taskId) {
        const existing = await ctx.prisma.reaction.findUnique({
          where: {
            userId_emoji_taskId: {
              userId: ctx.session.user.id,
              emoji: input.emoji,
              taskId: input.taskId,
            },
          },
        });
        if (existing) {
          await ctx.prisma.reaction.delete({ where: { id: existing.id } });
          return { added: false };
        }
        await ctx.prisma.reaction.create({
          data: {
            userId: ctx.session.user.id,
            emoji: input.emoji,
            taskId: input.taskId,
          },
        });
        return { added: true };
      }

      const existing = await ctx.prisma.reaction.findUnique({
        where: {
          userId_emoji_commentId: {
            userId: ctx.session.user.id,
            emoji: input.emoji,
            commentId: input.commentId!,
          },
        },
      });
      if (existing) {
        await ctx.prisma.reaction.delete({ where: { id: existing.id } });
        return { added: false };
      }
      await ctx.prisma.reaction.create({
        data: {
          userId: ctx.session.user.id,
          emoji: input.emoji,
          commentId: input.commentId,
        },
      });
      return { added: true };
    }),

  listForTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reaction.findMany({
        where: { taskId: input.taskId },
        include: { user: { select: { id: true, name: true } } },
      });
    }),

  listForComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reaction.findMany({
        where: { commentId: input.commentId },
        include: { user: { select: { id: true, name: true } } },
      });
    }),
});
