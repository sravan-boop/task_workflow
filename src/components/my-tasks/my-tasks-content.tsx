"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import { toast } from "sonner";
import {
  Plus,
  List,
  Columns3,
  Calendar,
  CheckCircle2,
  Circle,
  GripVertical,
  ExternalLink,
  Copy,
  CopyPlus,
  Trash2,
  ShieldCheck,
  CalendarPlus,
  Sun,
  CalendarRange,
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

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
      toast.success("Task deleted");
    },
  });

  const duplicateTask = trpc.tasks.duplicate.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
      toast.success("Task duplicated");
    },
  });

  const markAsApproval = trpc.tasks.markAsApproval.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
      toast.success("Marked as approval");
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
    },
  });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handler);
      document.addEventListener("contextmenu", handler);
      return () => {
        document.removeEventListener("click", handler);
        document.removeEventListener("contextmenu", handler);
      };
    }
  }, [contextMenu]);

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
          {viewMode === "list" && (
            <>
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
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id });
                            }}
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
            </>
          )}

          {viewMode === "board" && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[
                { label: "To do", tasks: tasks?.filter(t => t.status === "INCOMPLETE" && (!t.dueDate || new Date(t.dueDate) >= (now || new Date()))) || [] },
                { label: "In progress", tasks: overdueTasks },
                { label: "Done", tasks: completedTasks },
              ].map((col) => (
                <div key={col.label} className="min-w-[280px] flex-1 rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-3 text-sm font-semibold text-[#1e1f21]">
                    {col.label} <span className="ml-1 text-xs font-normal text-muted-foreground">{col.tasks.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {col.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(task.id, task.status); }}
                            className="flex-shrink-0"
                          >
                            {task.status === "COMPLETE" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-[#cfcbcb] hover:text-green-600" />
                            )}
                          </button>
                          <span className={cn("flex-1 text-sm", task.status === "COMPLETE" && "text-muted-foreground line-through")}>
                            {task.title}
                          </span>
                        </div>
                        {(task.dueDate || task.taskProjects?.[0]) && (
                          <div className="mt-2 flex items-center gap-2">
                            {task.taskProjects?.[0] && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {task.taskProjects[0].project.name}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className={cn("text-[10px]", isOverdue(task.dueDate) && task.status !== "COMPLETE" ? "text-red-600" : "text-muted-foreground")}>
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "calendar" && (
            <div>
              <div className="grid grid-cols-7 gap-px rounded-lg border bg-gray-200">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="bg-gray-50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {(() => {
                  const today = now || new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  const startDay = startOfMonth.getDay();
                  const cells = [];
                  // Empty cells before first day
                  for (let i = 0; i < startDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="min-h-[80px] bg-white p-1" />);
                  }
                  // Days of month
                  for (let d = 1; d <= endOfMonth.getDate(); d++) {
                    const date = new Date(today.getFullYear(), today.getMonth(), d);
                    const dayTasks = tasks?.filter(t => {
                      if (!t.dueDate) return false;
                      const td = new Date(t.dueDate);
                      return td.getDate() === d && td.getMonth() === date.getMonth() && td.getFullYear() === date.getFullYear();
                    }) || [];
                    const isToday = date.toDateString() === today.toDateString();
                    cells.push(
                      <div key={d} className={cn("min-h-[80px] bg-white p-1", isToday && "bg-blue-50")}>
                        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday && "bg-[#4573D2] text-white")}>
                          {d}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayTasks.slice(0, 2).map(t => (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTaskId(t.id)}
                              className={cn("block w-full truncate rounded px-1 py-0.5 text-left text-[10px]",
                                t.status === "COMPLETE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                              )}
                            >
                              {t.title}
                            </button>
                          ))}
                          {dayTasks.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        className="fixed bottom-6 right-6 gap-1.5 rounded-full bg-[#4573D2] px-4 py-2 shadow-lg hover:bg-[#3A63B8]"
        onClick={() => document.dispatchEvent(new CustomEvent("quick-add-task"))}
      >
        <Plus className="h-4 w-4" />
        Add task
      </Button>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 min-w-[180px] rounded-md border bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => { setSelectedTaskId(contextMenu.taskId); setContextMenu(null); }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open task
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => { duplicateTask.mutate({ id: contextMenu.taskId }); setContextMenu(null); }}
          >
            <CopyPlus className="h-3.5 w-3.5" /> Duplicate
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/my-tasks?task=${contextMenu.taskId}`);
              toast.success("Link copied");
              setContextMenu(null);
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy link
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              markAsApproval.mutate({ id: contextMenu.taskId, isApproval: true });
              setContextMenu(null);
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Mark as approval
          </button>
          <div className="my-1 border-t" />
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Set due date</div>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const today = new Date();
              today.setHours(0,0,0,0);
              updateTask.mutate({ id: contextMenu.taskId, dueDate: today.toISOString() });
              setContextMenu(null);
            }}
          >
            <Sun className="h-3.5 w-3.5" /> Today
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0,0,0,0);
              updateTask.mutate({ id: contextMenu.taskId, dueDate: tomorrow.toISOString() });
              setContextMenu(null);
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Tomorrow
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              nextWeek.setHours(0,0,0,0);
              updateTask.mutate({ id: contextMenu.taskId, dueDate: nextWeek.toISOString() });
              setContextMenu(null);
            }}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Next week
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find((t) => t.id === contextMenu.taskId);
              if (task) handleToggle(task.id, task.status);
              setContextMenu(null);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {tasks?.find((t) => t.id === contextMenu.taskId)?.status === "COMPLETE" ? "Mark incomplete" : "Mark complete"}
          </button>
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted/50"
            onClick={() => { deleteTask.mutate({ id: contextMenu.taskId }); setContextMenu(null); }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
