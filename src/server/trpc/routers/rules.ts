import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const rulesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rule.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(200),
        trigger: z.object({
          type: z.enum([
            "TASK_ADDED",
            "TASK_MOVED",
            "TASK_COMPLETED",
            "FIELD_CHANGED",
            "DUE_DATE_APPROACHING",
          ]),
          config: z.any().optional(),
        }),
        conditions: z.any().optional(),
        actions: z.array(
          z.object({
            type: z.enum([
              "SET_ASSIGNEE",
              "MOVE_TO_SECTION",
              "SET_FIELD",
              "ADD_COMMENT",
              "COMPLETE_TASK",
              "SET_DUE_DATE",
            ]),
            config: z.any(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rule.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          trigger: input.trigger,
          conditions: input.conditions,
          actions: input.actions,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        trigger: z.any().optional(),
        conditions: z.any().optional(),
        actions: z.any().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.rule.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rule.delete({ where: { id: input.id } });
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rule.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),
});
