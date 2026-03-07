import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const monitoringRouter = router({
    getFilters: protectedProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ ctx, input }) => {
            const [projects, portfolios, members] = await Promise.all([
                ctx.prisma.project.findMany({
                    where: { workspaceId: input.workspaceId },
                    select: { id: true, name: true, color: true },
                    orderBy: { name: "asc" },
                }),
                ctx.prisma.portfolio.findMany({
                    where: { workspaceId: input.workspaceId },
                    select: { id: true, name: true },
                    orderBy: { name: "asc" },
                }),
                ctx.prisma.workspaceMember.findMany({
                    where: { workspaceId: input.workspaceId },
                    include: { user: { select: { id: true, name: true, email: true } } },
                    orderBy: { user: { name: "asc" } },
                }),
            ]);

            return {
                projects,
                portfolios,
                users: members.map((m) => m.user),
            };
        }),

    getProjectTasks: protectedProcedure
        .input(z.object({ projectIds: z.array(z.string()) }))
        .query(async ({ ctx, input }) => {
            if (!input.projectIds.length) return [];
            const tasks = await ctx.prisma.task.findMany({
                where: {
                    taskProjects: { some: { projectId: { in: input.projectIds } } },
                    parentTaskId: null,
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    taskProjects: { include: { project: true, section: true } },
                },
                orderBy: [{ status: "desc" }, { dueDate: "asc" }],
            });
            return tasks;
        }),

    getPortfolioTasks: protectedProcedure
        .input(z.object({ portfolioIds: z.array(z.string()) }))
        .query(async ({ ctx, input }) => {
            if (!input.portfolioIds.length) return [];
            const portfolios = await ctx.prisma.portfolio.findMany({
                where: { id: { in: input.portfolioIds } },
                include: { projects: { select: { projectId: true } } },
            });

            const projectIds = portfolios.flatMap((p) => p.projects.map((proj) => proj.projectId));
            if (!projectIds.length) return [];

            const tasks = await ctx.prisma.task.findMany({
                where: {
                    taskProjects: { some: { projectId: { in: projectIds } } },
                    parentTaskId: null,
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    taskProjects: { include: { project: true, section: true } },
                },
                orderBy: [{ status: "desc" }, { dueDate: "asc" }],
            });
            return tasks;
        }),

    getUserTasks: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string(),
                userIds: z.array(z.string()),
            })
        )
        .query(async ({ ctx, input }) => {
            if (!input.userIds.length) return [];
            const tasks = await ctx.prisma.task.findMany({
                where: {
                    workspaceId: input.workspaceId,
                    assigneeId: { in: input.userIds },
                    parentTaskId: null,
                    taskProjects: { some: {} }, // ONLY retrieve tasks that belong to a project
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    taskProjects: { include: { project: true, section: true } },
                },
                orderBy: [{ status: "desc" }, { dueDate: "asc" }],
            });
            return tasks;
        }),

    getManagerFilters: protectedProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ ctx, input }) => {
            const managers = await ctx.prisma.teamMember.findMany({
                where: {
                    team: { workspaceId: input.workspaceId },
                    role: "MANAGER",
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
            // Deduplicate by user id
            const unique = [...new Map(managers.map((m) => [m.user.id, m.user])).values()];
            return { managers: unique };
        }),

    getManagerData: protectedProcedure
        .input(z.object({ workspaceId: z.string(), managerId: z.string() }))
        .query(async ({ ctx, input }) => {
            const manager = await ctx.prisma.user.findUnique({
                where: { id: input.managerId },
                select: { id: true, name: true, email: true },
            });

            if (!manager) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Manager not found",
                });
            }

            const managedMembers = await ctx.prisma.teamMember.findMany({
                where: {
                    managerId: input.managerId,
                    team: { workspaceId: input.workspaceId },
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            });

            const managedProjects = await ctx.prisma.project.findMany({
                where: {
                    managerId: input.managerId,
                    workspaceId: input.workspaceId,
                },
                select: { id: true, name: true, color: true },
            });

            const memberUserIds = managedMembers.map((m) => m.userId);
            const projectIds = managedProjects.map((p) => p.id);

            let tasks: Awaited<ReturnType<typeof ctx.prisma.task.findMany>> = [];

            if (memberUserIds.length || projectIds.length) {
                tasks = await ctx.prisma.task.findMany({
                    where: {
                        workspaceId: input.workspaceId,
                        parentTaskId: null,
                        OR: [
                            ...(memberUserIds.length ? [{ assigneeId: { in: memberUserIds } }] : []),
                            ...(projectIds.length ? [{ taskProjects: { some: { projectId: { in: projectIds } } } }] : []),
                        ],
                    },
                    include: {
                        assignee: { select: { id: true, name: true, email: true } },
                        taskProjects: { include: { project: { select: { id: true, name: true, color: true } } } },
                    },
                    orderBy: [{ status: "desc" }, { dueDate: "asc" }],
                });
            }

            return { manager, managedMembers, managedProjects, tasks };
        }),
});
