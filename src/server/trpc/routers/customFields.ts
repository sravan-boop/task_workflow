import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { evaluateFormula, evaluateRollup } from "@/lib/formula-evaluator";

export const customFieldsRouter = router({
  listDefinitions: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customFieldDefinition.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" },
      });
    }),

  createDefinition: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        type: z.enum([
          "TEXT",
          "NUMBER",
          "DATE",
          "SINGLE_SELECT",
          "MULTI_SELECT",
          "PEOPLE",
          "CURRENCY",
          "PERCENTAGE",
          "FORMULA",
          "ROLLUP",
        ]),
        options: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customFieldDefinition.create({
        data: {
          name: input.name,
          type: input.type,
          options: input.options,
          workspaceId: input.workspaceId,
          createdById: ctx.session.user.id,
        },
      });
    }),

  addToProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        customFieldId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectCustomField.create({
        data: {
          projectId: input.projectId,
          customFieldId: input.customFieldId,
        },
      });
    }),

  removeFromProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        customFieldId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectCustomField.deleteMany({
        where: {
          projectId: input.projectId,
          customFieldId: input.customFieldId,
        },
      });
    }),

  listForProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.projectCustomField.findMany({
        where: { projectId: input.projectId },
        include: { customField: true },
        orderBy: { position: "asc" },
      });
    }),

  setValue: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        customFieldId: z.string(),
        stringValue: z.string().nullable().optional(),
        numberValue: z.number().nullable().optional(),
        dateValue: z.string().datetime().nullable().optional(),
        selectedOptions: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.taskCustomFieldValue.upsert({
        where: {
          taskId_customFieldId: {
            taskId: input.taskId,
            customFieldId: input.customFieldId,
          },
        },
        create: {
          taskId: input.taskId,
          customFieldId: input.customFieldId,
          stringValue: input.stringValue,
          numberValue: input.numberValue,
          dateValue: input.dateValue ? new Date(input.dateValue) : undefined,
          selectedOptions: input.selectedOptions,
        },
        update: {
          stringValue: input.stringValue,
          numberValue: input.numberValue,
          dateValue: input.dateValue ? new Date(input.dateValue) : null,
          selectedOptions: input.selectedOptions,
        },
      });
    }),

  evaluateFormulaField: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        customFieldId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const field = await ctx.prisma.customFieldDefinition.findUniqueOrThrow({
        where: { id: input.customFieldId },
      });

      if (field.type !== "FORMULA") {
        throw new Error("Field is not a formula type");
      }

      const options = field.options as { expression?: string } | null;
      if (!options?.expression) return { result: null };

      // Get all custom field values for this task
      const fieldValues = await ctx.prisma.taskCustomFieldValue.findMany({
        where: { taskId: input.taskId },
        include: { customField: true },
      });

      const valueMap: Record<string, number | string | null> = {};
      for (const fv of fieldValues) {
        valueMap[fv.customField.name] = fv.numberValue ?? fv.stringValue ?? null;
      }

      const result = evaluateFormula(options.expression, valueMap);
      return { result };
    }),

  evaluateRollupField: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        customFieldId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const field = await ctx.prisma.customFieldDefinition.findUniqueOrThrow({
        where: { id: input.customFieldId },
      });

      if (field.type !== "ROLLUP") {
        throw new Error("Field is not a rollup type");
      }

      const options = field.options as {
        aggregation?: "SUM" | "COUNT" | "AVG" | "MIN" | "MAX";
        sourceFieldId?: string;
      } | null;

      if (!options?.aggregation || !options?.sourceFieldId) return { result: 0 };

      // Get subtask values for the source field
      const subtasks = await ctx.prisma.task.findMany({
        where: { parentTaskId: input.taskId },
        select: { id: true },
      });

      const subtaskIds = subtasks.map((s) => s.id);
      if (subtaskIds.length === 0) return { result: 0 };

      const values = await ctx.prisma.taskCustomFieldValue.findMany({
        where: {
          taskId: { in: subtaskIds },
          customFieldId: options.sourceFieldId,
        },
      });

      const numbers = values
        .map((v) => v.numberValue)
        .filter((n): n is number => n !== null);

      const result = evaluateRollup(options.aggregation, numbers);
      return { result };
    }),
});
