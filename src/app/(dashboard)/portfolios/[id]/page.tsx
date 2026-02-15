"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
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
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ON_TRACK: "#7BC86C",
  AT_RISK: "#FD9A00",
  OFF_TRACK: "#E8384F",
  ON_HOLD: "#6D6E6F",
  COMPLETE: "#4573D2",
};

const STATUS_LABELS: Record<string, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
  ON_HOLD: "On hold",
  COMPLETE: "Complete",
};

type PortfolioTab = "list" | "timeline" | "dashboard" | "progress" | "workload" | "messages";

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
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<PortfolioTab>("list");
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

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

  const deletePortfolio = trpc.portfolios.delete.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      toast.success("Portfolio deleted");
      router.push("/portfolios");
    },
  });

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

  const availableProjects = allProjects?.filter(
    (p) => !existingProjectIds.has(p.id)
  ).filter(
    (p) => p.name.toLowerCase().includes(projectSearch.toLowerCase())
  ) || [];

  // Compute stats
  const totalTasks = portfolioProjects.reduce((sum: number, p: any) => sum + (p._count?.taskProjects || 0), 0);
  const atRiskCount = portfolioProjects.filter((p: any) => {
    const status = p.statusUpdates?.[0]?.status;
    return status === "AT_RISK";
  }).length;
  const offTrackCount = portfolioProjects.filter((p: any) => {
    const status = p.statusUpdates?.[0]?.status;
    return status === "OFF_TRACK";
  }).length;

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
      <div className="flex h-14 items-center gap-3 border-b bg-white px-6">
        <Link href="/portfolios" className="text-muted-foreground hover:text-[#1e1f21]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/portfolios" className="hover:text-[#1e1f21]">Portfolios</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-[#1e1f21] truncate max-w-[300px]">{portfolio.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Portfolio link copied");
              }}>
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
      <div className="flex items-center gap-1 border-b bg-white px-6 py-1">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-xs",
              activeTab === tab.key
                ? "bg-muted text-[#1e1f21]"
                : "text-muted-foreground"
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "list" && (
          <div>
            {portfolioProjects.length > 0 ? (
              <div className="rounded-lg border">
                {/* Table Header */}
                <div className="flex items-center gap-3 border-b bg-gray-50 px-5 py-2.5 text-xs font-medium text-[#6d6e6f]">
                  <div className="flex-1">Project name</div>
                  <div className="w-24 text-center">Status</div>
                  <div className="w-20 text-center">Tasks</div>
                  <div className="w-24 text-center">Due date</div>
                  <div className="w-8" />
                </div>
                {portfolioProjects.map((project: any) => {
                  const latestStatus = project.statusUpdates?.[0];
                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <Link href={`/projects/${project.id}`} className="flex flex-1 items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm font-medium text-[#1e1f21] hover:text-[#4573D2]">
                          {project.name}
                        </span>
                      </Link>
                      <div className="w-24 text-center">
                        {latestStatus && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                            style={{
                              backgroundColor:
                                STATUS_COLORS[latestStatus.status] || "#6D6E6F",
                            }}
                          >
                            {STATUS_LABELS[latestStatus.status] || latestStatus.status}
                          </span>
                        )}
                      </div>
                      <div className="w-20 text-center text-xs text-muted-foreground">
                        {project._count?.taskProjects || 0}
                      </div>
                      <div className="w-24 text-center text-xs text-muted-foreground">
                        {project.dueDate ? new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}
                      </div>
                      <div className="w-8">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeProject.mutate({ portfolioId, projectId: project.id })}
                          title="Remove from portfolio"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No projects in this portfolio yet</p>
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
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f]">Timeline</h3>
            {portfolioProjects.length > 0 ? (
              <div className="space-y-3">
                {portfolioProjects.map((project: any) => {
                  const start = project.startDate ? new Date(project.startDate) : null;
                  const end = project.dueDate ? new Date(project.dueDate) : null;
                  return (
                    <div key={project.id} className="flex items-center gap-3">
                      <div className="w-40 truncate text-sm text-[#1e1f21]">{project.name}</div>
                      <div className="flex-1">
                        <div className="relative h-6 rounded bg-gray-100">
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
                        {start ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No start"} - {end ? end.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No end"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add projects to see timeline</p>
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
                  <p className="text-2xl font-semibold text-[#1e1f21]">{portfolioProjects.length}</p>
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
                  <p className="text-2xl font-semibold text-[#1e1f21]">{totalTasks}</p>
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
                  <p className="text-2xl font-semibold text-[#1e1f21]">{atRiskCount + offTrackCount}</p>
                  <p className="text-xs text-muted-foreground">At risk / Off track</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f]">Project Progress</h3>
            <div className="space-y-4">
              {portfolioProjects.length > 0 ? portfolioProjects.map((project: any) => {
                const total = project._count?.taskProjects || 0;
                const latestStatus = project.statusUpdates?.[0];
                const statusColor = latestStatus ? STATUS_COLORS[latestStatus.status] || "#6D6E6F" : "#4573D2";
                return (
                  <div key={project.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Link href={`/projects/${project.id}`} className="text-sm font-medium text-[#1e1f21] hover:text-[#4573D2]">
                        {project.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{total} tasks</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(total > 0 ? 50 : 0, 100)}%`, backgroundColor: statusColor }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-muted-foreground">Add projects to see progress</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "workload" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f]">Team Workload</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Workload view shows team member capacity across portfolio projects</p>
              <p className="mt-1 text-xs text-muted-foreground">Assign tasks to team members to see workload distribution</p>
            </div>
          </div>
        )}

        {activeTab === "messages" && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-sm font-medium text-[#6d6e6f]">Messages</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Send messages to your portfolio team</p>
              <p className="mt-1 text-xs text-muted-foreground">Keep everyone aligned with portfolio-level discussions</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Project Dialog */}
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
            <div className="max-h-60 overflow-y-auto space-y-1">
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
