"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Flag,
  GitBranch,
  ChevronDown,
  Sparkles,
  Mail,
  Download,
  MoreHorizontal,
  Diamond,
  Send,
  Loader2,
  X,
  Wand2,
  FileText,
  Printer,
  Table,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FollowUpTaskDialog } from "@/components/task/follow-up-task-dialog";

type ViewMode = "list" | "board" | "calendar";

export function MyTasksContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [addingInSection, setAddingInSection] = useState<string | null>(null);
  const [sectionTaskTitle, setSectionTaskTitle] = useState("");
  const [sectionTaskDueDate, setSectionTaskDueDate] = useState("");
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
    onSuccess: (_data, variables) => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
      utils.tasks.get.invalidate({ id: variables.id });
      toast.success(variables.isApproval ? "Marked as approval" : "Approval removed");
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setShowAddTask(false);
      setSectionTaskTitle("");
      setSectionTaskDueDate("");
      setAddingInSection(null);
      toast.success("Task created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  const toggleMilestone = trpc.tasks.toggleMilestone.useMutation({
    onSuccess: (_data, variables) => {
      if (workspaceId) utils.tasks.myTasks.invalidate({ workspaceId });
      utils.tasks.get.invalidate({ id: variables.id });
      toast.success(variables.isMilestone ? "Marked as milestone" : "Milestone removed");
    },
  });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpTaskId, setFollowUpTaskId] = useState("");
  const [followUpTaskTitle, setFollowUpTaskTitle] = useState("");
  const [showApprovals, setShowApprovals] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "incomplete" | "completed">("all");
  const [showAiCreator, setShowAiCreator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showEmailTasks, setShowEmailTasks] = useState(false);
  const [emailTaskContent, setEmailTaskContent] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [syncing, setSyncing] = useState(false);

  const aiChat = trpc.ai.chat.useMutation();

  // Listen for quick-add-task events (on window to match QuickAddTaskDialog)
  useEffect(() => {
    const handleQuickAdd = () => setShowAddTask(true);
    window.addEventListener("quick-add-task", handleQuickAdd);
    return () => window.removeEventListener("quick-add-task", handleQuickAdd);
  }, []);

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

  const handleSectionAddTask = (sectionLabel: string) => {
    if (!sectionTaskTitle.trim()) return;
    // Pre-set due date based on section
    let dueDate = sectionTaskDueDate;
    if (!dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sectionLabel === "Overdue" || sectionLabel === "Today") {
        dueDate = today.toISOString().split("T")[0];
      } else if (sectionLabel === "Upcoming") {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dueDate = nextWeek.toISOString().split("T")[0];
      }
    }
    createTask.mutate({
      title: sectionTaskTitle.trim(),
      workspaceId,
      dueDate: dueDate ? new Date(dueDate + "T00:00:00.000Z").toISOString() : undefined,
    });
  };

  const handleExportCSV = () => {
    if (!tasks || tasks.length === 0) { toast.info("No tasks to export"); return; }
    const csv = ["Title,Status,Due Date,Project"].concat(
      tasks.map(t => `"${t.title}",${t.status},${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""},${t.taskProjects?.[0]?.project?.name ?? ""}`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "my-tasks.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Tasks exported as CSV");
  };

  const handlePrint = () => {
    if (!tasks || tasks.length === 0) { toast.info("No tasks to print"); return; }
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Please allow popups"); return; }
    printWindow.document.write(`
      <html><head><title>My Tasks</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; }
        h1 { font-size: 20px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .complete { text-decoration: line-through; color: #999; }
      </style></head><body>
      <h1>My Tasks</h1>
      <table>
        <thead><tr><th>Task</th><th>Status</th><th>Due Date</th><th>Project</th></tr></thead>
        <tbody>${tasks.map(t => `<tr class="${t.status === "COMPLETE" ? "complete" : ""}"><td>${t.title}</td><td>${t.status === "COMPLETE" ? "Complete" : "Incomplete"}</td><td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td><td>${t.taskProjects?.[0]?.project?.name ?? "—"}</td></tr>`).join("")}</tbody>
      </table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportGoogleSheets = () => {
    if (!tasks || tasks.length === 0) { toast.info("No tasks to export"); return; }
    const header = "Title\tStatus\tDue Date\tProject";
    const rows = tasks.map(t =>
      `${t.title}\t${t.status === "COMPLETE" ? "Complete" : "Incomplete"}\t${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}\t${t.taskProjects?.[0]?.project?.name ?? ""}`
    );
    const tsv = [header, ...rows].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "my-tasks.tsv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported for Google Sheets (TSV). Open in Google Sheets → File → Import");
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await aiChat.mutateAsync({
        message: `Generate a list of 5-7 actionable task titles for the following goal. Return ONLY a JSON array of strings, no markdown, no code fences, no explanation. Example: ["Task 1","Task 2","Task 3"]\n\nGoal: ${aiPrompt.trim()}`,
      });
      // Parse the AI response as a JSON array of task titles
      const text = result.response.trim();
      // Try to extract a JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiGeneratedTasks(parsed.map((t: any) => String(t)));
        } else {
          // Fallback: split by newlines
          setAiGeneratedTasks(text.split("\n").map(l => l.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 7));
        }
      } else {
        // Fallback: split by newlines and clean up
        setAiGeneratedTasks(text.split("\n").map(l => l.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 7));
      }
    } catch (err: any) {
      toast.error(err.message || "AI generation failed. Check your API key configuration.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAiTasks = () => {
    if (!aiGeneratedTasks.length || !workspaceId) return;
    aiGeneratedTasks.forEach((title) => {
      createTask.mutate({ title, workspaceId });
    });
    setAiGeneratedTasks([]);
    setAiPrompt("");
    setShowAiCreator(false);
    toast.success(`${aiGeneratedTasks.length} tasks created from AI suggestions`);
  };

  const handleEmailTaskSubmit = () => {
    if (!emailTaskContent.trim() || !workspaceId) return;
    // Parse email content into tasks (split by newlines)
    const lines = emailTaskContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    lines.forEach((title) => {
      createTask.mutate({ title, workspaceId });
    });
    setEmailTaskContent("");
    setEmailFrom("");
    setShowEmailTasks(false);
    toast.success(`${lines.length} task${lines.length > 1 ? "s" : ""} created from email`);
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

  // Filter for approvals and status
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (showApprovals) {
      result = result?.filter((t) => (t as any).isApproval === true);
    }
    if (statusFilter === "incomplete") {
      result = result?.filter((t) => t.status !== "COMPLETE");
    } else if (statusFilter === "completed") {
      result = result?.filter((t) => t.status === "COMPLETE");
    }
    return result;
  }, [tasks, showApprovals, statusFilter]);

  // Group by section: Recently assigned, Today, Upcoming
  const todayEnd = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : null;

  const overdueTasks = now
    ? filteredTasks?.filter(
        (t) => t.status === "INCOMPLETE" && t.dueDate && new Date(t.dueDate) < now
      ) || []
    : [];
  const todayTasks = now && todayEnd
    ? filteredTasks?.filter(
        (t) =>
          t.status === "INCOMPLETE" &&
          t.dueDate &&
          new Date(t.dueDate) >= now &&
          new Date(t.dueDate) < todayEnd
      ) || []
    : [];
  const upcomingTasks = todayEnd
    ? filteredTasks?.filter(
        (t) =>
          t.status === "INCOMPLETE" &&
          (!t.dueDate || new Date(t.dueDate) >= todayEnd)
      ) || []
    : filteredTasks?.filter((t) => t.status === "INCOMPLETE") || [];
  const completedTasks = filteredTasks?.filter((t) => t.status === "COMPLETE") || [];

  const sections = [
    { label: "Overdue", tasks: overdueTasks, color: "text-red-600" },
    { label: "Today", tasks: todayTasks, color: "text-green-600" },
    { label: "Upcoming", tasks: upcomingTasks, color: "text-[#1e1f21]" },
    { label: "Completed", tasks: completedTasks, color: "text-muted-foreground" },
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="flex h-[calc(100%-56px)]">
      <div className="flex-1 overflow-y-auto">
        {/* Header with dropdown */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-[#1e1f21]">My Tasks</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("quick-add-task"))}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Quick add task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowApprovals(!showApprovals)}>
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  {showApprovals ? "Show all tasks" : "View approvals"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAiCreator(true)}>
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Add tasks via AI
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="mr-2 h-3.5 w-3.5" />
                  Print tasks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportGoogleSheets}>
                  <Table className="mr-2 h-3.5 w-3.5" />
                  Export for Google Sheets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("quick-add-task"))}>
                Create task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowApprovals(!showApprovals)}>
                {showApprovals ? "Show all tasks" : "View approvals"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("incomplete")}>
                Show incomplete only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                Show completed only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                Show all tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
              {/* Inline Add Task Form */}
              {showAddTask && (
                <div className="mb-4 rounded-lg border bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-[#cfcbcb] shrink-0" />
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTaskTitle.trim()) {
                          createTask.mutate({
                            title: newTaskTitle.trim(),
                            workspaceId,
                            dueDate: newTaskDueDate ? new Date(newTaskDueDate + "T00:00:00.000Z").toISOString() : undefined,
                          });
                        }
                        if (e.key === "Escape") {
                          setShowAddTask(false);
                          setNewTaskTitle("");
                          setNewTaskDueDate("");
                        }
                      }}
                      placeholder="Write a task name, press Enter to save"
                      className="flex-1 text-sm border-none bg-transparent px-0 outline-none focus:ring-0"
                      autoFocus
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="h-7 rounded border px-2 text-xs text-muted-foreground"
                    />
                    <Button
                      size="sm"
                      className="h-7 bg-[#4573D2] hover:bg-[#3A63B8] text-xs"
                      disabled={!newTaskTitle.trim() || createTask.isPending}
                      onClick={() => {
                        if (newTaskTitle.trim()) {
                          createTask.mutate({
                            title: newTaskTitle.trim(),
                            workspaceId,
                            dueDate: newTaskDueDate ? new Date(newTaskDueDate + "T00:00:00.000Z").toISOString() : undefined,
                          });
                        }
                      }}
                    >
                      {createTask.isPending ? "Adding..." : "Add task"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setShowAddTask(false);
                        setNewTaskTitle("");
                        setNewTaskDueDate("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

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
                  <Button
                    className="mt-4 gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
                    size="sm"
                    onClick={() => setShowAddTask(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add task
                  </Button>
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
                                "flex-1 text-left text-sm flex items-center gap-1.5",
                                task.status === "COMPLETE" &&
                                  "text-muted-foreground line-through"
                              )}
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              {(task as any).isMilestone && <Diamond className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              {task.title}
                              {(task as any).isApproval && (
                                <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">Approval</span>
                              )}
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

                        {/* Inline Add Task per section */}
                        {addingInSection === section.label ? (
                          <div className="mt-1 rounded-lg border bg-white p-2.5 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Circle className="h-4 w-4 text-[#cfcbcb] shrink-0" />
                              <input
                                value={sectionTaskTitle}
                                onChange={(e) => setSectionTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && sectionTaskTitle.trim()) {
                                    handleSectionAddTask(section.label);
                                  }
                                  if (e.key === "Escape") {
                                    setAddingInSection(null);
                                    setSectionTaskTitle("");
                                    setSectionTaskDueDate("");
                                  }
                                }}
                                placeholder="Write a task name, press Enter to save"
                                className="flex-1 text-sm border-none bg-transparent px-0 outline-none focus:ring-0"
                                autoFocus
                              />
                            </div>
                            <div className="mt-2 flex items-center gap-2 pl-6">
                              <input
                                type="date"
                                value={sectionTaskDueDate}
                                onChange={(e) => setSectionTaskDueDate(e.target.value)}
                                className="h-7 rounded border px-2 text-xs text-muted-foreground"
                              />
                              <Button
                                size="sm"
                                className="h-7 bg-[#4573D2] hover:bg-[#3A63B8] text-xs"
                                disabled={!sectionTaskTitle.trim() || createTask.isPending}
                                onClick={() => handleSectionAddTask(section.label)}
                              >
                                {createTask.isPending ? "Adding..." : "Add task"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setAddingInSection(null);
                                  setSectionTaskTitle("");
                                  setSectionTaskDueDate("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingInSection(section.label);
                              setSectionTaskTitle("");
                              setSectionTaskDueDate("");
                            }}
                            className="mt-1 flex w-full items-center gap-2 rounded py-1.5 text-sm text-muted-foreground hover:text-[#4573D2]"
                          >
                            <Plus className="h-4 w-4" />
                            Add task
                          </button>
                        )}
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
        className="fixed bottom-6 right-6 z-10 gap-1.5 rounded-full bg-[#4573D2] px-4 py-2 shadow-lg hover:bg-[#3A63B8]"
        onClick={() => setShowAddTask(true)}
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

      <FollowUpTaskDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        originalTaskId={followUpTaskId}
        originalTaskTitle={followUpTaskTitle}
        workspaceId={workspaceId}
      />

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
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              markAsApproval.mutate({ id: contextMenu.taskId, isApproval: !(task as any)?.isApproval });
              setContextMenu(null);
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> {(tasks?.find(t => t.id === contextMenu.taskId) as any)?.isApproval ? "Remove approval" : "Mark as approval"}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              toggleMilestone.mutate({ id: contextMenu.taskId, isMilestone: !(task as any)?.isMilestone });
              setContextMenu(null);
            }}
          >
            <Diamond className="h-3.5 w-3.5" /> {(tasks?.find(t => t.id === contextMenu.taskId) as any)?.isMilestone ? "Remove milestone" : "Mark as milestone"}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => {
              const task = tasks?.find(t => t.id === contextMenu.taskId);
              setFollowUpTaskId(contextMenu.taskId);
              setFollowUpTaskTitle(task?.title ?? "");
              setFollowUpOpen(true);
              setContextMenu(null);
            }}
          >
            <GitBranch className="h-3.5 w-3.5" /> Create follow up task
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

      {/* AI Task Creator Dialog */}
      <Dialog open={showAiCreator} onOpenChange={setShowAiCreator}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Add Tasks via AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">
                Describe what you need to accomplish and AI will generate tasks for you
              </Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Plan a marketing campaign for product launch, Build a new landing page, Design a mobile app..."
                className="mt-2 min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAiGenerate();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || aiLoading}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating tasks...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Tasks
                </>
              )}
            </Button>

            {aiGeneratedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Generated Tasks ({aiGeneratedTasks.length})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setAiGeneratedTasks([])}
                  >
                    Clear all
                  </Button>
                </div>
                <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-lg border p-2">
                  {aiGeneratedTasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                      <Circle className="h-3.5 w-3.5 text-[#cfcbcb] shrink-0" />
                      <span className="flex-1 text-sm">{task}</span>
                      <button
                        onClick={() => setAiGeneratedTasks((prev) => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddAiTasks}
                    disabled={createTask.isPending}
                    className="flex-1 gap-2 bg-[#4573D2] hover:bg-[#3A63B8]"
                  >
                    <Plus className="h-4 w-4" />
                    Add {aiGeneratedTasks.length} task{aiGeneratedTasks.length > 1 ? "s" : ""}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAiGeneratedTasks([]);
                      setAiPrompt("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Tasks via Email Dialog */}
      <Dialog open={showEmailTasks} onOpenChange={setShowEmailTasks}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Add Tasks via Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Email forwarding address */}
            <div className="rounded-lg border border-dashed bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-700">Your task email address</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1 text-xs text-blue-800 border">
                  tasks+{workspaceId?.slice(0, 8) ?? "workspace"}@asana-clone.app
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(`tasks+${workspaceId?.slice(0, 8) ?? "workspace"}@asana-clone.app`);
                    toast.success("Email address copied to clipboard");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-blue-600">
                Forward emails to this address to automatically create tasks
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">or paste email content</span>
              </div>
            </div>

            <div>
              <Label htmlFor="email-from">From (optional)</Label>
              <Input
                id="email-from"
                type="email"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
                placeholder="sender@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email-content">
                Email content <span className="text-muted-foreground text-xs">(one task per line)</span>
              </Label>
              <Textarea
                id="email-content"
                value={emailTaskContent}
                onChange={(e) => setEmailTaskContent(e.target.value)}
                placeholder={"Review Q4 budget report\nSchedule team standup\nPrepare presentation slides\nSend follow-up to client"}
                className="mt-1 min-h-[120px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {emailTaskContent.split("\n").filter((l) => l.trim()).length} task{emailTaskContent.split("\n").filter((l) => l.trim()).length !== 1 ? "s" : ""} detected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEmailTasks(false);
                    setEmailTaskContent("");
                    setEmailFrom("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEmailTaskSubmit}
                  disabled={!emailTaskContent.trim() || createTask.isPending}
                  className="gap-2 bg-[#4573D2] hover:bg-[#3A63B8]"
                >
                  <Send className="h-4 w-4" />
                  Create Tasks
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
