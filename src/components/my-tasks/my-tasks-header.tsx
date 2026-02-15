"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ChevronDown,
  Plus,
  Download,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export function MyTasksHeader() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const { data: tasks } = trpc.tasks.myTasks.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const handleExportCSV = () => {
    if (!tasks || tasks.length === 0) {
      toast.info("No tasks to export");
      return;
    }
    const headers = ["Title", "Status", "Due Date", "Project"];
    const rows = tasks.map((t) => [
      t.title,
      t.status,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
      t.taskProjects?.[0]?.project?.name || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-tasks.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tasks exported as CSV");
  };

  return (
    <div className="flex h-14 items-center border-b bg-white px-6">
      <div className="flex items-center gap-1">
        <h1 className="text-lg font-medium text-[#1e1f21]">My tasks</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => document.dispatchEvent(new CustomEvent("quick-add-task"))}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Quick add task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Viewing pending approvals")}>
              <ShieldCheck className="mr-2 h-3.5 w-3.5" />
              View approvals
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("AI task suggestions coming soon")}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Add tasks via AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
