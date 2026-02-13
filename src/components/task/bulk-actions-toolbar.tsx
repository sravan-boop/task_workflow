"use client";

import { useState } from "react";
import { useBulkSelection } from "@/contexts/bulk-selection-context";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  CheckCircle2,
  Trash2,
  UserPlus,
  CalendarDays,
  ArrowRightLeft,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BulkActionsToolbarProps {
  projectId: string;
  sections?: Array<{ id: string; name: string }>;
}

export function BulkActionsToolbar({
  projectId,
  sections,
}: BulkActionsToolbarProps) {
  const { selectedTaskIds, clearSelection, count } = useBulkSelection();
  const [dueDate, setDueDate] = useState("");
  const utils = trpc.useUtils();

  const bulkUpdate = trpc.tasks.bulkUpdate.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      clearSelection();
    },
  });

  const bulkDelete = trpc.tasks.bulkDelete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      clearSelection();
      toast.success(`${count} tasks deleted`);
    },
  });

  const bulkMove = trpc.tasks.bulkMove.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ projectId });
      clearSelection();
      toast.success("Tasks moved");
    },
  });

  if (count === 0) return null;

  const taskIds = Array.from(selectedTaskIds);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-lg dark:bg-card">
        <span className="text-sm font-medium">
          {count} task{count > 1 ? "s" : ""} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={clearSelection}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />

        {/* Bulk Complete */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            bulkUpdate.mutate({ taskIds, status: "COMPLETE" });
            toast.success(`${count} tasks completed`);
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          Complete
        </Button>

        {/* Bulk Set Due Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              Due Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="center">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                if (dueDate) {
                  bulkUpdate.mutate({
                    taskIds,
                    dueDate: new Date(dueDate).toISOString(),
                  });
                  setDueDate("");
                  toast.success("Due dates updated");
                }
              }}
            >
              Apply
            </Button>
          </PopoverContent>
        </Popover>

        {/* Bulk Move */}
        {sections && sections.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Move
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="center">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className="w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    bulkMove.mutate({
                      taskIds,
                      projectId,
                      sectionId: section.id,
                    });
                  }}
                >
                  {section.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {/* Bulk Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm(`Delete ${count} tasks? This cannot be undone.`)) {
              bulkDelete.mutate({ taskIds });
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
