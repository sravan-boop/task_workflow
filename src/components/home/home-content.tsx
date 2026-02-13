"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  Users,
  Settings2,
  Plus,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { toast } from "sonner";

export function HomeContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  // Onboarding
  const { data: onboardingStatus } = trpc.auth.getOnboardingStatus.useQuery();
  const markOnboarded = trpc.auth.markOnboarded.useMutation({
    onSuccess: () => {
      utils.auth.getOnboardingStatus.invalidate();
    },
  });
  const utils = trpc.useUtils();
  const showOnboarding = onboardingStatus?.isOnboarded === false;

  const { data: myTasks } = trpc.tasks.myTasks.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
    },
  });

  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);
  const incompleteTasks =
    myTasks?.filter((t) => t.status === "INCOMPLETE") || [];
  const completedTasks =
    myTasks?.filter((t) => t.status === "COMPLETE") || [];
  const overdueTasks = now
    ? incompleteTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
    : [];
  const upcomingTasks = now
    ? incompleteTasks.filter((t) => !t.dueDate || new Date(t.dueDate) >= now)
    : incompleteTasks;

  const formatDate = (date: string | Date | null) => {
    if (!date || !now) return "";
    const d = new Date(date);
    const today = now;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  const renderTaskRow = (task: NonNullable<typeof myTasks>[number]) => (
    <div
      key={task.id}
      className="flex items-center gap-2 border-b border-gray-100 py-2"
    >
      <button
        onClick={() => completeTask.mutate({ id: task.id })}
        className="flex-shrink-0"
      >
        {task.status === "COMPLETE" ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-[#cfcbcb] hover:text-green-600" />
        )}
      </button>
      <Link
        href={`/my-tasks`}
        className={cn(
          "flex-1 truncate text-sm",
          task.status === "COMPLETE" && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </Link>
      {task.dueDate && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            now && new Date(task.dueDate) < now && task.status !== "COMPLETE"
              ? "text-red-600"
              : "text-muted-foreground"
          )}
        >
          {formatDate(task.dueDate)}
        </span>
      )}
    </div>
  );

  return (
    <div className="mt-6">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <strong className="text-[#1e1f21]">{completedTasks.length}</strong>{" "}
          tasks completed
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <strong className="text-[#1e1f21]">0</strong> collaborators
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs text-muted-foreground"
          onClick={() => toast.info("Dashboard customization coming soon")}
        >
          <Settings2 className="mr-1 h-3.5 w-3.5" />
          Customize
        </Button>
      </div>

      {/* Widget Grid */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        {/* My Tasks Widget */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              <Link href="/my-tasks" className="hover:text-[#4573D2]">
                My tasks
              </Link>
            </CardTitle>
            <Link href="/my-tasks">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger
                  value="upcoming"
                  className="h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-[#1e1f21] data-[state=active]:shadow-none"
                >
                  Upcoming
                </TabsTrigger>
                <TabsTrigger
                  value="overdue"
                  className="h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-[#1e1f21] data-[state=active]:shadow-none"
                >
                  Overdue ({overdueTasks.length})
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-[#1e1f21] data-[state=active]:shadow-none"
                >
                  Completed
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="mt-2">
                {upcomingTasks.length > 0 ? (
                  <div>
                    {upcomingTasks.slice(0, 5).map(renderTaskRow)}
                    {upcomingTasks.length > 5 && (
                      <Link
                        href="/my-tasks"
                        className="mt-2 block text-center text-xs text-[#4573D2] hover:underline"
                      >
                        View all {upcomingTasks.length} tasks
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No upcoming tasks
                  </div>
                )}
              </TabsContent>
              <TabsContent value="overdue" className="mt-2">
                {overdueTasks.length > 0 ? (
                  <div>{overdueTasks.slice(0, 5).map(renderTaskRow)}</div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No overdue tasks
                  </div>
                )}
              </TabsContent>
              <TabsContent value="completed" className="mt-2">
                {completedTasks.length > 0 ? (
                  <div>
                    {completedTasks.slice(0, 5).map(renderTaskRow)}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No completed tasks
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Projects Widget */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Projects</CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs font-normal">
                Recents
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => document.dispatchEvent(new CustomEvent("create-project"))}
                title="Create project"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projects?.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1e1f21]">
                      {project.name}
                    </p>
                    {project.team && (
                      <p className="text-xs text-muted-foreground">
                        {project.team.name}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              {(!projects || projects.length === 0) && (
                <button
                  className="flex w-full items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-solid hover:bg-muted/30"
                  onClick={() => document.dispatchEvent(new CustomEvent("create-project"))}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border">
                    <Plus className="h-5 w-5" />
                  </div>
                  Create project
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks I've Assigned Widget */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              <Link href="/my-tasks" className="hover:text-[#4573D2]">
                Tasks I&apos;ve assigned
              </Link>
            </CardTitle>
            <Link href="/my-tasks">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No assigned tasks yet
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Widget */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              <Link href="/goals" className="hover:text-[#4573D2]">Goals</Link>
            </CardTitle>
            <Link href="/goals">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Set goals to track your progress
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => markOnboarded.mutate()}
        />
      )}
    </div>
  );
}
