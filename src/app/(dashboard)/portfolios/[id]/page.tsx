"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  ChevronDown,
  List,
  GanttChart,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Target,
  Globe,
  Lock,
  Link as LinkIcon,
  Copy,
  UserPlus,
  X,
  Mail,
  Pin,
  Search,
  Archive,
  FolderOpen,
} from "lucide-react";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ON_TRACK: "#7BC86C",
  AT_RISK: "#FD9A00",
  OFF_TRACK: "#E8384F",
  ON_HOLD: "#6D6E6F",
  COMPLETE: "#4573D2",
  DROPPED: "#9B9B9B",
};

const STATUS_LABELS: Record<string, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  OFF_TRACK: "Off Track",
  ON_HOLD: "On Hold",
  COMPLETE: "Completed",
  DROPPED: "Dropped",
};

const ALL_STATUSES = ["ON_HOLD", "AT_RISK", "ON_TRACK", "OFF_TRACK", "COMPLETE", "DROPPED"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type PortfolioTab = "list" | "timeline" | "dashboard" | "progress" | "workload" | "messages";

// ── Status Dropdown Component ────────────────────────────────────────────────

function ProjectStatusDropdown({
  projectId,
  currentStatus,
  onStatusChange,
}: {
  projectId: string;
  currentStatus: string | null;
  onStatusChange: (projectId: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white transition-opacity hover:opacity-80"
          style={{
            backgroundColor: currentStatus
              ? STATUS_COLORS[currentStatus] || "#6D6E6F"
              : "#D1D1D1",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {currentStatus ? STATUS_LABELS[currentStatus] || currentStatus : "Set status"}
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-40" onClick={(e) => e.stopPropagation()}>
        {ALL_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            className="flex items-center gap-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(projectId, status);
              setOpen(false);
            }}
          >
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <span>{STATUS_LABELS[status]}</span>
            {currentStatus === status && (
              <CheckCircle2 className="ml-auto h-3 w-3 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const portfolioId = params.id as string;

  const { data: portfolio, isLoading } = trpc.portfolios.get.useQuery({ id: portfolioId });
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;
  const { data: allProjects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  const { data: workspaceMembers } = trpc.workspaces.getMembers.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  const { data: workspaceGoals } = trpc.goals.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  const { data: portfolioMembers, refetch: refetchMembers } = trpc.portfolios.getMembers.useQuery(
    { portfolioId },
  );
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<PortfolioTab>("list");
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionLoaded, setDescriptionLoaded] = useState(false);

  // Share dialog state
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer" | "admin">("editor");
  const [accessSetting, setAccessSetting] = useState<"workspace" | "private">("workspace");

  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [goalSearch, setGoalSearch] = useState("");

  // Members section state
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);

  // Local status overrides for projects (keyed by projectId)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  // Priority map for per-project priority (local state)
  const [priorityMap, setPriorityMap] = useState<Record<string, string>>({});

  // Inline "Add work" row state
  const [inlineAddSearch, setInlineAddSearch] = useState("");
  const [inlineDropdownOpen, setInlineDropdownOpen] = useState(false);

  // Project detail side panel
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // "Give access to portfolio members?" dialog
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  const addProject = trpc.portfolios.addProject.useMutation({
    onSuccess: () => {
      utils.portfolios.get.invalidate({ id: portfolioId });
      setAddProjectOpen(false);
      setProjectSearch("");
      toast.success("Project added to portfolio");
    },
  });

  const removeProject = trpc.portfolios.removeProject.useMutation({
    onSuccess: () => {
      utils.portfolios.get.invalidate({ id: portfolioId });
      toast.success("Project removed from portfolio");
    },
  });

  const updatePortfolio = trpc.portfolios.update.useMutation({
    onSuccess: () => {
      utils.portfolios.get.invalidate({ id: portfolioId });
      toast.success("Portfolio updated");
    },
  });

  // Silent auto-save mutation (no toast) for debounced saves
  const autoSaveDescription = trpc.portfolios.update.useMutation({
    onSuccess: () => utils.portfolios.get.invalidate({ id: portfolioId }),
  });

  // Initialize description from portfolio data
  if (portfolio && !descriptionLoaded) {
    setDescription(portfolio.description ?? "");
    setDescriptionLoaded(true);
  }

  // Debounced auto-save for description
  useEffect(() => {
    if (!descriptionLoaded || !portfolio) return;
    if (description === (portfolio.description ?? "")) return;
    const timer = setTimeout(() => {
      autoSaveDescription.mutate({ id: portfolioId, description });
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, descriptionLoaded]);

  // Portfolio goals (DB-backed)
  const { data: portfolioGoals } = trpc.portfolios.getGoals.useQuery({ portfolioId });
  const connectGoal = trpc.portfolios.connectGoal.useMutation({
    onSuccess: () => {
      utils.portfolios.getGoals.invalidate({ portfolioId });
      toast.success("Goal connected to portfolio");
    },
    onError: (err) => toast.error(err.message || "Failed to connect goal"),
  });
  const disconnectGoal = trpc.portfolios.disconnectGoal.useMutation({
    onSuccess: () => {
      utils.portfolios.getGoals.invalidate({ portfolioId });
      toast.success("Goal disconnected");
    },
  });

  const connectedGoalIds = new Set((portfolioGoals || []).map((pg) => pg.goalId));
  const connectedGoals = (portfolioGoals || []).map((pg) => pg.goal);

  const addMember = trpc.portfolios.addMember.useMutation({
    onSuccess: () => {
      utils.portfolios.getMembers.invalidate({ portfolioId });
      utils.portfolios.get.invalidate({ id: portfolioId });
      toast.success("Member added to portfolio");
    },
    onError: (err) => {
      if (err.message?.includes("Unique constraint") || err.data?.code === "CONFLICT") {
        toast.error("This member has already been added to the portfolio");
      } else {
        toast.error(err.message || "Failed to add member");
      }
    },
  });

  const removeMember = trpc.portfolios.removeMember.useMutation({
    onSuccess: () => {
      utils.portfolios.getMembers.invalidate({ portfolioId });
      utils.portfolios.get.invalidate({ id: portfolioId });
      toast.success("Member removed from portfolio");
    },
  });

  const deletePortfolio = trpc.portfolios.delete.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      toast.success("Portfolio deleted");
      router.push("/portfolios");
    },
  });

  const createStatusUpdate = trpc.projects.createStatusUpdate.useMutation({
    onSuccess: () => {
      utils.portfolios.get.invalidate({ id: portfolioId });
    },
  });

  const archiveProject = trpc.projects.archive.useMutation({
    onSuccess: () => {
      utils.portfolios.get.invalidate({ id: portfolioId });
      toast.success("Project archived");
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.portfolios.get.invalidate({ id: portfolioId });
      toast.success("Project deleted");
    },
  });

  // Handler for inline add with access dialog
  const handleInlineAddProject = (projectId: string) => {
    setPendingProjectId(projectId);
    setAccessDialogOpen(true);
    setInlineAddSearch("");
    setInlineDropdownOpen(false);
  };

  const confirmAddProject = (giveAccess: boolean) => {
    if (pendingProjectId) {
      addProject.mutate({ portfolioId, projectId: pendingProjectId });
    }
    setAccessDialogOpen(false);
    setPendingProjectId(null);
  };

  // Handlers
  const handleStatusChange = (projectId: string, status: string) => {
    setStatusOverrides((prev) => ({ ...prev, [projectId]: status }));
    createStatusUpdate.mutate({
      projectId,
      status: status as "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "ON_HOLD" | "COMPLETE" | "DROPPED",
      title: `Status changed to ${STATUS_LABELS[status]}`,
      body: "",
    });
    toast.success(`Status updated to ${STATUS_LABELS[status]}`);
  };

  const handleAddGoal = (goalId: string) => {
    connectGoal.mutate({ portfolioId, goalId });
    setAddGoalOpen(false);
    setGoalSearch("");
  };

  const handleRemoveGoal = (goalId: string) => {
    disconnectGoal.mutate({ portfolioId, goalId });
  };

  const findOrInvite = trpc.workspaces.findOrInviteByEmail.useMutation();

  const handleShareInvite = async () => {
    if (!shareEmail.trim() || !workspaceId) return;
    const found = workspaceMembers?.find(
      (m) => m.user.email.toLowerCase() === shareEmail.trim().toLowerCase()
    );
    if (found) {
      const permMap: Record<string, "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER"> = {
        admin: "ADMIN", editor: "EDITOR", commenter: "COMMENTER", viewer: "VIEWER",
      };
      addMember.mutate({
        portfolioId,
        userId: found.user.id,
        permission: permMap[shareRole] || "EDITOR",
      });
    } else {
      try {
        const result = await findOrInvite.mutateAsync({ workspaceId, email: shareEmail.trim() });
        if (result.emailSent) {
          toast.success(`Invite email sent to ${shareEmail}. They'll have access once they join.`);
        } else if (result.userId) {
          const permMap: Record<string, "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER"> = {
            admin: "ADMIN", editor: "EDITOR", commenter: "COMMENTER", viewer: "VIEWER",
          };
          addMember.mutate({ portfolioId, userId: result.userId, permission: permMap[shareRole] || "EDITOR" });
          utils.workspaces.getMembers.invalidate();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to invite user");
      }
    }
    setShareEmail("");
  };

  const handleRemoveShareMember = (userId: string) => {
    removeMember.mutate({ portfolioId, userId });
  };

  const handleAddMemberByEmail = async () => {
    if (!memberEmail.trim() || !workspaceId) return;
    const found = workspaceMembers?.find(
      (m) => m.user.email.toLowerCase() === memberEmail.trim().toLowerCase()
    );
    if (found) {
      addMember.mutate({ portfolioId, userId: found.user.id, permission: "EDITOR" });
    } else {
      try {
        const result = await findOrInvite.mutateAsync({ workspaceId, email: memberEmail.trim() });
        if (result.emailSent) {
          toast.success(`Invite email sent to ${memberEmail}. They'll have access once they join.`);
        } else if (result.userId) {
          addMember.mutate({ portfolioId, userId: result.userId, permission: "EDITOR" });
          utils.workspaces.getMembers.invalidate();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to invite user");
      }
    }
    setMemberEmail("");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Portfolio not found</p>
      </div>
    );
  }

  const portfolioProjects = portfolio.projects?.map((pp: any) => pp.project) || [];
  const existingProjectIds = new Set(portfolioProjects.map((p: any) => p.id));

  const availableProjects =
    allProjects
      ?.filter((p) => !existingProjectIds.has(p.id))
      .filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase())) || [];

  // Compute stats
  const totalTasks = portfolioProjects.reduce(
    (sum: number, p: any) => sum + (p._count?.taskProjects || 0),
    0
  );
  const getProjectStatus = (project: any) => {
    if (statusOverrides[project.id]) return statusOverrides[project.id];
    return project.statusUpdates?.[0]?.status || null;
  };
  const atRiskCount = portfolioProjects.filter(
    (p: any) => getProjectStatus(p) === "AT_RISK"
  ).length;
  const offTrackCount = portfolioProjects.filter(
    (p: any) => getProjectStatus(p) === "OFF_TRACK"
  ).length;

  const tabs: { key: PortfolioTab; label: string; icon: React.ElementType }[] = [
    { key: "list", label: "List", icon: List },
    { key: "timeline", label: "Timeline", icon: GanttChart },
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "progress", label: "Progress", icon: TrendingUp },
    { key: "workload", label: "Workload", icon: Users },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex h-14 items-center gap-3 border-b bg-white dark:bg-card px-6">
        <Link href="/portfolios" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/portfolios" className="hover:text-foreground">
            Portfolios
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="max-w-[300px] truncate font-medium text-foreground">
            {portfolio.name}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShareOpen(true)}
          >
            <Users className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
            onClick={() => setAddProjectOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add project
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Portfolio link copied");
                }}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete portfolio "${portfolio.name}"?`)) {
                    deletePortfolio.mutate({ id: portfolioId });
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete portfolio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b bg-white dark:bg-card px-6 py-1">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-xs",
              activeTab === tab.key
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Description */}
      <div className="px-6 pt-4">
        <textarea
          className="w-full resize-none rounded border-none bg-transparent p-0 text-sm text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
          placeholder="Add a description for this portfolio..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== (portfolio.description ?? "")) {
              updatePortfolio.mutate({ id: portfolioId, description });
            }
          }}
          rows={2}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
        {activeTab === "list" && (
          <div>
            {/* Inline "Add work" row */}
            <div className="relative mb-3">
              <div className="flex items-center gap-2 rounded-lg border bg-white dark:bg-card px-4 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="flex-1 border-none bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                  placeholder="Add a project or portfolio by name"
                  value={inlineAddSearch}
                  onChange={(e) => {
                    setInlineAddSearch(e.target.value);
                    setInlineDropdownOpen(e.target.value.length > 0);
                  }}
                  onFocus={() => {
                    if (inlineAddSearch.length > 0) setInlineDropdownOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setInlineDropdownOpen(false), 200)}
                />
              </div>
              {inlineDropdownOpen && inlineAddSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border bg-white dark:bg-card shadow-lg">
                  {(allProjects || [])
                    .filter((p) => !existingProjectIds.has(p.id))
                    .filter((p) => p.name.toLowerCase().includes(inlineAddSearch.toLowerCase()))
                    .map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleInlineAddProject(p.id);
                        }}
                      >
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </button>
                    ))}
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#4573D2] hover:bg-muted/50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setInlineDropdownOpen(false);
                      setInlineAddSearch("");
                      toast.info("Create new project from the Projects page");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Create new project
                  </button>
                </div>
              )}
            </div>

            {portfolioProjects.length > 0 ? (
              <div className="rounded-lg border">
                {/* Table Header */}
                <div className="flex items-center gap-3 border-b bg-gray-50 dark:bg-muted px-5 py-2.5 text-xs font-medium text-[#6d6e6f] dark:text-muted-foreground">
                  <div className="flex-1">Project name</div>
                  <div className="w-28 text-center">Status</div>
                  <div className="w-32 text-center">Task progress</div>
                  <div className="w-24 text-center">Due date</div>
                  <div className="w-24 text-center">Priority</div>
                  <div className="w-28 text-center">Owner</div>
                  <div className="w-8" />
                </div>
                {portfolioProjects.map((project: any) => {
                  const currentStatus = getProjectStatus(project);
                  const taskTotal = project._count?.taskProjects || 0;
                  // Estimate completed as a fraction based on status
                  const statusFraction = currentStatus === "COMPLETE" ? 1 : currentStatus === "ON_TRACK" ? 0.5 : currentStatus === "AT_RISK" ? 0.3 : 0.1;
                  const taskCompleted = Math.round(taskTotal * statusFraction);
                  const progressPct = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;
                  const priority = priorityMap[project.id] || "";
                  const ownerName = project.createdBy?.name || "Unknown";
                  const ownerInitial = ownerName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={project.id}
                      className="group flex items-center gap-3 border-b px-5 py-3 transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      <button
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm font-medium text-foreground hover:text-[#4573D2]">
                          {project.name}
                        </span>
                      </button>
                      <div className="flex w-28 justify-center">
                        <ProjectStatusDropdown
                          projectId={project.id}
                          currentStatus={currentStatus}
                          onStatusChange={handleStatusChange}
                        />
                      </div>
                      <div className="flex w-32 items-center justify-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-[#4573D2] transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{taskCompleted}/{taskTotal}</span>
                      </div>
                      <div className="w-24 text-center text-xs text-muted-foreground">
                        {project.dueDate
                          ? new Date(project.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "\u2014"}
                      </div>
                      <div className="flex w-24 justify-center">
                        <Select
                          value={priority}
                          onValueChange={(val) => setPriorityMap((prev) => ({ ...prev, [project.id]: val }))}
                        >
                          <SelectTrigger className="h-7 w-20 border-none bg-transparent text-xs shadow-none">
                            <SelectValue placeholder="\u2014" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">
                              <span className="text-red-600">High</span>
                            </SelectItem>
                            <SelectItem value="Medium">
                              <span className="text-yellow-600">Medium</span>
                            </SelectItem>
                            <SelectItem value="Low">
                              <span className="text-green-600">Low</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex w-28 items-center justify-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4573D2] text-[9px] font-medium text-white">
                          {ownerInitial}
                        </div>
                        <span className="truncate text-xs text-muted-foreground">{ownerName}</span>
                      </div>
                      <div className="w-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => window.open(`/projects/${project.id}`, "_blank")}>
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Open in new tab
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/projects/${project.id}`);
                              toast.success("Project link copied");
                            }}>
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              Copy project link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() =>
                              removeProject.mutate({ portfolioId, projectId: project.id })
                            }>
                              <X className="mr-2 h-3.5 w-3.5" />
                              Remove from portfolio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => archiveProject.mutate({ id: project.id, isArchived: true })}>
                              <Archive className="mr-2 h-3.5 w-3.5" />
                              Archive project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
                                  deleteProject.mutate({ id: project.id });
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No projects in this portfolio yet
                </p>
                <Button
                  className="mt-3 gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
                  size="sm"
                  onClick={() => setAddProjectOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add project
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f] dark:text-muted-foreground">Timeline</h3>
            {portfolioProjects.length > 0 ? (
              <div className="space-y-3">
                {portfolioProjects.map((project: any) => {
                  const start = project.startDate
                    ? new Date(project.startDate)
                    : null;
                  const end = project.dueDate ? new Date(project.dueDate) : null;
                  return (
                    <div key={project.id} className="flex items-center gap-3">
                      <div className="w-40 truncate text-sm text-foreground">
                        {project.name}
                      </div>
                      <div className="flex-1">
                        <div className="relative h-6 rounded bg-gray-100 dark:bg-muted">
                          <div
                            className="absolute h-6 rounded"
                            style={{
                              backgroundColor: project.color || "#4573D2",
                              left: "5%",
                              width: "60%",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-32 text-xs text-muted-foreground">
                        {start
                          ? start.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "No start"}{" "}
                        -{" "}
                        {end
                          ? end.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "No end"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add projects to see timeline
              </p>
            )}
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {portfolioProjects.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total tasks</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {atRiskCount + offTrackCount}
                  </p>
                  <p className="text-xs text-muted-foreground">At risk / Off track</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f] dark:text-muted-foreground">
              Project Progress
            </h3>
            <div className="space-y-4">
              {portfolioProjects.length > 0 ? (
                portfolioProjects.map((project: any) => {
                  const total = project._count?.taskProjects || 0;
                  const projectStatus = getProjectStatus(project);
                  const statusColor = projectStatus
                    ? STATUS_COLORS[projectStatus] || "#6D6E6F"
                    : "#4573D2";
                  return (
                    <div key={project.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-sm font-medium text-foreground hover:text-[#4573D2]"
                        >
                          {project.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {total} tasks
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-muted">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(total > 0 ? 50 : 0, 100)}%`,
                            backgroundColor: statusColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add projects to see progress
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "workload" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f] dark:text-muted-foreground">Team Workload</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Workload view shows team member capacity across portfolio projects
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign tasks to team members to see workload distribution
              </p>
            </div>
          </div>
        )}

        {activeTab === "messages" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f] dark:text-muted-foreground">Messages</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Send messages to your portfolio team
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep everyone aligned with portfolio-level discussions
              </p>
            </div>
          </div>
        )}
        </div>

        {/* ── Project Detail Side Panel ──────────────────────────────────── */}
        {selectedProjectId && (() => {
          const project = portfolioProjects.find((p: any) => p.id === selectedProjectId);
          if (!project) return null;
          const currentStatus = getProjectStatus(project);
          return (
            <div className="w-[400px] shrink-0 border-l bg-white dark:bg-card overflow-y-auto">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${project.id}?from=portfolio&portfolioId=${portfolioId}&portfolioName=${encodeURIComponent(portfolio.name)}`}
                    className="text-xs text-[#4573D2] hover:underline"
                  >
                    View project
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toast.info("Feedback feature coming soon")}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toast.info("Pinned")}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(`/projects/${project.id}`, "_blank")}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Open in new tab
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/projects/${project.id}`);
                        toast.success("Link copied");
                      }}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copy link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedProjectId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Panel body */}
              <div className="p-4 space-y-5">
                {/* Project name */}
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-sm"
                    style={{ backgroundColor: project.color }}
                  />
                  <h3 className="text-base font-medium text-foreground">{project.name}</h3>
                </div>

                {/* Due date */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Due date</span>
                  <p className="text-sm text-foreground">
                    {project.dueDate
                      ? new Date(project.dueDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No due date set"}
                  </p>
                </div>

                <Separator />

                {/* Status update section */}
                <div className="space-y-3">
                  <span className="text-xs font-medium text-muted-foreground">Share a status update</span>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">Current status:</span>
                      {currentStatus ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: STATUS_COLORS[currentStatus] || "#6D6E6F" }}
                        >
                          {STATUS_LABELS[currentStatus] || currentStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Select onValueChange={(status) => handleStatusChange(project.id, status)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: STATUS_COLORS[status] }}
                                />
                                {STATUS_LABELS[status]}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Connected goals section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Connected goals</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-[10px] text-muted-foreground"
                      onClick={() => setAddGoalOpen(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Add goal
                    </Button>
                  </div>
                  {connectedGoals.length > 0 ? (
                    <div className="space-y-1.5">
                      {connectedGoals.slice(0, 3).map((goal) => (
                        <div key={goal.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                          <Target className="h-3 w-3 text-[#4573D2]" />
                          <span className="flex-1 truncate text-xs text-foreground">{goal.name}</span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                            style={{ backgroundColor: STATUS_COLORS[goal.status] || "#6D6E6F" }}
                          >
                            {STATUS_LABELS[goal.status] || goal.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No goals connected</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Enhanced Share Dialog ────────────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Share portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Invite by email with role */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Add people by name or email..."
                  value={shareEmail}
                  onChange={(e) => {
                    setShareEmail(e.target.value);
                    setShareDropdownOpen(e.target.value.length > 0);
                  }}
                  onFocus={() => {
                    if (shareEmail.length > 0) setShareDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShareDropdownOpen(false);
                      handleShareInvite();
                    }
                    if (e.key === "Escape") setShareDropdownOpen(false);
                  }}
                  className="pl-9"
                />
                {/* Member suggestions dropdown */}
                {shareDropdownOpen && shareEmail.trim().length > 0 && (() => {
                  const existingMemberIds = new Set(portfolioMembers?.map((pm) => pm.userId) || []);
                  const filtered = workspaceMembers?.filter(
                    (m) =>
                      !existingMemberIds.has(m.user.id) &&
                      (m.user.name?.toLowerCase().includes(shareEmail.toLowerCase()) ||
                        m.user.email.toLowerCase().includes(shareEmail.toLowerCase()))
                  );
                  if (!filtered || filtered.length === 0) return null;
                  return (
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-40 overflow-y-auto rounded-md border bg-white shadow-lg dark:bg-card">
                      {filtered.map((m) => (
                        <button
                          key={m.user.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShareEmail(m.user.email);
                            setShareDropdownOpen(false);
                          }}
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4573D2] text-[9px] font-medium text-white">
                            {m.user.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm text-foreground">{m.user.name}</p>
                            <p className="text-[11px] text-muted-foreground">{m.user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <Select
                value={shareRole}
                onValueChange={(val) =>
                  setShareRole(val as "editor" | "viewer" | "admin")
                }
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="admin">Portfolio Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={() => {
                  setShareDropdownOpen(false);
                  handleShareInvite();
                }}
              >
                Invite
              </Button>
            </div>

            <Separator />

            {/* Access settings */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Access settings</p>
              <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {accessSetting === "workspace" ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm">
                      {accessSetting === "workspace"
                        ? "Workspace"
                        : "Private"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {accessSetting === "workspace"
                        ? "Anyone in the workspace can find and access"
                        : "Only people invited can access"}
                    </p>
                  </div>
                </div>
                <Select
                  value={accessSetting}
                  onValueChange={(val) =>
                    setAccessSetting(val as "workspace" | "private")
                  }
                >
                  <SelectTrigger className="h-7 w-28 border-none bg-transparent text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workspace">Workspace</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Who has access */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Who has access</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {/* Portfolio owner */}
                <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-medium text-white">
                    {portfolio?.name?.charAt(0)?.toUpperCase() || "O"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-foreground">You (Owner)</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Owner</span>
                </div>
                {/* Workspace row */}
                <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-muted">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-foreground">Workspace members</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Can view</span>
                </div>
                {/* Real portfolio members from DB */}
                {portfolioMembers?.map((pm) => (
                    <div key={pm.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-medium text-white">
                        {pm.user.name?.charAt(0)?.toUpperCase() || pm.user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-foreground">{pm.user.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{pm.user.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{pm.permission.toLowerCase()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveShareMember(pm.user.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Footer actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Portfolio link copied to clipboard");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy portfolio link
              </Button>
              <Button
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={() => setShareOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Goal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Connect a goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={goalSearch}
              onChange={(e) => setGoalSearch(e.target.value)}
              placeholder="Search goals..."
              autoFocus
            />
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {(workspaceGoals || [])
                .filter((g) => !connectedGoalIds.has(g.id))
                .filter((g) => g.name.toLowerCase().includes(goalSearch.toLowerCase()))
                .map((goal) => (
                  <button
                    key={goal.id}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
                    onClick={() => handleAddGoal(goal.id)}
                  >
                    <Target className="h-3.5 w-3.5 text-[#4573D2]" />
                    <span className="flex-1 text-left">{goal.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: STATUS_COLORS[goal.status] || "#6D6E6F" }}
                    >
                      {STATUS_LABELS[goal.status] || goal.status}
                    </span>
                  </button>
                ))}
              {!workspaceGoals && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Loading goals...
                </p>
              )}
              {workspaceGoals && (workspaceGoals || []).filter((g) => !connectedGoalIds.has(g.id)).length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-muted-foreground">No goals available to connect</p>
                  <Link href="/goals" className="mt-1 inline-block text-sm text-[#4573D2] hover:underline">
                    Create a goal first
                  </Link>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite Members Dialog ───────────────────────────────────────── */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Invite members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Invite by email..."
                  className="pl-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMemberByEmail();
                  }}
                />
              </div>
              <Button
                size="sm"
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={handleAddMemberByEmail}
                disabled={!memberEmail.trim()}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <Separator />

            {/* Access settings */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Access settings</p>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  {accessSetting === "workspace" ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {accessSetting === "workspace"
                      ? "Workspace visible"
                      : "Private"}
                  </span>
                </div>
                <Select
                  value={accessSetting}
                  onValueChange={(val) =>
                    setAccessSetting(val as "workspace" | "private")
                  }
                >
                  <SelectTrigger className="h-7 w-28 border-none bg-transparent text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workspace">Workspace</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Who has access */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Who has access</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-medium text-white">O</div>
                  <div className="flex-1 min-w-0"><p className="truncate text-sm text-foreground">You (Owner)</p></div>
                  <span className="text-xs text-muted-foreground">Owner</span>
                </div>
                {portfolioMembers?.map((pm) => (
                    <div key={pm.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-medium text-white">
                        {pm.user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0"><p className="truncate text-sm text-foreground">{pm.user.name}</p></div>
                      <span className="text-xs text-muted-foreground capitalize">{pm.permission.toLowerCase()}</span>
                    </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={() => setMembersOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Give Access Dialog ─────────────────────────────────────────── */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Give access to portfolio members?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Granting access lets current and future members of{" "}
              <span className="font-medium text-foreground">{portfolio.name}</span>{" "}
              access the selected project. You can change this later.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => confirmAddProject(false)}
              >
                Don&apos;t give access
              </Button>
              <Button
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
                onClick={() => confirmAddProject(true)}
              >
                Give access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Project Dialog ──────────────────────────────────────────── */}
      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add project to portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Search projects..."
              autoFocus
            />
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {availableProjects.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
                  onClick={() => addProject.mutate({ portfolioId, projectId: p.id })}
                >
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </button>
              ))}
              {availableProjects.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No projects available to add
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
