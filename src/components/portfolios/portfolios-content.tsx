"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  FolderOpen,
  Pencil,
  Trash2,
  Share2,
  Mail,
  Link2,
  FolderPlus,
  FileSymlink,
  Flag,
  CheckSquare,
  ListPlus,
  FileText,
  Maximize2,
  Target,
  Users,
  Globe,
  Copy,
  UserPlus,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ON_TRACK: "#7BC86C",
  AT_RISK: "#FD9A00",
  OFF_TRACK: "#E8384F",
  ON_HOLD: "#6D6E6F",
  COMPLETE: "#4573D2",
  DROPPED: "#B8B8B8",
};

const STATUS_LABELS: Record<string, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
  ON_HOLD: "On hold",
  COMPLETE: "Complete",
  DROPPED: "Dropped",
};

export function PortfoliosContent() {
  const { data: workspaces } = trpc.workspaces.list.useQuery();
  const workspaceId = workspaces?.[0]?.id;

  const { data: portfolios } = trpc.portfolios.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const { data: projects } = trpc.projects.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer" | "admin">("editor");
  const [sharePortfolioId, setSharePortfolioId] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [projectStatuses, setProjectStatuses] = useState<Record<string, string>>({});

  const togglePortfolio = (id: string) => {
    setExpandedPortfolios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createPortfolio = trpc.portfolios.create.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      setCreateOpen(false);
      setName("");
    },
  });

  const updatePortfolio = trpc.portfolios.update.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      setRenameOpen(false);
      setRenameId(null);
      setRenameName("");
      toast.success("Portfolio renamed");
    },
    onError: () => toast.error("Failed to rename portfolio"),
  });

  const deletePortfolio = trpc.portfolios.delete.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      toast.success("Portfolio deleted");
    },
    onError: () => toast.error("Failed to delete portfolio"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    createPortfolio.mutate({ name: name.trim(), workspaceId });
  };

  const handleShareInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    toast.success(`Invitation sent to ${shareEmail} as ${shareRole}`);
    setShareEmail("");
  };

  const sharePortfolioName = portfolios?.find((p) => p.id === sharePortfolioId)?.name ?? "Portfolio";

  return (
    <>
      <div className="h-full">
        <div className="flex h-14 items-center justify-between border-b bg-white px-6">
          <h1 className="text-lg font-medium text-[#1e1f21]">Portfolios</h1>
          <Button
            size="sm"
            className="gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New portfolio
          </Button>
        </div>

        {portfolios && portfolios.length > 0 ? (
          <div className="p-6">
            <div className="space-y-4">
              {portfolios.map((portfolio) => {
                const isExpanded = expandedPortfolios.has(portfolio.id);
                return (
                  <div
                    key={portfolio.id}
                    className="rounded-lg border bg-white shadow-sm"
                  >
                    <button
                      onClick={() => togglePortfolio(portfolio.id)}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4573D2]/10">
                        <Briefcase className="h-5 w-5 text-[#4573D2]" />
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/portfolios/${portfolio.id}`}
                          className="text-sm font-semibold text-[#1e1f21] hover:text-[#4573D2] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {portfolio.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {portfolio.projects.length} project
                          {portfolio.projects.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {/* Rename */}
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameId(portfolio.id);
                                setRenameName(portfolio.name);
                                setRenameOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Rename
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Invite with email */}
                            <DropdownMenuItem
                              onClick={() => {
                                setSharePortfolioId(portfolio.id);
                                setShareOpen(true);
                              }}
                            >
                              <Mail className="mr-2 h-3.5 w-3.5" />
                              Invite with email
                            </DropdownMenuItem>

                            {/* Copy portfolio link */}
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  window.location.origin + `/portfolios/${portfolio.id}`
                                );
                                toast.success("Portfolio link copied to clipboard");
                              }}
                            >
                              <Link2 className="mr-2 h-3.5 w-3.5" />
                              Copy portfolio link
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Add to portfolio */}
                            <DropdownMenuItem
                              onClick={() => toast.info("Add to portfolio coming soon")}
                            >
                              <FolderPlus className="mr-2 h-3.5 w-3.5" />
                              Add to portfolio
                            </DropdownMenuItem>

                            {/* Convert to project */}
                            <DropdownMenuItem
                              onClick={() => toast.info("Convert to project coming soon")}
                            >
                              <FileSymlink className="mr-2 h-3.5 w-3.5" />
                              Convert to project
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Mark as milestone */}
                            <DropdownMenuItem
                              onClick={() => toast.info("Marked as milestone")}
                            >
                              <Flag className="mr-2 h-3.5 w-3.5" />
                              Mark as milestone
                            </DropdownMenuItem>

                            {/* Create approval */}
                            <DropdownMenuItem
                              onClick={() => toast.info("Create approval coming soon")}
                            >
                              <CheckSquare className="mr-2 h-3.5 w-3.5" />
                              Create approval
                            </DropdownMenuItem>

                            {/* Add subtask */}
                            <DropdownMenuItem
                              onClick={() => toast.info("Add subtask coming soon")}
                            >
                              <ListPlus className="mr-2 h-3.5 w-3.5" />
                              Add subtask
                            </DropdownMenuItem>

                            {/* Use task template */}
                            <DropdownMenuItem
                              onClick={() => toast.info("Use task template coming soon")}
                            >
                              <FileText className="mr-2 h-3.5 w-3.5" />
                              Use task template
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Full screen view */}
                            <DropdownMenuItem
                              onClick={() => {
                                const elem = document.documentElement;
                                if (elem.requestFullscreen) {
                                  elem.requestFullscreen();
                                }
                              }}
                            >
                              <Maximize2 className="mr-2 h-3.5 w-3.5" />
                              Full screen view
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Delete */}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete portfolio "${portfolio.name}"?`)) {
                                  deletePortfolio.mutate({ id: portfolio.id });
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </button>

                    {isExpanded && (
                      <>
                        {/* Description */}
                        <div className="border-t px-5 py-4">
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Description
                          </label>
                          <Textarea
                            placeholder="Add a description for this portfolio..."
                            value={descriptions[portfolio.id] ?? ""}
                            onChange={(e) =>
                              setDescriptions((prev) => ({
                                ...prev,
                                [portfolio.id]: e.target.value,
                              }))
                            }
                            className="min-h-[60px] resize-none text-sm"
                          />
                        </div>

                        {/* Connected Goals */}
                        <div className="border-t px-5 py-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Connected goals
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs text-[#4573D2] hover:text-[#3A63B8]"
                              onClick={() => toast.info("Add goals coming soon")}
                            >
                              <Target className="h-3 w-3" />
                              Add goals
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            No goals connected yet. Link goals to track alignment.
                          </p>
                        </div>

                        {/* Members */}
                        <div className="border-t px-5 py-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Members
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs text-[#4573D2] hover:text-[#3A63B8]"
                              onClick={() => {
                                setSharePortfolioId(portfolio.id);
                                setShareOpen(true);
                              }}
                            >
                              <UserPlus className="h-3 w-3" />
                              Invite members
                            </Button>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4573D2] text-[10px] font-semibold text-white">
                              You
                            </div>
                            <span className="text-xs text-muted-foreground">Owner</span>
                          </div>
                        </div>

                        {/* Projects list */}
                        {portfolio.projects.length > 0 ? (
                          <div className="divide-y border-t">
                            {portfolio.projects.map(({ project }) => {
                              const latestStatus = project.statusUpdates?.[0];
                              const statusKey =
                                projectStatuses[project.id] ??
                                latestStatus?.status ??
                                "";
                              return (
                                <div
                                  key={project.id}
                                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                                >
                                  <Link
                                    href={`/projects/${project.id}`}
                                    className="flex flex-1 items-center gap-3"
                                  >
                                    <div
                                      className="h-3 w-3 rounded-sm"
                                      style={{ backgroundColor: project.color }}
                                    />
                                    <span className="flex-1 text-sm text-[#1e1f21]">
                                      {project.name}
                                    </span>
                                  </Link>

                                  {/* Status dropdown per project */}
                                  <select
                                    value={statusKey}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newStatus = e.target.value;
                                      setProjectStatuses((prev) => ({
                                        ...prev,
                                        [project.id]: newStatus,
                                      }));
                                      toast.success(
                                        `Status set to ${STATUS_LABELS[newStatus] ?? newStatus}`
                                      );
                                    }}
                                    className="h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-700 outline-none focus:border-[#4573D2] focus:ring-1 focus:ring-[#4573D2]"
                                    style={{
                                      color: statusKey ? STATUS_COLORS[statusKey] : undefined,
                                    }}
                                  >
                                    <option value="">No status</option>
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                      <option key={key} value={key}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>

                                  {statusKey && (
                                    <span
                                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                      style={{
                                        backgroundColor:
                                          STATUS_COLORS[statusKey] || "#6D6E6F",
                                      }}
                                    >
                                      {STATUS_LABELS[statusKey] || statusKey}
                                    </span>
                                  )}

                                  <span className="text-xs text-muted-foreground">
                                    {project._count.taskProjects} tasks
                                  </span>
                                  <Link href={`/projects/${project.id}`}>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </Link>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="border-t px-5 py-6 text-center text-sm text-muted-foreground">
                            No projects in this portfolio yet
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-[#1e1f21]">
              Manage your portfolios
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Group projects into portfolios to track overall progress and
              status at a glance.
            </p>
            <Button
              className="mt-4 gap-1.5 bg-[#4573D2] hover:bg-[#3A63B8]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create portfolio
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>New portfolio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio-name">Portfolio name</Label>
              <Input
                id="portfolio-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter portfolio name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createPortfolio.isPending}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {createPortfolio.isPending ? "Creating..." : "Create portfolio"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename portfolio</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameId && renameName.trim()) {
                updatePortfolio.mutate({ id: renameId, name: renameName.trim() });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="rename-portfolio">Portfolio name</Label>
              <Input
                id="rename-portfolio"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameName.trim() || updatePortfolio.isPending}
                className="bg-[#4573D2] hover:bg-[#3A63B8]"
              >
                {updatePortfolio.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[#4573D2]" />
                Share "{sharePortfolioName}"
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Invite with email */}
            <form onSubmit={handleShareInvite} className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Invite people
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={shareRole}
                  onChange={(e) =>
                    setShareRole(e.target.value as "editor" | "viewer" | "admin")
                  }
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#4573D2] focus:ring-1 focus:ring-[#4573D2]"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!shareEmail.trim()}
                  className="bg-[#4573D2] hover:bg-[#3A63B8]"
                >
                  Invite
                </Button>
              </div>
            </form>

            {/* Access settings */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Access settings
              </Label>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1e1f21]">
                      Anyone with the link
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Members of your workspace can find and access
                    </p>
                  </div>
                  <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-[#4573D2]">
                    <option value="view">Can view</option>
                    <option value="edit">Can edit</option>
                    <option value="none">No access</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Who has access */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Who has access
              </Label>
              <div className="rounded-lg border divide-y">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4573D2] text-xs font-semibold text-white">
                    You
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1e1f21]">You</p>
                    <p className="text-xs text-muted-foreground">Owner</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Owner</span>
                </div>
              </div>
            </div>

            {/* Copy link */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (sharePortfolioId) {
                    navigator.clipboard.writeText(
                      window.location.origin + `/portfolios/${sharePortfolioId}`
                    );
                    toast.success("Link copied to clipboard");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
