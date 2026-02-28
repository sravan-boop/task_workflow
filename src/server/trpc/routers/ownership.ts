import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const ownershipRouter = router({
  initiateTransfer: protectedProcedure
    .input(
      z.object({
        resourceType: z.enum(["PROJECT", "TEAM", "TASK"]),
        resourceId: z.string(),
        newOwnerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { resourceType, resourceId, newOwnerId } = input;
      const originalOwnerId = ctx.session.user.id;

      if (originalOwnerId === newOwnerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot transfer ownership to yourself.",
        });
      }

      // 1. Verify that the current user is actually the owner of the resource
      if (resourceType === "PROJECT") {
        const project = await ctx.prisma.project.findUnique({
          where: { id: resourceId },
        });
        if (!project || project.createdById !== originalOwnerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not the owner of this project.",
          });
        }
      } else if (resourceType === "TEAM") {
        const teamMember = await ctx.prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: resourceId, userId: originalOwnerId } }
        });
        if (!teamMember || teamMember.role !== "LEAD") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not the lead of this team.",
          });
        }
      } else if (resourceType === "TASK") {
        const task = await ctx.prisma.task.findUnique({
          where: { id: resourceId },
        });
        if (!task || task.createdById !== originalOwnerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not the creator of this task.",
          });
        }
      }

      // 2. Check for an existing pending transfer for this resource
      const existingRequest = await ctx.prisma.ownershipTransferRequest.findFirst({
        where: {
          resourceType,
          resourceId,
          status: "PENDING",
        },
      });

      if (existingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "There is already a pending ownership transfer request for this resource.",
        });
      }

      // 3. Create the transfer request
      const transferRequest = await ctx.prisma.ownershipTransferRequest.create({
        data: {
          resourceType,
          resourceId,
          originalOwnerId,
          newOwnerId,
          status: "PENDING",
        },
      });

      // 4. Create a notification for the new owner
      let resourceName = "Item";
      if (resourceType === "PROJECT") {
        const p = await ctx.prisma.project.findUnique({ where: { id: resourceId } });
        resourceName = p?.name || "Project";
      } else if (resourceType === "TEAM") {
        const t = await ctx.prisma.team.findUnique({ where: { id: resourceId } });
        resourceName = t?.name || "Team";
      } else if (resourceType === "TASK") {
        const task = await ctx.prisma.task.findUnique({ where: { id: resourceId } });
        resourceName = task?.title || "Task";
      }

      await ctx.prisma.notification.create({
        data: {
          userId: newOwnerId,
          type: "OWNERSHIP_TRANSFER_REQUEST",
          resourceType: "TRANSFER_REQUEST",
          resourceId: transferRequest.id,
          actorId: originalOwnerId,
          message: `${ctx.session.user.name} has requested to transfer ownership of ${resourceType.toLowerCase()} "${resourceName}" to you.`,
        },
      });

      return transferRequest;
    }),

  respondToTransfer: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        action: z.enum(["ACCEPT", "REJECT"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { requestId, action } = input;
      const currentUserId = ctx.session.user.id;

      const transferRequest = await ctx.prisma.ownershipTransferRequest.findUnique({
        where: { id: requestId },
        include: {
          originalOwner: true,
          newOwner: true,
        }
      });

      if (!transferRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer request not found.",
        });
      }

      if (transferRequest.newOwnerId !== currentUserId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not the recipient of this transfer request.",
        });
      }

      if (transferRequest.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This transfer request has already been processed.",
        });
      }

      await ctx.prisma.$transaction(async (tx) => {
        // 1. Update the transfer request status
        await tx.ownershipTransferRequest.update({
          where: { id: requestId },
          data: {
            status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
          },
        });

        // 2. Fetch resource details for notification
        let resourceName = "Item";

        if (action === "ACCEPT") {
          const { resourceType, resourceId, originalOwnerId, newOwnerId } = transferRequest;

          if (resourceType === "PROJECT") {
            const project = await tx.project.findUnique({ where: { id: resourceId } });
            if (project) {
              resourceName = project.name;
              // Change ownership in Project model
              await tx.project.update({
                where: { id: resourceId },
                data: { createdById: newOwnerId },
              });
              
              // Ensure old owner is members, drop to EDITOR
              await tx.projectMember.upsert({
                where: { projectId_userId: { projectId: resourceId, userId: originalOwnerId } },
                update: { permission: "EDITOR" },
                create: { projectId: resourceId, userId: originalOwnerId, permission: "EDITOR" },
              });

              // Ensure new owner is ADMIN
              await tx.projectMember.upsert({
                where: { projectId_userId: { projectId: resourceId, userId: newOwnerId } },
                update: { permission: "ADMIN" },
                create: { projectId: resourceId, userId: newOwnerId, permission: "ADMIN" },
              });
            }
          } else if (resourceType === "TEAM") {
            const team = await tx.team.findUnique({ where: { id: resourceId } });
            if (team) {
              resourceName = team.name;
              // Old owner becomes MEMBER
              await tx.teamMember.update({
                where: { teamId_userId: { teamId: resourceId, userId: originalOwnerId } },
                data: { role: "MEMBER" },
              });

              // New owner becomes LEAD
              await tx.teamMember.upsert({
                where: { teamId_userId: { teamId: resourceId, userId: newOwnerId } },
                update: { role: "LEAD" },
                create: { teamId: resourceId, userId: newOwnerId, role: "LEAD" },
              });
            }
          } else if (resourceType === "TASK") {
            const task = await tx.task.findUnique({ where: { id: resourceId } });
            if (task) {
              resourceName = task.title;
              // Change creator in Task model
              await tx.task.update({
                where: { id: resourceId },
                data: { createdById: newOwnerId },
              });

              // Make original owner a follower if not already
              await tx.taskFollower.upsert({
                where: { taskId_userId: { taskId: resourceId, userId: originalOwnerId } },
                update: {},
                create: { taskId: resourceId, userId: originalOwnerId },
              });
            }
          }
        }

        // 3. Notify the original owner of the outcome
        await tx.notification.create({
          data: {
            userId: transferRequest.originalOwnerId,
            type: "OWNERSHIP_TRANSFER_RESOLVED",
            resourceType: transferRequest.resourceType,
            resourceId: transferRequest.resourceId,
            actorId: currentUserId,
            message: `${ctx.session.user.name} has ${action === "ACCEPT" ? "accepted" : "rejected"} your request to transfer ownership of the ${transferRequest.resourceType.toLowerCase()} "${resourceName}".`,
          },
        });

        // 4. Mark original transfer request notification as read
        await tx.notification.updateMany({
           where: {
             userId: currentUserId,
             type: "OWNERSHIP_TRANSFER_REQUEST",
             resourceType: "TRANSFER_REQUEST",
             resourceId: requestId,
           },
           data: {
             isRead: true,
           }
        });
      });

      return { success: true };
    }),
});
