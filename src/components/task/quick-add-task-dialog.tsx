"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FolderKanban, User } from "lucide-react";

type TaskMode = "project" | "standalone";

export function QuickAddTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taskMode, setTaskMode] = useState<TaskMode>("project");

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  useEffect(() => {
    if (projects?.[0] && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("quick-add-task", handler);
    return () => window.removeEventListener("quick-add-task", handler);
  }, []);

  // Tab+Q shortcut
  useEffect(() => {
    let tabPressed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        tabPressed = true;
        setTimeout(() => {
          tabPressed = false;
        }, 500);
      }
      if (e.key === "q" && tabPressed) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const utils = trpc.useUtils();
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.myTasks.invalidate();
      toast.success("Task created");
      setTitle("");
      setDueDate("");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskMode === "project") {
      if (!selectedProjectId) {
        toast.error("Please select a project");
        return;
      }
      createTask.mutate({
        title: title.trim(),
        projectId: selectedProjectId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
    } else {
      // Standalone task - no project
      createTask.mutate({
        title: title.trim(),
        workspaceId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>

        {/* Task Mode Toggle */}
        <div className="flex gap-2 rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setTaskMode("project")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              taskMode === "project"
                ? "bg-[#4573D2] text-white"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <FolderKanban className="h-4 w-4" />
            Under a Project
          </button>
          <button
            type="button"
            onClick={() => setTaskMode("standalone")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              taskMode === "standalone"
                ? "bg-[#4573D2] text-white"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <User className="h-4 w-4" />
            Standalone Task
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-title">Task name</Label>
            <Input
              id="task-title"
              placeholder="Write a task name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {taskMode === "project" && (
            <div>
              <Label htmlFor="task-project">Project</Label>
              <select
                id="task-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {taskMode === "standalone" && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                This task will be created without a project and will appear in your <strong>My Tasks</strong> section.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
