import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { anthropic } from "../../ai/client";
import { TRPCError } from "@trpc/server";

export const aiRouter = router({
  // Summarize a task's activity and current state
  summarizeTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: input.taskId },
        include: {
          assignee: true,
          subtasks: { include: { assignee: true } },
          comments: {
            include: { author: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          taskProjects: { include: { project: true, section: true } },
          tags: { include: { tag: true } },
        },
      });

      const subtaskStatus = task.subtasks.length > 0
        ? `${task.subtasks.filter((s) => s.status === "COMPLETE").length}/${task.subtasks.length} subtasks completed`
        : "No subtasks";

      const recentComments = task.comments
        .map((c) => `- ${c.author.name}: ${typeof c.body === "string" ? c.body : JSON.stringify(c.body)}`)
        .join("\n");

      const prompt = `Summarize this task concisely in 2-3 sentences:

Task: "${task.title}"
Status: ${task.status}
Assignee: ${task.assignee?.name || "Unassigned"}
Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
Project: ${task.taskProjects[0]?.project.name || "None"} / ${task.taskProjects[0]?.section?.name || "None"}
Tags: ${task.tags.map((t) => t.tag.name).join(", ") || "None"}
Subtasks: ${subtaskStatus}
${recentComments ? `Recent comments:\n${recentComments}` : "No comments"}

Provide a brief, actionable summary of this task's current state and any notable activity.`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        return { summary: textContent?.text || "Unable to generate summary." };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate AI summary. Check your API key.",
        });
      }
    }),

  // Generate a project status update
  generateProjectStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
        include: {
          sections: true,
          taskProjects: {
            include: {
              task: {
                include: { assignee: true },
              },
              section: true,
            },
          },
          statusUpdates: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { author: true },
          },
        },
      });

      const allTasks = project.taskProjects.map((tp) => tp.task);
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter((t) => t.status === "COMPLETE").length;
      const overdueTasks = allTasks.filter(
        (t) => t.status === "INCOMPLETE" && t.dueDate && new Date(t.dueDate) < new Date()
      ).length;

      const sectionBreakdown = project.sections
        .map((s) => {
          const sectionTasks = project.taskProjects.filter(
            (tp) => tp.sectionId === s.id
          );
          const complete = sectionTasks.filter(
            (tp) => tp.task.status === "COMPLETE"
          ).length;
          return `${s.name}: ${complete}/${sectionTasks.length} tasks complete`;
        })
        .join("\n");

      const prompt = `Generate a brief project status update for a project manager.

Project: "${project.name}"
Total Tasks: ${totalTasks}
Completed: ${completedTasks} (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
Overdue: ${overdueTasks}
Sections:
${sectionBreakdown}

Last status update: ${
        project.statusUpdates[0]
          ? `${project.statusUpdates[0].status} by ${project.statusUpdates[0].author.name}`
          : "None"
      }

Write a status update with:
1. Overall status assessment (On Track / At Risk / Off Track)
2. Key highlights (2-3 bullet points)
3. Blockers or risks (if any)
4. Next steps (1-2 items)

Keep it professional and concise.`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        return {
          status: textContent?.text || "Unable to generate status.",
          stats: {
            total: totalTasks,
            completed: completedTasks,
            overdue: overdueTasks,
            completionRate: totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
          },
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate project status. Check your API key.",
        });
      }
    }),

  // Natural language task creation
  parseTaskFromText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(2000),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prompt = `Parse the following natural language text into structured task data. Extract the task title, description, due date (if mentioned), and priority level.

Text: "${input.text}"

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "title": "The task title",
  "description": "Optional description or null",
  "dueDate": "ISO date string or null",
  "priority": "high" | "medium" | "low" | null,
  "subtasks": ["subtask 1", "subtask 2"] or []
}`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        if (!textContent?.text) {
          throw new Error("No response");
        }

        const parsed = JSON.parse(textContent.text);
        return {
          title: parsed.title || input.text,
          description: parsed.description || null,
          dueDate: parsed.dueDate || null,
          priority: parsed.priority || null,
          subtasks: parsed.subtasks || [],
        };
      } catch {
        // Fallback: use the raw text as the title
        return {
          title: input.text,
          description: null,
          dueDate: null,
          priority: null,
          subtasks: [],
        };
      }
    }),

  // AI Chat - general assistant for project management questions
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(5000),
        context: z
          .object({
            projectId: z.string().optional(),
            taskId: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Gather context if a project is specified
      let projectContext = "";
      if (input.context?.projectId) {
        const project = await ctx.prisma.project.findUnique({
          where: { id: input.context.projectId },
          include: {
            sections: true,
            taskProjects: {
              include: { task: true, section: true },
              take: 20,
            },
          },
        });
        if (project) {
          const tasks = project.taskProjects.map((tp) => tp.task);
          const incomplete = tasks.filter((t) => t.status === "INCOMPLETE");
          const complete = tasks.filter((t) => t.status === "COMPLETE");
          projectContext = `
Current project context:
- Project: "${project.name}"
- Sections: ${project.sections.map((s) => s.name).join(", ")}
- ${incomplete.length} incomplete tasks, ${complete.length} completed
- Recent incomplete tasks: ${incomplete.slice(0, 5).map((t) => `"${t.title}"`).join(", ")}`;
        }
      }

      const systemPrompt = `You are TaskFlow AI, an intelligent project management assistant. You help users manage their tasks, projects, and workflows effectively.

You should:
- Give concise, actionable advice
- Help with project planning and task prioritization
- Suggest best practices for project management
- Help break down complex tasks into smaller subtasks
- Provide time management tips
${projectContext}

Keep responses concise (3-5 sentences max unless a longer answer is needed).`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: input.message }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        return { response: textContent?.text || "I couldn't process your request." };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI service unavailable. Please check your API key configuration.",
        });
      }
    }),

  // Smart task prioritization suggestions
  suggestPriorities: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tasks = await ctx.prisma.task.findMany({
        where: {
          assigneeId: ctx.session.user.id,
          workspaceId: input.workspaceId,
          status: "INCOMPLETE",
          parentTaskId: null,
        },
        include: {
          taskProjects: { include: { project: true } },
        },
        take: 15,
        orderBy: { createdAt: "desc" },
      });

      if (tasks.length === 0) {
        return { suggestions: "You have no incomplete tasks! Great work." };
      }

      const taskList = tasks
        .map(
          (t, i) =>
            `${i + 1}. "${t.title}" - Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"} - Project: ${t.taskProjects[0]?.project.name || "None"}`
        )
        .join("\n");

      const prompt = `As a productivity expert, analyze these tasks and suggest a prioritized order with brief reasoning. Group them into: Do Today, Do This Week, Schedule Later.

Tasks:
${taskList}

Provide actionable prioritization advice. Keep it concise.`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        return {
          suggestions: textContent?.text || "Unable to generate suggestions.",
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI service unavailable.",
        });
      }
    }),
});
