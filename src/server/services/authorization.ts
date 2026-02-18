import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../prisma/generated/prisma/client";

/**
 * Verify user has access to a project (is creator or member).
 * Throws FORBIDDEN if not authorized.
 */
export async function verifyProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { createdById: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this project" });
  }
  return project;
}

/**
 * Verify user has access to a task (is assignee, creator, follower, or member of a project containing the task).
 * Throws FORBIDDEN if not authorized.
 */
export async function verifyTaskAccess(
  prisma: PrismaClient,
  taskId: string,
  userId: string
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { assigneeId: userId },
        { createdById: userId },
        { followers: { some: { userId } } },
        {
          taskProjects: {
            some: {
              project: {
                OR: [
                  { createdById: userId },
                  { members: { some: { userId } } },
                ],
              },
            },
          },
        },
      ],
    },
    select: { id: true, workspaceId: true },
  });
  if (!task) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this task" });
  }
  return task;
}
