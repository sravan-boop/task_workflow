"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Briefcase,
  ChevronRight,
  Plus,
  MoreHorizontal,
  FolderOpen,
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

  const createPortfolio = trpc.portfolios.create.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate();
      setCreateOpen(false);
      setName("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    createPortfolio.mutate({ name: name.trim(), workspaceId });
  };

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
              {portfolios.map((portfolio) => (
                <div
                  key={portfolio.id}
                  className="rounded-lg border bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b px-5 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4573D2]/10">
                      <Briefcase className="h-5 w-5 text-[#4573D2]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[#1e1f21]">
                        {portfolio.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {portfolio.projects.length} project
                        {portfolio.projects.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Portfolio settings coming soon");
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {portfolio.projects.length > 0 ? (
                    <div className="divide-y">
                      {portfolio.projects.map(({ project }) => {
                        const latestStatus = project.statusUpdates?.[0];
                        return (
                          <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                          >
                            <div
                              className="h-3 w-3 rounded-sm"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="flex-1 text-sm text-[#1e1f21]">
                              {project.name}
                            </span>
                            {latestStatus && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                style={{
                                  backgroundColor:
                                    STATUS_COLORS[latestStatus.status] ||
                                    "#6D6E6F",
                                }}
                              >
                                {STATUS_LABELS[latestStatus.status] ||
                                  latestStatus.status}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {project._count.taskProjects} tasks
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                      No projects in this portfolio yet
                    </div>
                  )}
                </div>
              ))}
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
    </>
  );
}
