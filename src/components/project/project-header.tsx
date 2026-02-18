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
  Check,
  FileSpreadsheet,
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const PROJECT_COLORS = [
  "#4573D2", "#7C3AED", "#DB2777", "#DC2626",
  "#EA580C", "#D97706", "#65A30D", "#059669",
  "#0891B2", "#6366F1", "#9333EA", "#E11D48",
  "#78716C", "#475569", "#1E1F21", "#6D6E6F",
];

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

  // New dialog states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState(project.name);
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsColor, setSettingsColor] = useState(project.color);
  const [settingsDefaultView, setSettingsDefaultView] = useState<"LIST" | "BOARD" | "TIMELINE" | "CALENDAR">("LIST");

  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permCommentAccess, setPermCommentAccess] = useState<"members" | "team">("members");
  const [permEditAccess, setPermEditAccess] = useState<"members" | "admin">("members");

  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState(`${project.name} Template`);
  const [templateIncludeTasks, setTemplateIncludeTasks] = useState(true);
  const [templateIncludeFields, setTemplateIncludeFields] = useState(true);

  // Share dialog tab state
  const [shareTab, setShareTab] = useState<"invite" | "notifications">("invite");

  // Collaborator role states
  const [collaboratorRole, setCollaboratorRole] = useState("commenter");
  const [workspaceRole, setWorkspaceRole] = useState("editor");

  // Team notification states
  const [teamStatusUpdates, setTeamStatusUpdates] = useState(true);
  const [teamMessages, setTeamMessages] = useState(true);
  const [teamTasksAdded, setTeamTasksAdded] = useState(true);

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

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("Project settings updated");
      setSettingsOpen(false);
    },
    onError: () => toast.error("Failed to update project settings"),
  });

  const addMember = trpc.projects.addMember.useMutation({
    onSuccess: () => {
      utils.projects.getMembers.invalidate({ projectId: project.id });
      toast.success("Member added to project");
    },
    onError: () => toast.error("Failed to add member"),
  });

  const findOrInvite = trpc.workspaces.findOrInviteByEmail.useMutation();

  const handleProjectInvite = async () => {
    if (!inviteEmail || !workspaceId) return;
    const foundUser = members?.find(
      (m) => m.user.email?.toLowerCase() === inviteEmail.toLowerCase()
    );
    if (foundUser) {
      addMember.mutate({
        projectId: project.id,
        userId: foundUser.user.id,
        permission: inviteRole.toUpperCase() as "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER",
      });
    } else {
      try {
        const result = await findOrInvite.mutateAsync({ workspaceId, email: inviteEmail.trim() });
        if (result.emailSent) {
          toast.success(`Invite email sent to ${inviteEmail}. They'll have access once they join.`);
        } else if (result.userId) {
          addMember.mutate({
            projectId: project.id,
            userId: result.userId,
            permission: inviteRole.toUpperCase() as "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER",
          });
          utils.workspaces.getMembers.invalidate();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to invite user");
      }
    }
    setInviteEmail("");
  };

  // Query actual project members
  const { data: projectMembers } = trpc.projects.getMembers.useQuery({ projectId: project.id });

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const { data: members } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  // Portfolios list for "Add to portfolio" dialog
  const { data: portfolios } = trpc.portfolios.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const addToPortfolio = trpc.portfolios.addProject.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      if (selectedPortfolioId) {
        utils.portfolios.get.invalidate({ id: selectedPortfolioId });
      }
      toast.success("Project added to portfolio");
      setPortfolioOpen(false);
      setSelectedPortfolioId("");
    },
    onError: () => toast.error("Failed to add project to portfolio"),
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

  const handleExportXlsx = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    // Build CSV content with Excel-compatible formatting
    const tasks = result.data;
    const headers = ["Task", "Assignee", "Status", "Due Date", "Section", "Priority", "Description"];
    const rows = tasks.map((t: any) => [
      t.title,
      t.assignee?.name ?? "",
      t.status === "COMPLETE" ? "Complete" : "Incomplete",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
      t.taskProjects?.[0]?.section?.name ?? "",
      t.priority ?? "",
      t.description ?? "",
    ]);
    const csvContent = [headers, ...rows].map(row =>
      row.map((cell: string) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    // Add BOM for Excel compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XLSX exported");
  };

  const handleExportJson = async () => {
    const result = await exportQuery.refetch();
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

  // ── Sync: Generate iCal (.ics) content from tasks ──────────────
  const generateIcsContent = (tasks: any[]) => {
    const now = new Date();
    const formatIcsDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };
    const escapeIcs = (s: string) => s.replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, "\\n");

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TaskFlow//Project Tasks//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs(project.name)}`,
    ];

    tasks.forEach((task: any) => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const startDate = new Date(dueDate);
        startDate.setHours(9, 0, 0, 0);
        const endDate = new Date(dueDate);
        endDate.setHours(10, 0, 0, 0);

        ics.push(
          "BEGIN:VEVENT",
          `UID:${task.id || Math.random().toString(36).slice(2)}@taskflow`,
          `DTSTAMP:${formatIcsDate(now)}`,
          `DTSTART:${formatIcsDate(startDate)}`,
          `DTEND:${formatIcsDate(endDate)}`,
          `SUMMARY:${escapeIcs(task.title)}`,
          `DESCRIPTION:${escapeIcs(
            [
              task.status === "COMPLETE" ? "Status: Complete" : "Status: Incomplete",
              task.assignee?.name ? `Assignee: ${task.assignee.name}` : "",
              task.taskProjects?.[0]?.section?.name ? `Section: ${task.taskProjects[0].section.name}` : "",
            ].filter(Boolean).join("\\n")
          )}`,
          `STATUS:${task.status === "COMPLETE" ? "COMPLETED" : "NEEDS-ACTION"}`,
          "END:VEVENT"
        );
      }
    });

    ics.push("END:VCALENDAR");
    return ics.join("\r\n");
  };

  // ── Sync: Google Sheets ──────────────────────────────────────────
  const handleSyncGoogleSheets = async () => {
    const result = await exportQuery.refetch();
    if (!result.data || result.data.length === 0) {
      toast.error("No tasks to sync");
      return;
    }
    // Export as CSV first
    const tasks = result.data;
    const headers = ["Task", "Assignee", "Status", "Due Date", "Section", "Priority", "Description"];
    const rows = tasks.map((t: any) => [
      t.title,
      t.assignee?.name ?? "",
      t.status === "COMPLETE" ? "Complete" : "Incomplete",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
      t.taskProjects?.[0]?.section?.name ?? "",
      t.priority ?? "",
      (t.description ?? "").replace(/\n/g, " ").slice(0, 200),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell: string) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Open Google Sheets import page
    toast.success("CSV downloaded! Opening Google Sheets...");
    setTimeout(() => {
      window.open("https://sheets.google.com/create", "_blank");
    }, 500);
    toast.info('In Google Sheets: File → Import → Upload the downloaded CSV', { duration: 6000 });
  };

  // ── Sync: Google Calendar ────────────────────────────────────────
  const handleSyncGoogleCalendar = async () => {
    const result = await exportQuery.refetch();
    if (!result.data || result.data.length === 0) {
      toast.error("No tasks to sync");
      return;
    }
    const tasksWithDates = result.data.filter((t: any) => t.dueDate);
    if (tasksWithDates.length === 0) {
      toast.error("No tasks with due dates to sync to calendar");
      return;
    }
    // Download .ics file
    const icsContent = generateIcsContent(tasksWithDates);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.ics`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Calendar file downloaded with ${tasksWithDates.length} events! Opening Google Calendar...`);
    setTimeout(() => {
      window.open("https://calendar.google.com/calendar/r/settings/export", "_blank");
    }, 500);
    toast.info('In Google Calendar: Import the downloaded .ics file', { duration: 6000 });
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
              onClick={() => setShareOpen(true)}
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
                <DropdownMenuItem onClick={() => {
                  setSettingsName(project.name);
                  setSettingsColor(project.color);
                  setSettingsOpen(true);
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit project settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPermissionsOpen(true)}>
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
                    <DropdownMenuItem onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "*/*";
                      input.onchange = () => {
                        if (input.files?.[0]) {
                          toast.success(`Importing "${input.files[0].name}"...`);
                        }
                      };
                      input.click();
                    }}>
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      Any file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      navigator.clipboard.writeText(`import+${project.id}@tasks.example.com`);
                      toast.success("Email forwarding address copied to clipboard");
                    }}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".csv";
                      input.onchange = () => {
                        if (input.files?.[0]) {
                          toast.success(`Importing CSV "${input.files[0].name}"...`);
                        }
                      };
                      input.click();
                    }}>
                      <FileUp className="mr-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => {
                  setTemplateName(`${project.name} Template`);
                  setTemplateOpen(true);
                }}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save as template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPortfolioOpen(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add to portfolio
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* Archive, duplicate */}
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

                {/* Export sub-menu with Sync options */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    <DropdownMenuItem onClick={handleExportCsv}>
                      <FileUp className="mr-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportXlsx}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      XLSX (Excel)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportJson}>
                      <FileText className="mr-2 h-4 w-4" />
                      JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <Printer className="mr-2 h-4 w-4" />
                      PDF (Print)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sync</p>
                    <DropdownMenuItem onClick={handleSyncGoogleSheets}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Google Sheets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSyncGoogleCalendar}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Google Calendar
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
                    const url = window.location.href;
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(url);
                    } else {
                      const ta = document.createElement("textarea");
                      ta.value = url;
                      ta.style.position = "fixed";
                      ta.style.left = "-9999px";
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                    }
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

      {/* ========== Edit Project Settings Dialog ========== */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>Edit project name, description, color, and default view.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Project name</Label>
              <Input
                id="settings-name"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                value={settingsDescription}
                onChange={(e) => setSettingsDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Project color</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                      settingsColor === color ? "ring-2 ring-offset-2 ring-[#4573D2]" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSettingsColor(color)}
                  >
                    {settingsColor === color && (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default view</Label>
              <Select value={settingsDefaultView} onValueChange={(v) => setSettingsDefaultView(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIST">List</SelectItem>
                  <SelectItem value="BOARD">Board</SelectItem>
                  <SelectItem value="TIMELINE">Timeline</SelectItem>
                  <SelectItem value="CALENDAR">Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateProject.mutate({
                  id: project.id,
                  name: settingsName,
                  description: settingsDescription,
                  color: settingsColor,
                  defaultView: settingsDefaultView,
                });
              }}
              disabled={updateProject.isPending}
            >
              {updateProject.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Manage Permissions Dialog ========== */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Permissions</DialogTitle>
            <DialogDescription>Control who can view and edit this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Project visibility */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project visibility</Label>
              <div className="space-y-1.5">
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors border",
                    projectAccess === "workspace" ? "border-[#4573D2] bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 hover:bg-muted/50"
                  )}
                  onClick={() => setProjectAccess("workspace")}
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Workspace</p>
                    <p className="text-xs text-muted-foreground">All workspace members can find and access</p>
                  </div>
                  {projectAccess === "workspace" && <Check className="h-4 w-4 text-[#4573D2]" />}
                </button>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors border",
                    projectAccess === "private" ? "border-[#4573D2] bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 hover:bg-muted/50"
                  )}
                  onClick={() => setProjectAccess("private")}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Private to members</p>
                    <p className="text-xs text-muted-foreground">Only invited members can find and access</p>
                  </div>
                  {projectAccess === "private" && <Check className="h-4 w-4 text-[#4573D2]" />}
                </button>
              </div>
            </div>

            {/* Commenting permissions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Who can comment</Label>
              <Select value={permCommentAccess} onValueChange={(v) => setPermCommentAccess(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="members">Project members</SelectItem>
                  <SelectItem value="team">Workspace members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Editing permissions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Who can edit tasks</Label>
              <Select value={permEditAccess} onValueChange={(v) => setPermEditAccess(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="members">Editors and above</SelectItem>
                  <SelectItem value="admin">Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permission defaults for new members */}
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Default permissions for new members</p>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Join requests</span>
                <Select defaultValue="editor">
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Project Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Invite links</span>
                <Select defaultValue="commenter">
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Project Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success("Permissions updated");
              setPermissionsOpen(false);
            }}>
              Save permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Add to Portfolio Dialog ========== */}
      <Dialog open={portfolioOpen} onOpenChange={setPortfolioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Portfolio</DialogTitle>
            <DialogDescription>Select a portfolio to add &quot;{project.name}&quot; to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {portfolios && portfolios.length > 0 ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {portfolios.map((p) => (
                  <button
                    key={p.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors border",
                      selectedPortfolioId === p.id
                        ? "border-[#4573D2] bg-blue-50 dark:bg-blue-950/20"
                        : "border-gray-200 hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedPortfolioId(p.id)}
                  >
                    <FolderPlus className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.projects?.length ?? 0} project{(p.projects?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {selectedPortfolioId === p.id && <Check className="h-4 w-4 text-[#4573D2]" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FolderPlus className="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
                <p>No portfolios found.</p>
                <p className="text-xs mt-1">Create a portfolio first to add this project.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortfolioOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedPortfolioId || addToPortfolio.isPending}
              onClick={() => {
                if (selectedPortfolioId) {
                  addToPortfolio.mutate({
                    portfolioId: selectedPortfolioId,
                    projectId: project.id,
                  });
                }
              }}
            >
              {addToPortfolio.isPending ? "Adding..." : "Add to portfolio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Save as Template Dialog ========== */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Create a reusable template from this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include in template</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="template-tasks"
                    checked={templateIncludeTasks}
                    onCheckedChange={(checked) => setTemplateIncludeTasks(checked === true)}
                  />
                  <Label htmlFor="template-tasks" className="text-sm">
                    Tasks and sections
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="template-fields"
                    checked={templateIncludeFields}
                    onCheckedChange={(checked) => setTemplateIncludeFields(checked === true)}
                  />
                  <Label htmlFor="template-fields" className="text-sm">
                    Custom fields
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="template-rules" defaultChecked />
                  <Label htmlFor="template-rules" className="text-sm">
                    Project rules and automations
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="template-forms" defaultChecked />
                  <Label htmlFor="template-forms" className="text-sm">
                    Forms
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              duplicateProject.mutate({
                id: project.id,
                name: templateName,
                includeTasks: templateIncludeTasks,
                includeFields: templateIncludeFields,
              });
              toast.success(`Template "${templateName}" saved`);
              setTemplateOpen(false);
            }}>
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Enhanced Share / Invite Dialog ========== */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Share {project.name}</DialogTitle>
            <DialogDescription>Invite people and manage access to this project.</DialogDescription>
          </DialogHeader>

          {/* Tab navigation */}
          <div className="flex border-b">
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                shareTab === "invite"
                  ? "border-[#4573D2] text-[#4573D2]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setShareTab("invite")}
            >
              Invite
            </button>
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                shareTab === "notifications"
                  ? "border-[#4573D2] text-[#4573D2]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setShareTab("notifications")}
            >
              Notifications
            </button>
          </div>

          {shareTab === "invite" ? (
            <div className="space-y-4">
              {/* Invite by email */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter email address"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inviteEmail) {
                      handleProjectInvite();
                    }
                  }}
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-[130px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Project Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleProjectInvite()}
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
                  Notify when tasks are added to the project
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
                    <div className="text-left flex-1">
                      <p className="font-medium">Workspace</p>
                      <p className="text-xs text-muted-foreground">All workspace members can access</p>
                    </div>
                    {projectAccess === "workspace" && <Check className="h-4 w-4 text-[#4573D2]" />}
                  </button>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      projectAccess === "private" ? "bg-muted" : "hover:bg-muted/50"
                    )}
                    onClick={() => setProjectAccess("private")}
                  >
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left flex-1">
                      <p className="font-medium">Private to members</p>
                      <p className="text-xs text-muted-foreground">Only invited members can access</p>
                    </div>
                    {projectAccess === "private" && <Check className="h-4 w-4 text-[#4573D2]" />}
                  </button>
                </div>
              </div>

              {/* Who has access */}
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Who has access</p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {/* Project owner (you) */}
                  <div className="flex items-center justify-between py-1.5">
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
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </span>
                  </div>
                  {/* Workspace row */}
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">My Workspace</p>
                        <p className="text-xs text-muted-foreground">All members of the workspace</p>
                      </div>
                    </div>
                    <Select value={workspaceRole} onValueChange={setWorkspaceRole}>
                      <SelectTrigger className="w-[130px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Project Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="commenter">Commenter</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Actual project members from DB */}
                  {projectMembers?.map((pm) => {
                    const user = members?.find((m) => m.user.id === pm.userId)?.user;
                    if (!user) return null;
                    const permLabel: Record<string, string> = {
                      ADMIN: "Admin",
                      EDITOR: "Editor",
                      COMMENTER: "Commenter",
                      VIEWER: "Viewer",
                    };
                    return (
                      <div key={pm.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-medium text-white">
                            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name || user.email}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{permLabel[pm.permission] || pm.permission}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Copy link button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(url);
                  } else {
                    const ta = document.createElement("textarea");
                    ta.value = url;
                    ta.style.position = "fixed";
                    ta.style.left = "-9999px";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                  }
                  toast.success("Project link copied to clipboard");
                }}
              >
                <Link2 className="h-4 w-4" />
                Copy project link
              </Button>
            </div>
          ) : (
            /* Notifications tab */
            <div className="space-y-4">
              {/* Your notifications */}
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Your notifications</p>
                <p className="text-xs text-muted-foreground">
                  Choose which notifications you receive for this project.
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify-status-tab"
                        checked={notifyStatusUpdates}
                        onCheckedChange={(checked) => setNotifyStatusUpdates(checked === true)}
                      />
                      <Label htmlFor="notify-status-tab" className="text-sm">
                        Status updates
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">When project status changes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify-messages-tab"
                        checked={notifyMessages}
                        onCheckedChange={(checked) => setNotifyMessages(checked === true)}
                      />
                      <Label htmlFor="notify-messages-tab" className="text-sm">
                        Messages
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">New messages posted</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify-tasks-added-tab"
                        checked={notifyTasksAdded}
                        onCheckedChange={(checked) => setNotifyTasksAdded(checked === true)}
                      />
                      <Label htmlFor="notify-tasks-added-tab" className="text-sm">
                        Tasks added
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">New tasks created</span>
                  </div>
                </div>
              </div>

              {/* Team notifications */}
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Teams</p>
                <p className="text-xs text-muted-foreground">
                  Notifications for all team members in this project.
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="team-status-tab"
                        checked={teamStatusUpdates}
                        onCheckedChange={(checked) => setTeamStatusUpdates(checked === true)}
                      />
                      <Label htmlFor="team-status-tab" className="text-sm">Status updates</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">Team-wide updates</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="team-messages-tab"
                        checked={teamMessages}
                        onCheckedChange={(checked) => setTeamMessages(checked === true)}
                      />
                      <Label htmlFor="team-messages-tab" className="text-sm">Messages</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">Team conversations</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="team-tasks-tab"
                        checked={teamTasksAdded}
                        onCheckedChange={(checked) => setTeamTasksAdded(checked === true)}
                      />
                      <Label htmlFor="team-tasks-tab" className="text-sm">Tasks added</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">New tasks from team</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  toast.success("Notification preferences saved");
                  setShareTab("invite");
                }}
              >
                Save notification preferences
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
