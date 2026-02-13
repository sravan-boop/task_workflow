import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@taskflow.ai" },
    update: {},
    create: {
      email: "demo@taskflow.ai",
      name: "Demo User",
      title: "Product Manager",
      department: "Product",
      passwordHash,
    },
  });

  // Create second user for collaboration demo
  const user2 = await prisma.user.upsert({
    where: { email: "alex@taskflow.ai" },
    update: {},
    create: {
      email: "alex@taskflow.ai",
      name: "Alex Chen",
      title: "Software Engineer",
      department: "Engineering",
      passwordHash,
    },
  });

  console.log("Created users:", user.email, user2.email);

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Corp",
      description: "Our company workspace for managing all projects",
      members: {
        createMany: {
          data: [
            { userId: user.id, role: "OWNER" },
            { userId: user2.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  console.log("Created workspace:", workspace.name);

  // Create teams
  const productTeam = await prisma.team.create({
    data: {
      name: "Product Team",
      description: "Product development and design",
      workspaceId: workspace.id,
      members: {
        createMany: {
          data: [
            { userId: user.id, role: "LEAD" },
            { userId: user2.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  const engineeringTeam = await prisma.team.create({
    data: {
      name: "Engineering",
      description: "Backend and frontend engineering",
      workspaceId: workspace.id,
      members: {
        createMany: {
          data: [
            { userId: user2.id, role: "LEAD" },
            { userId: user.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  console.log("Created teams:", productTeam.name, engineeringTeam.name);

  // ==========================================
  // PROJECT 1: Website Redesign
  // ==========================================
  const project = await prisma.project.create({
    data: {
      name: "Website Redesign",
      color: "#4573D2",
      workspaceId: workspace.id,
      teamId: productTeam.id,
      createdById: user.id,
      sections: {
        createMany: {
          data: [
            { name: "To do", position: 1 },
            { name: "In progress", position: 2 },
            { name: "Done", position: 3 },
          ],
        },
      },
      members: {
        createMany: {
          data: [
            { userId: user.id, permission: "ADMIN" },
            { userId: user2.id, permission: "EDITOR" },
          ],
        },
      },
    },
    include: {
      sections: { orderBy: { position: "asc" } },
    },
  });

  console.log("Created project:", project.name);

  const todoSection = project.sections[0];
  const inProgressSection = project.sections[1];
  const doneSection = project.sections[2];

  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const taskData = [
    {
      title: "Design new homepage mockup",
      sectionId: inProgressSection.id,
      position: 1,
      assigneeId: user.id,
      dueDate: new Date(today.getTime() + 3 * dayMs),
      startDate: new Date(today.getTime() - 2 * dayMs),
    },
    {
      title: "Set up CI/CD pipeline",
      sectionId: todoSection.id,
      position: 1,
      assigneeId: user2.id,
      dueDate: new Date(today.getTime() + 7 * dayMs),
    },
    {
      title: "Write API documentation",
      sectionId: todoSection.id,
      position: 2,
      assigneeId: user.id,
      dueDate: new Date(today.getTime() + 5 * dayMs),
    },
    {
      title: "Implement user authentication",
      sectionId: doneSection.id,
      position: 1,
      assigneeId: user2.id,
      status: "COMPLETE" as const,
      completedAt: new Date(today.getTime() - 2 * dayMs),
      startDate: new Date(today.getTime() - 10 * dayMs),
      dueDate: new Date(today.getTime() - 2 * dayMs),
    },
    {
      title: "Database schema design",
      sectionId: doneSection.id,
      position: 2,
      assigneeId: user.id,
      status: "COMPLETE" as const,
      completedAt: new Date(today.getTime() - 5 * dayMs),
      startDate: new Date(today.getTime() - 14 * dayMs),
      dueDate: new Date(today.getTime() - 5 * dayMs),
    },
    {
      title: "Create component library",
      sectionId: inProgressSection.id,
      position: 2,
      assigneeId: user.id,
      dueDate: new Date(today.getTime() + 2 * dayMs),
      startDate: new Date(today.getTime() - 1 * dayMs),
    },
    {
      title: "Set up monitoring and logging",
      sectionId: todoSection.id,
      position: 3,
      assigneeId: user2.id,
    },
    {
      title: "Performance optimization",
      sectionId: todoSection.id,
      position: 4,
      assigneeId: user.id,
      dueDate: new Date(today.getTime() + 14 * dayMs),
      startDate: new Date(today.getTime() + 7 * dayMs),
    },
    {
      title: "Responsive design audit",
      sectionId: todoSection.id,
      position: 5,
      assigneeId: user.id,
      dueDate: new Date(today.getTime() - 1 * dayMs), // overdue
    },
    {
      title: "SEO optimization",
      sectionId: inProgressSection.id,
      position: 3,
      assigneeId: user2.id,
      dueDate: new Date(today.getTime() + 4 * dayMs),
      startDate: new Date(today.getTime()),
    },
  ];

  const createdTasks = [];
  for (const t of taskData) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        status: t.status || "INCOMPLETE",
        completedAt: t.completedAt,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
        startDate: t.startDate,
        workspaceId: workspace.id,
        createdById: user.id,
        taskProjects: {
          create: {
            projectId: project.id,
            sectionId: t.sectionId,
            position: t.position,
          },
        },
        followers: {
          create: { userId: user.id },
        },
      },
    });
    createdTasks.push(task);
  }

  console.log(`Created ${createdTasks.length} tasks for Website Redesign`);

  // Add comments to first task
  await prisma.comment.createMany({
    data: [
      {
        taskId: createdTasks[0].id,
        authorId: user2.id,
        body: JSON.stringify("Looking great so far! Can we add a hero section with an animation?"),
      },
      {
        taskId: createdTasks[0].id,
        authorId: user.id,
        body: JSON.stringify("Good idea, I'll add it to the mockup. Should be ready by tomorrow."),
      },
    ],
  });

  // Add subtasks to task 6 (Create component library)
  for (const sub of ["Button variants", "Input components", "Modal system", "Toast notifications"]) {
    await prisma.task.create({
      data: {
        title: sub,
        status: sub === "Button variants" ? "COMPLETE" : "INCOMPLETE",
        completedAt: sub === "Button variants" ? new Date() : undefined,
        parentTaskId: createdTasks[5].id,
        assigneeId: user.id,
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });
  }

  // ==========================================
  // PROJECT 2: Mobile App
  // ==========================================
  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App",
      color: "#F06A6A",
      workspaceId: workspace.id,
      teamId: engineeringTeam.id,
      createdById: user.id,
      sections: {
        createMany: {
          data: [
            { name: "Backlog", position: 1 },
            { name: "Sprint", position: 2 },
            { name: "Review", position: 3 },
            { name: "Done", position: 4 },
          ],
        },
      },
      members: {
        createMany: {
          data: [
            { userId: user.id, permission: "ADMIN" },
            { userId: user2.id, permission: "EDITOR" },
          ],
        },
      },
    },
    include: {
      sections: { orderBy: { position: "asc" } },
    },
  });

  const mobileBacklog = project2.sections[0];
  const mobileSprint = project2.sections[1];
  const mobileReview = project2.sections[2];
  const mobileDone = project2.sections[3];

  const mobileTasks = [
    { title: "User onboarding flow", sectionId: mobileSprint.id, position: 1, assigneeId: user2.id, dueDate: new Date(today.getTime() + 5 * dayMs) },
    { title: "Push notification system", sectionId: mobileBacklog.id, position: 1, assigneeId: user.id },
    { title: "Offline mode support", sectionId: mobileBacklog.id, position: 2, assigneeId: user2.id },
    { title: "App store listing setup", sectionId: mobileReview.id, position: 1, assigneeId: user.id, dueDate: new Date(today.getTime() + 10 * dayMs) },
    { title: "Login screen design", sectionId: mobileDone.id, position: 1, assigneeId: user2.id, status: "COMPLETE" as const, completedAt: new Date(today.getTime() - 3 * dayMs) },
    { title: "Core navigation structure", sectionId: mobileDone.id, position: 2, assigneeId: user.id, status: "COMPLETE" as const, completedAt: new Date(today.getTime() - 1 * dayMs) },
  ];

  for (const t of mobileTasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        status: t.status || "INCOMPLETE",
        completedAt: t.completedAt,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
        workspaceId: workspace.id,
        createdById: user.id,
        taskProjects: {
          create: {
            projectId: project2.id,
            sectionId: t.sectionId,
            position: t.position,
          },
        },
      },
    });
  }

  console.log("Created project:", project2.name, "with", mobileTasks.length, "tasks");

  // ==========================================
  // PROJECT 3: Marketing Campaign
  // ==========================================
  const project3 = await prisma.project.create({
    data: {
      name: "Q1 Marketing Campaign",
      color: "#AA62E3",
      workspaceId: workspace.id,
      teamId: productTeam.id,
      createdById: user.id,
      sections: {
        createMany: {
          data: [
            { name: "Planning", position: 1 },
            { name: "In progress", position: 2 },
            { name: "Complete", position: 3 },
          ],
        },
      },
      members: {
        create: { userId: user.id, permission: "ADMIN" },
      },
    },
    include: {
      sections: { orderBy: { position: "asc" } },
    },
  });

  const mktPlanning = project3.sections[0];
  const mktProgress = project3.sections[1];
  const mktComplete = project3.sections[2];

  for (const t of [
    { title: "Define campaign objectives", sectionId: mktComplete.id, position: 1, status: "COMPLETE" as const, completedAt: new Date(today.getTime() - 7 * dayMs) },
    { title: "Create content calendar", sectionId: mktProgress.id, position: 1, dueDate: new Date(today.getTime() + 2 * dayMs) },
    { title: "Design social media assets", sectionId: mktProgress.id, position: 2, dueDate: new Date(today.getTime() + 6 * dayMs) },
    { title: "Write blog posts", sectionId: mktPlanning.id, position: 1, dueDate: new Date(today.getTime() + 10 * dayMs) },
    { title: "Set up analytics tracking", sectionId: mktPlanning.id, position: 2 },
  ]) {
    await prisma.task.create({
      data: {
        title: t.title,
        status: t.status || "INCOMPLETE",
        completedAt: t.completedAt,
        assigneeId: user.id,
        dueDate: t.dueDate,
        workspaceId: workspace.id,
        createdById: user.id,
        taskProjects: {
          create: {
            projectId: project3.id,
            sectionId: t.sectionId,
            position: t.position,
          },
        },
      },
    });
  }

  console.log("Created project:", project3.name);

  // ==========================================
  // TAGS
  // ==========================================
  const tags = await prisma.tag.createManyAndReturn({
    data: [
      { name: "bug", color: "#E8384F", workspaceId: workspace.id },
      { name: "feature", color: "#4573D2", workspaceId: workspace.id },
      { name: "urgent", color: "#FD9A00", workspaceId: workspace.id },
      { name: "design", color: "#AA62E3", workspaceId: workspace.id },
      { name: "frontend", color: "#63D9EA", workspaceId: workspace.id },
      { name: "backend", color: "#7BC86C", workspaceId: workspace.id },
    ],
  });

  // Tag some tasks
  await prisma.taskTag.createMany({
    data: [
      { taskId: createdTasks[0].id, tagId: tags.find((t) => t.name === "design")!.id },
      { taskId: createdTasks[0].id, tagId: tags.find((t) => t.name === "frontend")!.id },
      { taskId: createdTasks[1].id, tagId: tags.find((t) => t.name === "backend")!.id },
      { taskId: createdTasks[8].id, tagId: tags.find((t) => t.name === "urgent")!.id },
    ],
  });

  console.log("Created tags:", tags.length);

  // ==========================================
  // PORTFOLIO
  // ==========================================
  const portfolio = await prisma.portfolio.create({
    data: {
      name: "Product Launch 2025",
      description: "All projects related to the Q1 product launch",
      workspaceId: workspace.id,
      ownerId: user.id,
      projects: {
        createMany: {
          data: [
            { projectId: project.id },
            { projectId: project2.id },
            { projectId: project3.id },
          ],
        },
      },
    },
  });

  console.log("Created portfolio:", portfolio.name);

  // ==========================================
  // GOALS
  // ==========================================
  const goal1 = await prisma.goal.create({
    data: {
      name: "Launch new product by Q1 end",
      description: "Complete all development and go to market",
      workspaceId: workspace.id,
      ownerId: user.id,
      teamId: productTeam.id,
      status: "ON_TRACK",
      currentValue: 65,
      targetValue: 100,
      unit: "percent",
      timePeriodStart: new Date(today.getFullYear(), 0, 1),
      timePeriodEnd: new Date(today.getFullYear(), 2, 31),
    },
  });

  await prisma.goal.createMany({
    data: [
      {
        name: "Complete website redesign",
        workspaceId: workspace.id,
        ownerId: user.id,
        parentGoalId: goal1.id,
        status: "ON_TRACK",
        currentValue: 50,
        targetValue: 100,
        unit: "percent",
      },
      {
        name: "Ship mobile app beta",
        workspaceId: workspace.id,
        ownerId: user2.id,
        parentGoalId: goal1.id,
        teamId: engineeringTeam.id,
        status: "AT_RISK",
        currentValue: 30,
        targetValue: 100,
        unit: "percent",
      },
    ],
  });

  const goal2 = await prisma.goal.create({
    data: {
      name: "Increase user engagement by 25%",
      description: "Improve retention and daily active users",
      workspaceId: workspace.id,
      ownerId: user.id,
      status: "ON_TRACK",
      currentValue: 15,
      targetValue: 25,
      unit: "percent",
      timePeriodStart: new Date(today.getFullYear(), 0, 1),
      timePeriodEnd: new Date(today.getFullYear(), 5, 30),
    },
  });

  console.log("Created goals");

  // ==========================================
  // STATUS UPDATES
  // ==========================================
  await prisma.statusUpdate.create({
    data: {
      projectId: project.id,
      authorId: user.id,
      status: "ON_TRACK",
      title: "Week 3 Update",
      body: JSON.stringify("Good progress this week. Homepage mockup is nearly complete and the component library is coming together well. We're on track for the milestone deadline."),
    },
  });

  await prisma.statusUpdate.create({
    data: {
      projectId: project2.id,
      authorId: user2.id,
      status: "AT_RISK",
      title: "Sprint 2 Update",
      body: JSON.stringify("Onboarding flow is taking longer than expected due to edge cases with social auth. May need to push back the review date by a few days."),
    },
  });

  console.log("Created status updates");

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  const notifications = [
    {
      userId: user.id,
      type: "TASK_ASSIGNED" as const,
      resourceType: "task",
      resourceId: createdTasks[0].id,
      actorId: user2.id,
      message: `Alex Chen assigned you "Design new homepage mockup"`,
      isRead: false,
    },
    {
      userId: user.id,
      type: "COMMENT_ADDED" as const,
      resourceType: "task",
      resourceId: createdTasks[0].id,
      actorId: user2.id,
      message: `Alex Chen commented on "Design new homepage mockup"`,
      isRead: false,
    },
    {
      userId: user.id,
      type: "TASK_COMPLETED" as const,
      resourceType: "task",
      resourceId: createdTasks[3].id,
      actorId: user2.id,
      message: `Alex Chen completed "Implement user authentication"`,
      isRead: true,
    },
    {
      userId: user.id,
      type: "STATUS_UPDATE" as const,
      resourceType: "project",
      resourceId: project2.id,
      actorId: user2.id,
      message: `Alex Chen posted a status update on "Mobile App"`,
      isRead: false,
    },
    {
      userId: user.id,
      type: "DUE_DATE_APPROACHING" as const,
      resourceType: "task",
      resourceId: createdTasks[8].id,
      message: `"Responsive design audit" is due tomorrow`,
      isRead: false,
    },
    {
      userId: user.id,
      type: "MENTIONED" as const,
      resourceType: "task",
      resourceId: createdTasks[5].id,
      actorId: user2.id,
      message: `Alex Chen mentioned you in "Create component library"`,
      isRead: true,
    },
  ];

  await prisma.notification.createMany({ data: notifications });
  console.log("Created", notifications.length, "notifications");

  console.log("\n=== Seed completed successfully! ===");
  console.log("Login with: demo@taskflow.ai / password123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
