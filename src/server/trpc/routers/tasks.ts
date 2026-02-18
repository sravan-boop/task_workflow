import { z } from "zod";
import { Prisma } from "../../../../prisma/generated/prisma/client";
import { router, protectedProcedure } from "../trpc";
import { executeRules } from "../../services/rules-engine";
import { realtime, REALTIME_EVENTS } from "../../services/realtime";
import { verifyProjectAccess, verifyTaskAccess } from "../../services/authorization";

function calculateNextDueDate(
  currentDueDate: Date | null,
  rule: {
    frequency: string;
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }
): Date | null {
  const base = currentDueDate || new Date();
  const next = new Date(base);

  switch (rule.frequency) {
    case "DAILY":
      next.setDate(next.getDate() + rule.interval);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7 * rule.interval);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + rule.interval);
      if (rule.dayOfMonth)
        next.setDate(
          Math.min(
            rule.dayOfMonth,
            new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
          )
        );
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
    default:
      return null;
  }

  return next;
}

export const tasksRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sectionId: z.string().optional(),
        status: z.enum(["INCOMPLETE", "COMPLETE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.session.user.id);
      return ctx.prisma.task.findMany({
        where: {
          taskProjects: {
            some: {
              projectId: input.projectId,
              ...(input.sectionId && { sectionId: input.sectionId }),
            },
          },
          ...(input.status && { status: input.status }),
          parentTaskId: null, // Only top-level tasks
        },
        include: {
          assignee: true,
          taskProjects: {
            where: { projectId: input.projectId },
            include: { section: true },
          },
          tags: { include: { tag: true } },
          _count: {
            select: { subtasks: true, comments: true, attachments: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      return ctx.prisma.task.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          assignee: true,
          createdBy: true,
          subtasks: {
            include: {
              assignee: true,
              _count: { select: { subtasks: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          taskProjects: {
            include: { project: true, section: true },
          },
          tags: { include: { tag: true } },
          customFieldValues: {
            include: { customField: true },
          },
          dependsOn: {
            include: { dependsOn: true },
          },
          blocking: {
            include: { task: true },
          },
          comments: {
            include: { author: true },
            orderBy: { createdAt: "asc" },
          },
          followers: {
            include: { user: true },
          },
          attachments: {
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: { comments: true, attachments: true, subtasks: true },
          },
        },
      });
    }),

  myTasks: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        status: z.enum(["INCOMPLETE", "COMPLETE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: ctx.session.user.id },
            { createdById: ctx.session.user.id },
          ],
          workspaceId: input.workspaceId,
          ...(input.status && { status: input.status }),
          parentTaskId: null,
        },
        include: {
          taskProjects: {
            include: { project: true, section: true },
          },
          tags: { include: { tag: true } },
          _count: {
            select: { subtasks: true, comments: true },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      });
    }),

  searchAll: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        query: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.prisma.task.findMany({
        where: {
          workspaceId: input.workspaceId,
          title: { contains: input.query, mode: "insensitive" },
          parentTaskId: null,
          // Only return tasks the user has access to
          OR: [
            { assigneeId: userId },
            { createdById: userId },
            { taskProjects: { some: { project: { OR: [
              { createdById: userId },
              { members: { some: { userId } } },
            ] } } } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          assignee: { select: { name: true } },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.any().optional(),
        assigneeId: z.string().optional(),
        dueDate: z.string().datetime().optional(),
        startDate: z.string().datetime().optional(),
        projectId: z.string().optional(),
        sectionId: z.string().optional(),
        parentTaskId: z.string().optional(),
        workspaceId: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve workspaceId from project if not provided
      let workspaceId = input.workspaceId;
      if (!workspaceId && input.projectId) {
        const project = await ctx.prisma.project.findUniqueOrThrow({
          where: { id: input.projectId },
          select: { workspaceId: true },
        });
        workspaceId = project.workspaceId;
      }
      if (!workspaceId) {
        // Fallback: get user's first workspace
        const membership = await ctx.prisma.workspaceMember.findFirst({
          where: { userId: ctx.session.user.id },
          select: { workspaceId: true },
        });
        workspaceId = membership?.workspaceId;
      }
      if (!workspaceId) {
        throw new Error("No workspace found");
      }

      // Build task project link only if projectId provided
      const taskProjectData = input.projectId
        ? {
            create: {
              projectId: input.projectId,
              sectionId: input.sectionId,
              position: await (async () => {
                const lastTaskProject = await ctx.prisma.taskProject.findFirst({
                  where: {
                    projectId: input.projectId!,
                    sectionId: input.sectionId,
                  },
                  orderBy: { position: "desc" },
                });
                return (lastTaskProject?.position ?? 0) + 1;
              })(),
            },
          }
        : undefined;

      const task = await ctx.prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId || ctx.session.user.id,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          priority: input.priority,
          parentTaskId: input.parentTaskId,
          workspaceId,
          createdById: ctx.session.user.id,
          ...(taskProjectData && { taskProjects: taskProjectData }),
          followers: {
            create: { userId: ctx.session.user.id },
          },
        },
        include: {
          assignee: true,
          taskProjects: {
            include: { project: true, section: true },
          },
        },
      });

      // Send TASK_ASSIGNED notification if assignee is different from creator
      const actualAssigneeId = input.assigneeId || ctx.session.user.id;
      if (actualAssigneeId !== ctx.session.user.id) {
        const actor = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true },
        });
        await ctx.prisma.notification.create({
          data: {
            userId: actualAssigneeId,
            type: "TASK_ASSIGNED",
            resourceType: "task",
            resourceId: task.id,
            actorId: ctx.session.user.id,
            message: `${actor?.name ?? "Someone"} assigned you to "${task.title}"`,
          },
        });
      }

      // Execute rules for TASK_ADDED (only if in a project)
      if (input.projectId) {
        executeRules(ctx.prisma, "TASK_ADDED", {
          projectId: input.projectId,
          taskId: task.id,
          userId: ctx.session.user.id,
        }).catch(console.error);
      }

      realtime.publish({ type: REALTIME_EVENTS.TASK_CREATED, workspaceId: workspaceId!, data: { taskId: task.id } });

      return task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        description: z.any().optional(),
        assigneeId: z.string().nullable().optional(),
        dueDate: z.string().datetime().nullable().optional(),
        startDate: z.string().datetime().nullable().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      const { id, ...data } = input;

      const task = await ctx.prisma.task.update({
        where: { id },
        data: {
          ...data,
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
          ...(data.startDate !== undefined && {
            startDate: data.startDate ? new Date(data.startDate) : null,
          }),
        },
        include: {
          assignee: true,
          taskProjects: {
            include: { project: true, section: true },
          },
        },
      });

      // Send TASK_ASSIGNED notification if assignee changed to someone else
      if (input.assigneeId && input.assigneeId !== ctx.session.user.id) {
        const actor = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true },
        });
        await ctx.prisma.notification.create({
          data: {
            userId: input.assigneeId,
            type: "TASK_ASSIGNED",
            resourceType: "task",
            resourceId: task.id,
            actorId: ctx.session.user.id,
            message: `${actor?.name ?? "Someone"} assigned you to "${task.title}"`,
          },
        });
      }

      realtime.publish({ type: REALTIME_EVENTS.TASK_UPDATED, workspaceId: task.workspaceId, data: { taskId: task.id } });

      return task;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      const completedTask = await ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          status: "COMPLETE",
          completedAt: new Date(),
        },
      });

      // Execute rules for TASK_COMPLETED
      const taskForRules = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        include: { taskProjects: true },
      });
      if (taskForRules?.taskProjects[0]?.projectId) {
        executeRules(ctx.prisma, "TASK_COMPLETED", {
          projectId: taskForRules.taskProjects[0].projectId,
          taskId: input.id,
          userId: ctx.session.user.id,
        }).catch(console.error); // Fire and forget - don't block the response
      }

      // Send TASK_COMPLETED notification to task creator and assignee
      const fullTask = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { createdById: true, title: true, assigneeId: true, followers: { select: { userId: true } } },
      });
      if (fullTask) {
        const actor = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true },
        });
        const notifiedIds = new Set<string>();
        // Notify creator if different from completer
        if (fullTask.createdById && fullTask.createdById !== ctx.session.user.id) {
          await ctx.prisma.notification.create({
            data: {
              userId: fullTask.createdById,
              type: "TASK_COMPLETED",
              resourceType: "task",
              resourceId: input.id,
              actorId: ctx.session.user.id,
              message: `${actor?.name ?? "Someone"} completed "${fullTask.title}"`,
            },
          });
          notifiedIds.add(fullTask.createdById);
        }
        // Notify assignee if different from both completer and creator
        if (
          fullTask.assigneeId &&
          fullTask.assigneeId !== ctx.session.user.id &&
          !notifiedIds.has(fullTask.assigneeId)
        ) {
          await ctx.prisma.notification.create({
            data: {
              userId: fullTask.assigneeId,
              type: "TASK_COMPLETED",
              resourceType: "task",
              resourceId: input.id,
              actorId: ctx.session.user.id,
              message: `${actor?.name ?? "Someone"} completed "${fullTask.title}"`,
            },
          });
          notifiedIds.add(fullTask.assigneeId);
        }
        // Notify followers
        for (const f of fullTask.followers ?? []) {
          if (f.userId !== ctx.session.user.id && !notifiedIds.has(f.userId)) {
            await ctx.prisma.notification.create({
              data: {
                userId: f.userId,
                type: "TASK_COMPLETED",
                resourceType: "task",
                resourceId: input.id,
                actorId: ctx.session.user.id,
                message: `${actor?.name ?? "Someone"} completed "${fullTask.title}"`,
              },
            });
          }
        }
      }

      // Check if task is recurring and create next occurrence
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        include: { taskProjects: true },
      });

      if (task?.isRecurring && task.recurrenceRule) {
        const rule = task.recurrenceRule as {
          frequency: string;
          interval: number;
          daysOfWeek?: number[];
          dayOfMonth?: number;
          endDate?: string;
          endAfterOccurrences?: number;
        };
        const nextDueDate = calculateNextDueDate(task.dueDate, rule);

        if (
          nextDueDate &&
          (!rule.endDate || nextDueDate <= new Date(rule.endDate))
        ) {
          // Create next occurrence
          await ctx.prisma.task.create({
            data: {
              title: task.title,
              description: task.description ?? Prisma.JsonNull,
              assigneeId: task.assigneeId,
              workspaceId: task.workspaceId,
              createdById: ctx.session.user.id,
              isRecurring: true,
              recurrenceRule: task.recurrenceRule as any,
              dueDate: nextDueDate,
              startDate: task.startDate
                ? new Date(
                    nextDueDate.getTime() -
                      ((task.dueDate?.getTime() ?? 0) -
                        (task.startDate?.getTime() ?? 0))
                  )
                : undefined,
              taskProjects: {
                create: task.taskProjects.map((tp) => ({
                  projectId: tp.projectId,
                  sectionId: tp.sectionId,
                  position: Date.now(),
                })),
              },
            },
          });
        }
      }

      realtime.publish({ type: REALTIME_EVENTS.TASK_COMPLETED, workspaceId: completedTask.workspaceId, data: { taskId: completedTask.id } });

      return completedTask;
    }),

  uncomplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      const task = await ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          status: "INCOMPLETE",
          completedAt: null,
        },
      });
      realtime.publish({ type: REALTIME_EVENTS.TASK_UPDATED, workspaceId: task.workspaceId, data: { taskId: task.id } });
      return task;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      // Get workspaceId before deleting
      const taskMeta = await ctx.prisma.task.findUnique({ where: { id: input.id }, select: { workspaceId: true } });
      // Use a transaction to delete subtasks first, then the task
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Recursively delete all subtasks
        const deleteSubtasks = async (parentId: string) => {
          const subtasks = await tx.task.findMany({
            where: { parentTaskId: parentId },
            select: { id: true },
          });
          for (const subtask of subtasks) {
            await deleteSubtasks(subtask.id);
            await tx.task.delete({ where: { id: subtask.id } });
          }
        };
        await deleteSubtasks(input.id);
        return tx.task.delete({ where: { id: input.id } });
      });
      if (taskMeta) {
        realtime.publish({ type: REALTIME_EVENTS.TASK_DELETED, workspaceId: taskMeta.workspaceId, data: { taskId: input.id } });
      }
      return result;
    }),

  move: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        projectId: z.string(),
        sectionId: z.string().optional(),
        position: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      const result = await ctx.prisma.taskProject.updateMany({
        where: {
          taskId: input.taskId,
          projectId: input.projectId,
        },
        data: {
          sectionId: input.sectionId,
          position: input.position,
        },
      });

      // Execute rules for TASK_MOVED
      executeRules(ctx.prisma, "TASK_MOVED", {
        projectId: input.projectId,
        taskId: input.taskId,
        userId: ctx.session.user.id,
      }).catch(console.error); // Fire and forget - don't block the response

      const taskForWs = await ctx.prisma.task.findUnique({ where: { id: input.taskId }, select: { workspaceId: true } });
      if (taskForWs) {
        realtime.publish({ type: REALTIME_EVENTS.TASK_UPDATED, workspaceId: taskForWs.workspaceId, data: { taskId: input.taskId } });
      }

      return result;
    }),

  setRecurrence: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        isRecurring: z.boolean(),
        recurrenceRule: z
          .object({
            frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
            interval: z.number().min(1).max(365).default(1),
            daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sun...6=Sat
            dayOfMonth: z.number().min(1).max(31).optional(),
            endDate: z.string().datetime().optional(),
            endAfterOccurrences: z.number().min(1).optional(),
          })
          .nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          isRecurring: input.isRecurring,
          recurrenceRule: input.recurrenceRule ?? Prisma.JsonNull,
        },
      });
    }),

  addDependency: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        dependsOnTaskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.taskDependency.create({
        data: {
          taskId: input.taskId,
          dependsOnTaskId: input.dependsOnTaskId,
        },
        include: { dependsOn: true, task: true },
      });
    }),

  addBlocking: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        blocksTaskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.taskDependency.create({
        data: {
          taskId: input.blocksTaskId,
          dependsOnTaskId: input.taskId,
        },
        include: { dependsOn: true, task: true },
      });
    }),

  removeDependency: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.taskDependency.delete({
        where: { id: input.id },
      });
    }),

  addToProject: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        projectId: z.string(),
        sectionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.session.user.id);
      return ctx.prisma.taskProject.create({
        data: {
          taskId: input.taskId,
          projectId: input.projectId,
          sectionId: input.sectionId,
          position: Date.now(),
        },
      });
    }),

  removeFromProject: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.taskProject.deleteMany({
        where: {
          taskId: input.taskId,
          projectId: input.projectId,
        },
      });
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      const source = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          taskProjects: true,
          tags: true,
          customFieldValues: true,
        },
      });

      const task = await ctx.prisma.task.create({
        data: {
          title: `${source.title} (copy)`,
          description: source.description ?? undefined,
          assigneeId: source.assigneeId,
          dueDate: source.dueDate,
          startDate: source.startDate,
          workspaceId: source.workspaceId,
          createdById: ctx.session.user.id,
          estimatedHours: source.estimatedHours,
          storyPoints: source.storyPoints,
          taskProjects: {
            create: source.taskProjects.map((tp) => ({
              projectId: tp.projectId,
              sectionId: tp.sectionId,
              position: Date.now(),
            })),
          },
          tags: {
            create: source.tags.map((t) => ({
              tagId: t.tagId,
            })),
          },
          customFieldValues: {
            create: source.customFieldValues.map((cfv) => ({
              customFieldId: cfv.customFieldId,
              stringValue: cfv.stringValue,
              numberValue: cfv.numberValue,
              dateValue: cfv.dateValue,
              selectedOptions: cfv.selectedOptions ?? undefined,
            })),
          },
        },
        include: {
          assignee: true,
          taskProjects: { include: { project: true, section: true } },
        },
      });

      realtime.publish({ type: REALTIME_EVENTS.TASK_CREATED, workspaceId: source.workspaceId, data: { taskId: task.id } });

      return task;
    }),

  bulkUpdate: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()).min(1),
        assigneeId: z.string().nullable().optional(),
        dueDate: z.string().datetime().nullable().optional(),
        status: z.enum(["INCOMPLETE", "COMPLETE"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify access to all tasks
      for (const taskId of input.taskIds) {
        await verifyTaskAccess(ctx.prisma, taskId, ctx.session.user.id);
      }
      const { taskIds, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "COMPLETE") updateData.completedAt = new Date();
        else updateData.completedAt = null;
      }

      return ctx.prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: updateData,
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ taskIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      for (const taskId of input.taskIds) {
        await verifyTaskAccess(ctx.prisma, taskId, ctx.session.user.id);
      }
      return ctx.prisma.$transaction(async (tx) => {
        // Delete subtasks of all selected tasks first
        await tx.task.deleteMany({
          where: { parentTaskId: { in: input.taskIds } },
        });
        return tx.task.deleteMany({
          where: { id: { in: input.taskIds } },
        });
      });
    }),

  bulkMove: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()).min(1),
        projectId: z.string(),
        sectionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.session.user.id);
      return ctx.prisma.taskProject.updateMany({
        where: {
          taskId: { in: input.taskIds },
          projectId: input.projectId,
        },
        data: { sectionId: input.sectionId },
      });
    }),

  toggleMilestone: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isMilestone: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { isMilestone: input.isMilestone },
      });
    }),

  markAsApproval: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isApproval: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          isApproval: input.isApproval,
          approvalStatus: input.isApproval ? "PENDING" : null,
        },
      });
    }),

  addFollower: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      const follower = await ctx.prisma.taskFollower.create({
        data: {
          taskId: input.taskId,
          userId: input.userId,
        },
        include: { user: true },
      });

      // Notify the added collaborator
      if (input.userId !== ctx.session.user.id) {
        const [actor, task] = await Promise.all([
          ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
          ctx.prisma.task.findUnique({ where: { id: input.taskId }, select: { title: true } }),
        ]);
        await ctx.prisma.notification.create({
          data: {
            userId: input.userId,
            type: "TASK_ASSIGNED",
            resourceType: "task",
            resourceId: input.taskId,
            actorId: ctx.session.user.id,
            message: `${actor?.name ?? "Someone"} added you as a collaborator on "${task?.title ?? "a task"}"`,
          },
        });
      }

      return follower;
    }),

  removeFollower: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.taskId, ctx.session.user.id);
      return ctx.prisma.taskFollower.deleteMany({
        where: {
          taskId: input.taskId,
          userId: input.userId,
        },
      });
    }),

  setApprovalStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTaskAccess(ctx.prisma, input.id, ctx.session.user.id);
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { approvalStatus: input.approvalStatus },
      });
    }),
});
