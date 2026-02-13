"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import {
  Plus,
  List,
  Columns3,
  Calendar,
  CheckCircle2,
  Circle,
  GripVertical,
} from "lucide-react";

type ViewMode = "list" | "board" | "calendar";

export function MyTasksContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: tasks } = trpc.tasks.myTasks.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
    },
  });

  const uncompleteTask = trpc.tasks.uncomplete.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
    },
  });

  const handleToggle = (taskId: string, status: string) => {
    if (status === "COMPLETE") {
      uncompleteTask.mutate({ id: taskId });
    } else {
      completeTask.mutate({ id: taskId });
    }
  };

  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);

  const formatDate = (date: string | Date | null) => {
    if (!date || !now) return null;
    const d = new Date(date);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = (date: string | Date | null) => {
    if (!date || !now) return false;
    return new Date(date) < now;
  };

  // Group by section: Recently assigned, Today, Upcoming
  const todayEnd = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : null;

  const overdueTasks = now
    ? tasks?.filter(
        (t) => t.status === "INCOMPLETE" && t.dueDate && new Date(t.dueDate) < now
      ) || []
    : [];
  const todayTasks = now && todayEnd
    ? tasks?.filter(
        (t) =>
          t.status === "INCOMPLETE" &&
          t.dueDate &&
          new Date(t.dueDate) >= now &&
          new Date(t.dueDate) < todayEnd
      ) || []
    : [];
  const upcomingTasks = todayEnd
    ? tasks?.filter(
        (t) =>
          t.status === "INCOMPLETE" &&
          (!t.dueDate || new Date(t.dueDate) >= todayEnd)
      ) || []
    : tasks?.filter((t) => t.status === "INCOMPLETE") || [];
  const completedTasks = tasks?.filter((t) => t.status === "COMPLETE") || [];

  const sections = [
    { label: "Overdue", tasks: overdueTasks, color: "text-red-600" },
    { label: "Today", tasks: todayTasks, color: "text-green-600" },
    { label: "Upcoming", tasks: upcomingTasks, color: "text-[#1e1f21]" },
    { label: "Completed", tasks: completedTasks, color: "text-muted-foreground" },
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="flex h-[calc(100%-56px)]">
      <div className="flex-1 overflow-y-auto">
        {/* View Tabs */}
        <div className="flex items-center gap-1 border-b bg-white px-6 py-1">
          {([
            { key: "list", label: "List", icon: List },
            { key: "board", label: "Board", icon: Columns3 },
            { key: "calendar", label: "Calendar", icon: Calendar },
          ] as const).map((v) => (
            <Button
              key={v.key}
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                viewMode === v.key
                  ? "bg-muted text-[#1e1f21]"
                  : "text-muted-foreground"
              )}
              onClick={() => setViewMode(v.key)}
            >
              <v.icon className="h-3.5 w-3.5" />
              {v.label}
            </Button>
          ))}
        </div>

        <div className="p-6">
          {!tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-medium text-[#1e1f21]">
                Start adding tasks
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Track your work by adding tasks. Organize them into sections and
                set due dates.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.label}>
                  <h3
                    className={cn(
                      "mb-2 text-sm font-semibold",
                      section.color
                    )}
                  >
                    {section.label}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {section.tasks.length}
                    </span>
                  </h3>
                  <div className="space-y-px">
                    {section.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center rounded py-1.5 hover:bg-[#f9f8f8]"
                      >
                        <GripVertical className="mr-1 h-3.5 w-3.5 text-transparent group-hover:text-[#cfcbcb]" />
                        <button
                          onClick={() =>
                            handleToggle(task.id, task.status)
                          }
                          className="mr-2 flex-shrink-0"
                        >
                          {task.status === "COMPLETE" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-[#cfcbcb] hover:text-green-600" />
                          )}
                        </button>
                        <button
                          className={cn(
                            "flex-1 text-left text-sm",
                            task.status === "COMPLETE" &&
                              "text-muted-foreground line-through"
                          )}
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          {task.title}
                        </button>
                        {task.taskProjects?.[0] && (
                          <span className="mr-4 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {task.taskProjects[0].project.name}
                          </span>
                        )}
                        {task.dueDate && (
                          <span
                            className={cn(
                              "text-xs",
                              isOverdue(task.dueDate) &&
                                task.status !== "COMPLETE"
                                ? "text-red-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
