import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const templatesRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.projectTemplate.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.projectTemplate.findUniqueOrThrow({
        where: { id: input.id },
      });
    }),

  saveFromProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
        include: {
          sections: { orderBy: { position: "asc" } },
          taskProjects: {
            include: {
              task: { select: { title: true, description: true, status: true } },
              section: { select: { name: true } },
            },
          },
        },
      });

      const templateData = {
        color: project.color,
        defaultView: project.defaultView,
        sections: project.sections.map((s) => ({
          name: s.name,
          position: s.position,
          tasks: project.taskProjects
            .filter((tp) => tp.sectionId === s.id)
            .map((tp) => ({
              title: tp.task.title,
              position: tp.position,
            })),
        })),
      };

      return ctx.prisma.projectTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          templateData,
          workspaceId: project.workspaceId,
          createdById: ctx.session.user.id,
        },
      });
    }),

  createProjectFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        workspaceId: z.string(),
        teamId: z.string().optional(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.projectTemplate.findUniqueOrThrow({
        where: { id: input.templateId },
      });

      const data = template.templateData as any;

      const project = await ctx.prisma.project.create({
        data: {
          name: input.name,
          color: data.color || "#4573D2",
          defaultView: data.defaultView || "LIST",
          workspaceId: input.workspaceId,
          teamId: input.teamId,
          createdById: ctx.session.user.id,
          members: {
            create: { userId: ctx.session.user.id, permission: "ADMIN" },
          },
        },
      });

      // Create sections and tasks
      for (const sectionData of data.sections || []) {
        const section = await ctx.prisma.section.create({
          data: {
            name: sectionData.name,
            projectId: project.id,
            position: sectionData.position,
          },
        });

        for (const taskData of sectionData.tasks || []) {
          await ctx.prisma.task.create({
            data: {
              title: taskData.title,
              workspaceId: input.workspaceId,
              createdById: ctx.session.user.id,
              taskProjects: {
                create: {
                  projectId: project.id,
                  sectionId: section.id,
                  position: taskData.position,
                },
              },
            },
          });
        }
      }

      return project;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectTemplate.delete({ where: { id: input.id } });
    }),
});
