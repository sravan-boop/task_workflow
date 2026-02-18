"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Home,
  CheckSquare,
  Bell,
  BarChart3,
  Briefcase,
  Target,
  Plus,
  ChevronRight,
  Users,
  UserPlus,
  Clock,
  GitBranch,
  MoreHorizontal,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { CreatePortfolioDialog } from "@/components/portfolios/create-portfolio-dialog";
import { InviteDialog } from "@/components/workspace/invite-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, Trash2, Copy, FolderPlus } from "lucide-react";

const mainNav = [
  { label: "Home", href: "/home", icon: Home },
  { label: "My tasks", href: "/my-tasks", icon: CheckSquare },
  { label: "Inbox", href: "/inbox", icon: Bell },
];

const insightsNav = [
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  { label: "Portfolios", href: "/portfolios", icon: Briefcase },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Workflows", href: "/workflows", icon: GitBranch },
];

export function Sidebar() {
  const pathname = usePathname();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createPortfolioOpen, setCreatePortfolioOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [workExpanded, setWorkExpanded] = useState(true);
  const [portfoliosExpanded, setPortfoliosExpanded] = useState(true);
  const [sortOrder, setSortOrder] = useState<"recent" | "alphabetical" | "top">("recent");

  useEffect(() => {
    const handler = () => setCreateProjectOpen(true);
    document.addEventListener("create-project", handler);
    return () => document.removeEventListener("create-project", handler);
  }, []);

  const { data: recents } = trpc.recents.list.useQuery({ limit: 5 });
  const utils = trpc.useUtils();
  const removeRecent = trpc.recents.remove.useMutation({
    onSuccess: () => {
      utils.recents.list.invalidate();
      toast.success("Removed from recents");
    },
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: NonNullable<typeof recents>[number] } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: teams } = trpc.teams.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: portfolios } = trpc.portfolios.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  return (
    <>
      <aside className="flex h-full w-[240px] flex-col border-r bg-[#FFF8F0] dark:bg-card">
        {/* Create Button with dropdown */}
        <div className="px-3 pt-4 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="w-full justify-start gap-2 bg-[#1e1f21] text-white hover:bg-[#2e2f31]"
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => {
                toast.info("Use the task button in a project to create tasks");
              }}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateProjectOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreatePortfolioOpen(true)}>
                <Briefcase className="mr-2 h-4 w-4" />
                Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast.info("Messages feature coming soon");
              }}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                window.location.href = "/goals";
              }}>
                <Target className="mr-2 h-4 w-4" />
                Goal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-2">
          <ul className="space-y-0.5">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#f1ece4] text-[#1e1f21] dark:bg-muted dark:text-foreground"
                      : "text-[#6d6e6f] hover:bg-[#f1ece4]/60 hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Inbox" && unreadCount && unreadCount > 0 && (
                    <span className="flex h-2 w-2 rounded-full bg-red-500" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Recents Section */}
          {recents && recents.length > 0 && (
            <div className="mt-6">
              <h3 className="px-3 text-xs font-medium text-[#6d6e6f] dark:text-muted-foreground">
                Recents
              </h3>
              <ul className="mt-1 space-y-0.5">
                {recents.map((item) => {
                  const href =
                    item.resourceType === "project"
                      ? `/projects/${item.resourceId}`
                      : item.resourceType === "portfolio"
                        ? `/portfolios/${item.resourceId}`
                        : item.resourceType === "goal"
                          ? `/goals/${item.resourceId}`
                          : `/my-tasks?task=${item.resourceId}`;
                  return (
                    <li key={item.id}>
                      <Link
                        href={href}
                        className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-[#6d6e6f] hover:bg-[#f1ece4]/60 hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, item });
                        }}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span className="truncate">{item.resourceName}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Right-click Context Menu */}
              {contextMenu && (
                <div
                  className="fixed z-50 min-w-[160px] rounded-md border bg-white py-1 shadow-lg dark:bg-card"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[#1e1f21] hover:bg-muted/50 dark:text-foreground"
                    onClick={() => {
                      const href =
                        contextMenu.item.resourceType === "project"
                          ? `/projects/${contextMenu.item.resourceId}`
                          : contextMenu.item.resourceType === "portfolio"
                            ? `/portfolios/${contextMenu.item.resourceId}`
                            : contextMenu.item.resourceType === "goal"
                              ? `/goals/${contextMenu.item.resourceId}`
                              : `/my-tasks?task=${contextMenu.item.resourceId}`;
                      window.open(href, "_blank");
                      setContextMenu(null);
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in new tab
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[#1e1f21] hover:bg-muted/50 dark:text-foreground"
                    onClick={() => {
                      const href =
                        contextMenu.item.resourceType === "project"
                          ? `/projects/${contextMenu.item.resourceId}`
                          : contextMenu.item.resourceType === "portfolio"
                            ? `/portfolios/${contextMenu.item.resourceId}`
                            : contextMenu.item.resourceType === "goal"
                              ? `/goals/${contextMenu.item.resourceId}`
                              : `/my-tasks?task=${contextMenu.item.resourceId}`;
                      navigator.clipboard.writeText(window.location.origin + href);
                      toast.success("Link copied to clipboard");
                      setContextMenu(null);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy link
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-muted/50"
                    onClick={() => {
                      removeRecent.mutate({
                        resourceType: contextMenu.item.resourceType,
                        resourceId: contextMenu.item.resourceId,
                      });
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove from recents
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Insights Section */}
          <div className="mt-6">
            <h3 className="px-3 text-xs font-medium text-[#6d6e6f] dark:text-muted-foreground">
              Insights
            </h3>
            <ul className="mt-1 space-y-0.5">
              {insightsNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-[#f1ece4] text-[#1e1f21] dark:bg-muted dark:text-foreground"
                        : "text-[#6d6e6f] hover:bg-[#f1ece4]/60 hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Work Section */}
          <div className="mt-6">
            <div className="group flex w-full items-center justify-between px-3 text-xs font-medium text-[#6d6e6f] dark:text-muted-foreground">
              <button onClick={() => setWorkExpanded(!workExpanded)} className="flex items-center gap-1">
                Work
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", workExpanded && "rotate-90")} />
              </button>
              <span className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-3.5 w-3.5 cursor-pointer" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setCreateProjectOpen(true)}>
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      New project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCreatePortfolioOpen(true)}>
                      <FolderPlus className="mr-2 h-3.5 w-3.5" />
                      New portfolio
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOrder("alphabetical")}>
                      Alphabetical
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("recent")}>
                      Recent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("top")}>
                      Top
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
            {workExpanded && (
              <div className="mt-1">
                {/* Projects sub-section */}
                <button
                  onClick={() => setProjectsExpanded(!projectsExpanded)}
                  className="flex w-full items-center gap-1 px-5 py-1 text-[11px] font-medium text-[#6d6e6f] hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:text-foreground"
                >
                  <ChevronRight className={cn("h-3 w-3 transition-transform", projectsExpanded && "rotate-90")} />
                  Projects
                </button>
                {projectsExpanded && (
                  <ul className="space-y-0.5">
                    {(sortOrder === "alphabetical"
                      ? [...(projects || [])].sort((a, b) => a.name.localeCompare(b.name))
                      : projects
                    )?.map((project) => (
                      <li key={project.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-6 py-1.5 text-sm transition-colors",
                            pathname === `/projects/${project.id}`
                              ? "bg-[#f1ece4] text-[#1e1f21] dark:bg-muted dark:text-foreground"
                              : "text-[#6d6e6f] hover:bg-[#f1ece4]/60 hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                          )}
                        >
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: project.color }} />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      </li>
                    ))}
                    {(!projects || projects.length === 0) && (
                      <li className="px-6 py-1.5 text-xs text-muted-foreground">No projects yet</li>
                    )}
                  </ul>
                )}

                {/* Portfolios sub-section */}
                <button
                  onClick={() => setPortfoliosExpanded(!portfoliosExpanded)}
                  className="flex w-full items-center gap-1 px-5 py-1 text-[11px] font-medium text-[#6d6e6f] hover:text-[#1e1f21] mt-1"
                >
                  <ChevronRight className={cn("h-3 w-3 transition-transform", portfoliosExpanded && "rotate-90")} />
                  Portfolios
                </button>
                {portfoliosExpanded && (
                  <ul className="space-y-0.5">
                    {portfolios?.map((portfolio) => (
                      <li key={portfolio.id}>
                        <Link
                          href={`/portfolios/${portfolio.id}`}
                          className="flex items-center gap-3 rounded-md px-6 py-1.5 text-sm text-[#6d6e6f] hover:bg-[#f1ece4]/60 hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                        >
                          <Briefcase className="h-3 w-3" />
                          <span className="truncate">{portfolio.name}</span>
                        </Link>
                      </li>
                    ))}
                    {(!portfolios || portfolios.length === 0) && (
                      <li className="px-6 py-1.5 text-xs text-muted-foreground">No portfolios yet</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Teams Section */}
          <div className="mt-6">
            <button
              onClick={() => setTeamsExpanded(!teamsExpanded)}
              className="group flex w-full items-center justify-between px-3 text-xs font-medium text-[#6d6e6f] dark:text-muted-foreground"
            >
              Teams
              <span className="flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    teamsExpanded && "rotate-90"
                  )}
                />
              </span>
            </button>
            {teamsExpanded && (
              <ul className="mt-1 space-y-0.5">
                {teams?.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`/teams/${team.id}`}
                      className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-[#6d6e6f] hover:bg-[#f1ece4]/60 hover:text-[#1e1f21] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                    >
                      <Users className="h-4 w-4" />
                      <span className="truncate">{team.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-1 border-t px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm font-normal text-[#6d6e6f]"
            onClick={() => setInviteDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Invite teammates
          </Button>
        </div>
      </aside>

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        workspaceId={workspaceId}
      />

      <CreatePortfolioDialog
        open={createPortfolioOpen}
        onOpenChange={setCreatePortfolioOpen}
        workspaceId={workspaceId}
      />

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        workspaceId={workspaceId}
      />
    </>
  );
}
