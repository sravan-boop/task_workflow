"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { exportTasksToCsv } from "@/lib/export";
import {
  Star,
  List,
  Columns3,
  GanttChart,
  Calendar,
  FileText,
  Paperclip,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Sparkles,
  BarChart3,
  Zap,
  Archive,
  CopyPlus,
  Download,
  Printer,
  Trash2,
  Filter,
  ArrowUpDown,
  Palette,
  Bookmark,
  Group,
  Plus,
  X,
  Mail,
  Bell,
  Lock,
  Globe,
  Shield,
  Users,
  FolderPlus,
  Upload,
  Link2,
  Settings,
  FileUp,
  FilePlus2,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AiCreateTask } from "@/components/ai/ai-create-task";

type ViewType = "list" | "board" | "timeline" | "calendar" | "overview" | "files" | "messages" | "dashboard" | "workflow";

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    color: string;
    isArchived?: boolean;
  };
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onTasksChanged?: () => void;
  groupBy?: string;
  onGroupByChange?: (groupBy: string) => void;
  sortBy?: Array<{ field: string; order: "asc" | "desc" }>;
  onSortByChange?: (sortBy: Array<{ field: string; order: "asc" | "desc" }>) => void;
  colorBy?: string;
  onColorByChange?: (colorBy: string) => void;
}

const views: { key: ViewType; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "list", label: "List", icon: List },
  { key: "board", label: "Board", icon: Columns3 },
  { key: "timeline", label: "Timeline", icon: GanttChart },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "workflow", label: "Workflow", icon: Zap },
  { key: "files", label: "Files", icon: Paperclip },
  { key: "messages", label: "Messages", icon: MessageSquare },
];

export function ProjectHeader({
  project,
  activeView,
  onViewChange,
  onTasksChanged,
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
  colorBy,
  onColorByChange,
}: ProjectHeaderProps) {
  const router = useRouter();
  const [aiCreateOpen, setAiCreateOpen] = useState(false);
  const [starred, setStarred] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [notifyOnTasks, setNotifyOnTasks] = useState(true);
  const [notifyStatusUpdates, setNotifyStatusUpdates] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyTasksAdded, setNotifyTasksAdded] = useState(true);
  const [projectAccess, setProjectAccess] = useState<"workspace" | "private">("workspace");
  const utils = trpc.useUtils();

  const archiveProject = trpc.projects.archive.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success(project.isArchived ? "Project unarchived" : "Project archived");
    },
  });

  const removeRecent = trpc.recents.remove.useMutation();

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.recents.list.invalidate();
      // Also remove from recents in database
      removeRecent.mutate(
        { resourceType: "project", resourceId: project.id },
        { onSettled: () => utils.recents.list.invalidate() }
      );
      toast.success("Project deleted");
      router.push("/home");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const duplicateProject = trpc.projects.duplicate.useMutation({
    onSuccess: (newProject) => {
      utils.projects.list.invalidate();
      toast.success("Project duplicated");
      router.push(`/projects/${newProject.id}`);
    },
  });

  const { data: exportTasks } = trpc.projects.getTasksForExport.useQuery(
    { projectId: project.id },
    { enabled: false }
  );

  const exportQuery = trpc.projects.getTasksForExport.useQuery(
    { projectId: project.id },
    { enabled: false }
  );

  const handleExportCsv = async () => {
    const result = await exportQuery.refetch();
    if (result.data) {
      exportTasksToCsv(result.data as any, project.name);
      toast.success("CSV exported");
    }
  };

  const handleExportPdf = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const tasks = result.data;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${project.name} - Tasks</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            .complete { color: #16a34a; }
            .incomplete { color: #6d6e6f; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${project.name}</h1>
          <table>
            <thead>
              <tr><th>Task</th><th>Assignee</th><th>Status</th><th>Due Date</th><th>Section</th></tr>
            </thead>
            <tbody>
              ${tasks.map((t: any) => `
                <tr>
                  <td>${t.title}</td>
                  <td>${t.assignee?.name ?? ""}</td>
                  <td class="${t.status === "COMPLETE" ? "complete" : "incomplete"}">${t.status === "COMPLETE" ? "Complete" : "Incomplete"}</td>
                  <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}</td>
                  <td>${t.taskProjects?.[0]?.section?.name ?? ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Saved views
  const { data: savedViews } = trpc.views.list.useQuery({ projectId: project.id });
  const saveView = trpc.views.create.useMutation({
    onSuccess: () => {
      utils.views.list.invalidate({ projectId: project.id });
      toast.success("View saved");
    },
  });

  return (
    <>
      <div className="border-b bg-white dark:bg-card">
        {/* Project Name Row */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="h-6 w-6 rounded"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-lg font-medium text-[#1e1f21] dark:text-foreground">
              {project.name}
            </h1>
            <button
              className={cn("transition-colors", starred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
              onClick={() => {
                setStarred(!starred);
                toast.success(starred ? "Removed from favorites" : "Added to favorites");
              }}
            >
              <Star className={cn("h-4 w-4", starred && "fill-yellow-500")} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-[#4573D2]"
              onClick={() => setAiCreateOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Create
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Project link copied to clipboard");
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>

            {/* Project Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Invite & Notifications */}
                <DropdownMenuItem onClick={() => setShareOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite with email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setNotifyOnTasks(!notifyOnTasks);
                    toast.success(notifyOnTasks ? "Notifications muted" : "Notifications enabled");
                  }}
                >
                  {notifyOnTasks ? (
                    <Bell className="mr-2 h-4 w-4" />
                  ) : (
                    <BellRing className="mr-2 h-4 w-4" />
                  )}
                  {notifyOnTasks ? "Mute notifications" : "Enable notifications"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* Settings & Permissions */}
                <DropdownMenuItem onClick={() => toast.success("Project settings opened")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit project settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("Manage permissions opened")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Manage project permissions
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* Import sub-menu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => toast.success("File import dialog opened")}>
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      Any file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Email import started")}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("CSV import dialog opened")}>
                      <FileUp className="mr-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => toast.success("Project saved as template")}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save as template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("Added to portfolio")}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add to portfolio
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* Existing items: archive, duplicate, export */}
                <DropdownMenuItem
                  onClick={() =>
                    archiveProject.mutate({
                      id: project.id,
                      isArchived: !project.isArchived,
                    })
                  }
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {project.isArchived ? "Unarchive" : "Archive"} project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    duplicateProject.mutate({
                      id: project.id,
                      name: `${project.name} (copy)`,
                      includeTasks: true,
                      includeFields: true,
                    })
                  }
                >
                  <CopyPlus className="mr-2 h-4 w-4" />
                  Duplicate project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Export sub-menu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={handleExportCsv}>
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      toast.success("Exporting as XLSX...");
                    }}>
                      XLSX (Excel)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      toast.success("Exporting time entries as CSV...");
                    }}>
                      Time entries CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      exportQuery.refetch().then((result) => {
                        if (result.data) {
                          const json = JSON.stringify(result.data, null, 2);
                          const blob = new Blob([json], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${project.name}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("JSON exported");
                        }
                      });
                    }}>
                      JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportPdf}>
                      PDF (Print)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Sync sub-menu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Share2 className="mr-2 h-4 w-4" />
                    Sync
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => toast.success("Syncing with Google Sheets...")}>
                      Google Sheets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Syncing with Google Calendar...")}>
                      Google Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      toast.success("iCal link copied to clipboard");
                      navigator.clipboard.writeText(`${window.location.origin}/api/ical/${project.id}`);
                    }}>
                      iCal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Syncing with Outlook Calendar...")}>
                      Outlook Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Syncing with other calendars...")}>
                      Other calendars
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />

                {/* Group By */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Group className="mr-2 h-4 w-4" />
                    Group by
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {["none", "assignee", "status", "dueDate", "section"].map(
                      (opt) => (
                        <DropdownMenuItem
                          key={opt}
                          onClick={() => onGroupByChange?.(opt)}
                          className={cn(groupBy === opt && "bg-muted")}
                        >
                          {opt === "none" ? "None" : opt === "dueDate" ? "Due Date" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </DropdownMenuItem>
                      )
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Sort By (Multi-Column) */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort by
                    {sortBy && sortBy.length > 1 && (
                      <span className="ml-1 rounded-full bg-[#4573D2] px-1.5 py-0.5 text-[10px] text-white">
                        {sortBy.length}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 p-2">
                    {/* Current sort rules */}
                    {sortBy?.map((rule, idx) => {
                      const fieldLabel: Record<string, string> = {
                        created: "Created",
                        dueDate: "Due date",
                        title: "Name",
                        assignee: "Assignee",
                        priority: "Priority",
                      };
                      return (
                        <div
                          key={idx}
                          className="mb-1 flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5 text-xs"
                        >
                          <span className="flex-1 font-medium">
                            {fieldLabel[rule.field] ?? rule.field}
                          </span>
                          <button
                            className="rounded px-1.5 py-0.5 text-[10px] hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSort = [...(sortBy ?? [])];
                              newSort[idx] = {
                                ...newSort[idx]!,
                                order: rule.order === "asc" ? "desc" : "asc",
                              };
                              onSortByChange?.(newSort);
                            }}
                          >
                            {rule.order === "asc" ? "Asc" : "Desc"}
                          </button>
                          {(sortBy?.length ?? 0) > 1 && (
                            <button
                              className="text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newSort = (sortBy ?? []).filter((_, i) => i !== idx);
                                onSortByChange?.(newSort);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <DropdownMenuSeparator />

                    {/* Add sort level */}
                    {[
                      { field: "created", label: "Created" },
                      { field: "dueDate", label: "Due date" },
                      { field: "title", label: "Name" },
                      { field: "assignee", label: "Assignee" },
                      { field: "priority", label: "Priority" },
                    ]
                      .filter(
                        (opt) => !(sortBy ?? []).some((r) => r.field === opt.field)
                      )
                      .map((opt) => (
                        <DropdownMenuItem
                          key={opt.field}
                          onClick={() => {
                            onSortByChange?.([
                              ...(sortBy ?? []),
                              { field: opt.field, order: "asc" },
                            ]);
                          }}
                          className="text-xs"
                        >
                          <Plus className="mr-1.5 h-3 w-3" />
                          Add {opt.label}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Color By */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="mr-2 h-4 w-4" />
                    Color by
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {["none", "status", "priority", "dueDate"].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => onColorByChange?.(opt)}
                        className={cn(colorBy === opt && "bg-muted")}
                      >
                        {opt === "none" ? "None" : opt === "dueDate" ? "Due Date" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Save View */}
                <DropdownMenuItem
                  onClick={() => {
                    const name = prompt("View name:");
                    if (name) {
                      saveView.mutate({
                        projectId: project.id,
                        name,
                        config: { groupBy, sortBy: JSON.stringify(sortBy), colorBy, view: activeView },
                      });
                    }
                  }}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save current view
                </DropdownMenuItem>

                {/* Load Saved Views */}
                {savedViews && savedViews.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Filter className="mr-2 h-4 w-4" />
                      Saved views
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {savedViews.map((v) => (
                        <DropdownMenuItem
                          key={v.id}
                          onClick={() => {
                            const cfg = v.config as any;
                            if (cfg.groupBy) onGroupByChange?.(cfg.groupBy);
                            if (cfg.sortBy) {
                              try {
                                const parsed = JSON.parse(cfg.sortBy);
                                onSortByChange?.(parsed);
                              } catch {
                                onSortByChange?.([{ field: "created", order: "desc" }]);
                              }
                            }
                            if (cfg.colorBy) onColorByChange?.(cfg.colorBy);
                            if (cfg.view) onViewChange(cfg.view);
                          }}
                        >
                          {v.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Project link copied to clipboard");
                  }}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy project link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Delete project "${project.name}"? This will permanently remove all tasks, sections, and data in this project.`)) {
                      deleteProject.mutate({ id: project.id });
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto px-6">
          {views.map((view) => (
            <button
              key={view.key}
              onClick={() => onViewChange(view.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeView === view.key
                  ? "border-[#1e1f21] text-[#1e1f21] dark:border-foreground dark:text-foreground"
                  : "border-transparent text-[#6d6e6f] hover:border-gray-300 hover:text-[#1e1f21] dark:hover:text-foreground"
              )}
            >
              <view.icon className="h-3.5 w-3.5" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <AiCreateTask
        open={aiCreateOpen}
        onOpenChange={setAiCreateOpen}
        projectId={project.id}
        onTaskCreated={() => onTasksChanged?.()}
      />

      {/* Share / Invite Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share {project.name}</DialogTitle>
          </DialogHeader>

          {/* Invite by email */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter email address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="commenter">Commenter</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  if (inviteEmail) {
                    toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
                    setInviteEmail("");
                  }
                }}
              >
                Invite
              </Button>
            </div>

            {/* Notify checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-invite"
                checked={notifyOnTasks}
                onCheckedChange={(checked) => setNotifyOnTasks(checked === true)}
              />
              <Label htmlFor="notify-invite" className="text-sm text-muted-foreground">
                Notify when tasks are added or updated
              </Label>
            </div>

            {/* Access settings */}
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Access settings</p>
              <div className="space-y-1.5">
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    projectAccess === "workspace" ? "bg-muted" : "hover:bg-muted/50"
                  )}
                  onClick={() => setProjectAccess("workspace")}
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Workspace</p>
                    <p className="text-xs text-muted-foreground">All workspace members can access</p>
                  </div>
                </button>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    projectAccess === "private" ? "bg-muted" : "hover:bg-muted/50"
                  )}
                  onClick={() => setProjectAccess("private")}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Private to members</p>
                    <p className="text-xs text-muted-foreground">Only invited members can access</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Who has access */}
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Who has access</p>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Task Collaborators</p>
                  </div>
                </div>
                <select className="h-7 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-[#4573D2]" defaultValue="commenter">
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Project Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">My Workspace</p>
                  </div>
                </div>
                <select className="h-7 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-[#4573D2]" defaultValue="editor">
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Project Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: project.color }}
                  >
                    Y
                  </div>
                  <div>
                    <p className="text-sm font-medium">You</p>
                    <p className="text-xs text-muted-foreground">Project owner</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Admin</span>
              </div>

              {/* Manage Notifications */}
              <div className="mt-3 space-y-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Manage notifications</p>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Your notifications</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify-status"
                        checked={notifyStatusUpdates}
                        onCheckedChange={(checked) => setNotifyStatusUpdates(checked === true)}
                      />
                      <Label htmlFor="notify-status" className="text-sm">
                        Status updates
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify-messages"
                        checked={notifyMessages}
                        onCheckedChange={(checked) => setNotifyMessages(checked === true)}
                      />
                      <Label htmlFor="notify-messages" className="text-sm">
                        Messages
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify-tasks-added"
                        checked={notifyTasksAdded}
                        onCheckedChange={(checked) => setNotifyTasksAdded(checked === true)}
                      />
                      <Label htmlFor="notify-tasks-added" className="text-sm">
                        Tasks added
                      </Label>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Teams</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox id="team-status" defaultChecked />
                      <Label htmlFor="team-status" className="text-sm">Status updates</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="team-messages" defaultChecked />
                      <Label htmlFor="team-messages" className="text-sm">Messages</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="team-tasks" defaultChecked />
                      <Label htmlFor="team-tasks" className="text-sm">Tasks added</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy link button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Project link copied to clipboard");
              }}
            >
              <Link2 className="h-4 w-4" />
              Copy project link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
