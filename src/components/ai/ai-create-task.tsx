"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2, Plus } from "lucide-react";

interface AiCreateTaskProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTaskCreated: () => void;
}

export function AiCreateTask({
  open,
  onOpenChange,
  projectId,
  onTaskCreated,
}: AiCreateTaskProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<{
    title: string;
    description: string | null;
    dueDate: string | null;
    priority: string | null;
    subtasks: string[];
  } | null>(null);

  const parseTask = trpc.ai.parseTaskFromText.useMutation({
    onSuccess: (data) => setParsed(data),
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      onTaskCreated();
      setParsed(null);
      setText("");
      onOpenChange(false);
    },
  });

  const handleParse = () => {
    if (!text.trim()) return;
    parseTask.mutate({ text: text.trim(), projectId });
  };

  const handleCreate = () => {
    if (!parsed) return;
    createTask.mutate({
      title: parsed.title,
      projectId,
      ...(parsed.dueDate && { dueDate: parsed.dueDate }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#4573D2]" />
            Create task with AI
          </DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe what you need to do in natural language. AI will parse it
              into a structured task.
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g., "Schedule a design review meeting with the team by Friday to go over the new homepage mockups and gather feedback"'
              rows={4}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!text.trim() || parseTask.isPending}
                className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {parseTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Parse with AI
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <p className="text-sm font-medium text-[#1e1f21]">
                  {parsed.title}
                </p>
              </div>

              {parsed.description && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-sm text-[#1e1f21]">
                    {parsed.description}
                  </p>
                </div>
              )}

              {parsed.dueDate && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Due date
                  </label>
                  <p className="text-sm text-[#1e1f21]">
                    {new Date(parsed.dueDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {parsed.priority && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      parsed.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : parsed.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {parsed.priority}
                  </span>
                </div>
              )}

              {parsed.subtasks.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Subtasks
                  </label>
                  <ul className="mt-1 space-y-1">
                    {parsed.subtasks.map((st, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-[#1e1f21]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {st}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setParsed(null);
                }}
              >
                Edit
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTask.isPending}
                className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {createTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create task
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
