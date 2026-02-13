import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        filter: z.enum(["all", "unread", "archived"]).default("all"),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        userId: ctx.session.user.id,
      };

      if (input.filter === "unread") {
        where.isRead = false;
        where.isArchived = false;
      } else if (input.filter === "archived") {
        where.isArchived = true;
      } else {
        where.isArchived = false;
      }

      const notifications = await ctx.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (notifications.length > input.limit) {
        const next = notifications.pop();
        nextCursor = next?.id;
      }

      return { notifications, nextCursor };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.count({
      where: {
        userId: ctx.session.user.id,
        isRead: false,
        isArchived: false,
      },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { isRead: true },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });
  }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { isArchived: true },
      });
    }),

  archiveAll: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        isArchived: false,
      },
      data: { isArchived: true },
    });
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { notificationPreferences: true },
    });
    return (
      user.notificationPreferences ?? {
        emailEnabled: true,
        inAppEnabled: true,
        taskAssigned: { inApp: true, email: true },
        taskCompleted: { inApp: true, email: false },
        commentAdded: { inApp: true, email: true },
        mentioned: { inApp: true, email: true },
        statusUpdates: { inApp: true, email: false },
        dueDateApproaching: { inApp: true, email: true },
        followerAdded: { inApp: true, email: false },
      }
    );
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean(),
        inAppEnabled: z.boolean(),
        taskAssigned: z.object({ inApp: z.boolean(), email: z.boolean() }),
        taskCompleted: z.object({ inApp: z.boolean(), email: z.boolean() }),
        commentAdded: z.object({ inApp: z.boolean(), email: z.boolean() }),
        mentioned: z.object({ inApp: z.boolean(), email: z.boolean() }),
        statusUpdates: z.object({ inApp: z.boolean(), email: z.boolean() }),
        dueDateApproaching: z.object({
          inApp: z.boolean(),
          email: z.boolean(),
        }),
        followerAdded: z.object({ inApp: z.boolean(), email: z.boolean() }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { notificationPreferences: input },
        select: { notificationPreferences: true },
      });
    }),
});
