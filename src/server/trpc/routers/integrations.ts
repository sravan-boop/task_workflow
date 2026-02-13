import { z } from "zod";
import crypto from "crypto";
import { router, protectedProcedure } from "../trpc";

export const integrationsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.integration.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ workspaceId: z.string(), type: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.integration.findUnique({
        where: {
          workspaceId_type: {
            workspaceId: input.workspaceId,
            type: input.type,
          },
        },
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        type: z.string(),
        name: z.string(),
        config: z.any().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.integration.upsert({
        where: {
          workspaceId_type: {
            workspaceId: input.workspaceId,
            type: input.type,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          type: input.type,
          name: input.name,
          config: input.config,
          isActive: input.isActive,
          createdById: ctx.session.user.id,
        },
        update: {
          name: input.name,
          config: input.config,
          isActive: input.isActive,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.integration.delete({ where: { id: input.id } });
    }),

  generateApiKey: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = `tfai_${crypto.randomBytes(32).toString("hex")}`;
      // Store the API key in integration config for Zapier
      await ctx.prisma.integration.upsert({
        where: {
          workspaceId_type: {
            workspaceId: input.workspaceId,
            type: "zapier",
          },
        },
        create: {
          workspaceId: input.workspaceId,
          type: "zapier",
          name: "Zapier",
          config: { apiKey },
          createdById: ctx.session.user.id,
        },
        update: {
          config: { apiKey },
        },
      });
      return { apiKey };
    }),

  generateCalendarToken: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomBytes(24).toString("hex");
      await ctx.prisma.integration.upsert({
        where: {
          workspaceId_type: {
            workspaceId: input.workspaceId,
            type: "calendar",
          },
        },
        create: {
          workspaceId: input.workspaceId,
          type: "calendar",
          name: "Calendar Sync",
          config: { token, userId: ctx.session.user.id },
          createdById: ctx.session.user.id,
        },
        update: {
          config: { token, userId: ctx.session.user.id },
        },
      });
      return { token, feedUrl: `/api/calendar/feed/${token}` };
    }),
});
